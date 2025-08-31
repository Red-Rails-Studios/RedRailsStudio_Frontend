/*
  DE: Umstellung der Map-Komponente von einer CSS-Grid-Darstellung auf ein HTML-Canvas.

  Was hat sich geändert?
  - Template: Statt eines <div class="grid"> mit zahlreichen .cell-Divs wird jetzt ein einzelnes <canvas #mapCanvas> verwendet.
  - Styles: Grid-/Cell-bezogene CSS-Regeln werden nicht mehr benötigt; das visuelle Rendering (Farben, Rahmen, Marker, Labels) passiert vollständig im Canvas.
  - Logik: Nach dem Laden der Map-Daten (mapData) werden die Canvas-Abmessungen berechnet (updateCanvasSize) und die Karte einmal gezeichnet (scheduleDraw/drawMap).

  Wie funktioniert das Rendering?
  - Jede Karte besteht weiterhin aus Zeilen/Spalten. Für jede Zelle (Tile) wird im Canvas ein Rechteck gezeichnet.
  - tileSize (24px) entspricht der früheren .cell-Größe; gap (2px) entspricht der früheren Grid-Lücke.
  - Die Position einer Zelle im Canvas ergibt sich aus: x * (tileSize + gap) bzw. y * (tileSize + gap).
  - Farben/Umrandungen hängen vom Location-Typ ab (z.B. STATION, RAIL, EMPTY).
  - Für Stationen wird zusätzlich ein kleiner roter Marker sowie optional ein Name (Text) gezeichnet.
*/
import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Map as GameMap } from '../../models/map.model';
import { APISService } from '../../services/apis.service';
import { Store } from '../../services/store';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, AfterViewInit {
  public mapData: GameMap | null = null;
  public loading = false;
  public errorMsg: string | null = null;
  private pollIntervalId: any = null;

  // DE: Referenz auf das Canvas-Element im Template. Darüber erhalten wir den 2D-Zeichenkontext.
  @ViewChild('mapCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  // DE: Kachelgröße (ehemals .cell Breite/Höhe). Bestimmt die gezeichnete Größe jedes Feldes.
  tileSize = 24;
  // DE: Lücke zwischen Kacheln (entsprach früher dem Grid-Gap). Wird in die Positionsberechnung einbezogen.
  gap = 2;
  // DE: Effektive Canvas-Breite/-Höhe in Pixeln. Wird aus Zeilen/Spalten dynamisch berechnet.
  canvasWidth = 0;
  canvasHeight = 0;

  constructor(private apiService: APISService, public store: Store) {}

  ngOnInit(): void {
    // DE: Initialisierung wie zuvor. Wir warten ggf. per Polling auf die Session, laden dann die Map-Daten.
    const sessionNameSignal = this.store.sessionName();
    const sessionOverviewName = this.store.sessionInfo().sessionName;
    const sessionName = sessionNameSignal || sessionOverviewName;

    console.log('🗺️ MapComponent init. sessionName signal:', sessionNameSignal, 'sessionInfo:', sessionOverviewName);

    if (!sessionName) {
      console.warn('MapComponent: no sessionName available yet, starting poll to wait for sessionName...');
      let attempts = 0;
      this.pollIntervalId = setInterval(() => {
        attempts++;
        const sName = this.store.sessionName() || this.store.sessionInfo().sessionName;
        if (sName) {
          clearInterval(this.pollIntervalId);
          this.pollIntervalId = null;
          this.loadMap(sName);
        } else if (attempts > 30) { // ~30 seconds
          clearInterval(this.pollIntervalId);
          this.pollIntervalId = null;
          console.warn('MapComponent: sessionName did not appear within timeout');
        }
      }, 1000);
      return;
    }

    
    this.loadMap(sessionName);
  }

  loadMap(sessionName: string) {
    this.loading = true;
    this.errorMsg = null;
    console.log('MapComponent: loading map for session:', sessionName);
    this.apiService.getMap(sessionName).subscribe({
      next: (m) => {
        this.mapData = m;
        this.loading = false;
        // DE: Nach dem Laden die Canvas-Abmessungen anhand der Karten-Daten bestimmen
        this.updateCanvasSize();
        // DE: Danach die Karte auf das Canvas zeichnen (asynchron, nach Render-Zyklus)
        this.scheduleDraw();
        console.log('Map loaded:', m);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        console.error('Failed to load map', err);
      }
    });
  }

  
  reloadMap() {
    const sName = this.store.sessionName() || this.store.sessionInfo().sessionName;
    if (!sName) {
      this.errorMsg = 'No session name available to load map.';
      console.warn('reloadMap: no session name');
      return;
    }
    console.log('Manual reloadMap triggered for session:', sName);
    this.loadMap(sName);
  }

  /**
   * DE: Nach dem Initialisieren des View (Canvas existiert im DOM) einmal zeichnen,
   * falls mapData bereits vorhanden ist. Andernfalls wird nach dem Laden gezeichnet.
   */
  ngAfterViewInit(): void {
    // DE: Zeichnen einplanen; drawMap greift über canvasRef auf das Canvas zu.
    this.scheduleDraw();
  }

  /**
   * DE: Berechnet die effektive Canvas-Größe auf Basis der Karten-Dimensionen.
   * Formel: Breite = cols * tileSize + (cols - 1) * gap (analog für Höhe mit rows)
   */
  private updateCanvasSize(): void {
    const rows = this.mapData?.map?.length || 0;
    const cols = rows > 0 ? (this.mapData!.map[0]?.length || 0) : 0;
    if (rows <= 0 || cols <= 0) {
      this.canvasWidth = 0;
      this.canvasHeight = 0;
      return;
    }
    this.canvasWidth = cols * this.tileSize + (cols - 1) * this.gap;   // DE: Kachelbreiten + Lücken
    this.canvasHeight = rows * this.tileSize + (rows - 1) * this.gap; // DE: Kachelhöhen + Lücken
  }

  /**
   * DE: Zeichnen in den nächsten Tick verschieben, damit Angular DOM/Template aktualisiert hat
   * und das Canvas-Element inklusive Abmessungen garantiert bereitsteht.
   */
  private scheduleDraw(): void {
    setTimeout(() => this.drawMap(), 0);
  }

  /**
   * DE: Zeichnet die gesamte Karte auf das Canvas.
   * Ablauf:
   * 1) 2D-Kontext holen und Canvas leeren
   * 2) Über alle Zeilen/Spalten iterieren
   * 3) Für jede Zelle Position (px, py) aus (tileSize + gap) berechnen
   * 4) Füll-/Linienfarbe abhängig vom Location-Typ setzen
   * 5) Kachel zeichnen (fillRect + strokeRect)
   * 6) Optionalen Marker und Namen für Stationen rendern
   */
  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.mapData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DE: Canvas vollständig leeren, damit der neue Frame ohne Artefakte gezeichnet wird.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // DE: Dimensionen der Karte bestimmen
    const rows = this.mapData.map.length;
    const cols = this.mapData.map[0]?.length || 0;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const field = this.mapData.map[y][x];
        const locType = field?.location?.type || 'EMPTY';

        // DE: Pixel-Position der Zelle: Index * (Kachelgröße + Lücke)
        const px = x * (this.tileSize + this.gap);
        const py = y * (this.tileSize + this.gap);

        if (locType === 'STATION') {
          ctx.fillStyle = '#ffe7e7';
          ctx.strokeStyle = '#f5b5b5';
        } else if (locType === 'RAIL') {
          ctx.fillStyle = '#e7f1ff';
          ctx.strokeStyle = '#b5ccf5';
        } else {
          ctx.fillStyle = '#fafafa';
          ctx.strokeStyle = '#d0d0d0';
        }
        ctx.lineWidth = 1;

        // DE: Kachel zeichnen (Füllung + 1px-Rahmen)
        ctx.fillRect(px, py, this.tileSize, this.tileSize);
        ctx.strokeRect(px + 0.5, py + 0.5, this.tileSize - 1, this.tileSize - 1);

        if (locType === 'STATION') {
          // DE: Station-Markierung (kleines rotes Quadrat) mittig in der Kachel
          const markerSize = 8;
          const mx = px + (this.tileSize - markerSize) / 2;
          const my = py + (this.tileSize - markerSize) / 2;
          ctx.fillStyle = '#f01414';
          ctx.strokeStyle = '#c01010';
          ctx.fillRect(mx, my, markerSize, markerSize);
          ctx.strokeRect(mx + 0.5, my + 0.5, markerSize - 1, markerSize - 1);

          const name = field?.location?.name;
          if (name) {
            // DE: Optionaler Name unterhalb des Markers, zentriert in der Kachel
            ctx.fillStyle = '#222';
            ctx.font = '8px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(name, px + this.tileSize / 2, py + this.tileSize - 2);
          }
        }
      }
    }
  }
}
