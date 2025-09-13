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
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Map as GameMap } from '../../models/map.model';
import { APISService } from '../../services/apis.service';
import { Store } from '../../services/store';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  public mapData: GameMap | null = null;
  public loading = false;
  public errorMsg: string | null = null;
  private pollIntervalId: any = null;

  @ViewChild('mapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // logical map size (natural, before scaling)
  private naturalWidth = 600;
  private naturalHeight = 400;

  // scale applied to fit parent
  private scale = 1;

  // tile layout (logical pixels)
  tileSize = 32;
  gap = 2;

  // css size shown to user (in CSS pixels)
  canvasWidth = 600;
  canvasHeight = 400;

  // if map loads before view init, request a later redraw
  private pendingDraw = false;

  // image for Germany background
  private mapImage: HTMLImageElement | null = null;
  private imageLoaded = false;
  // bounding box of actual drawn content inside the image (image px coords)
  private mapImageContentBounds: { left: number; top: number; width: number; height: number } | null = null;

  constructor(private apiService: APISService, public store: Store) {}

  ngOnInit(): void {
    const sessionNameSignal = this.store.sessionName();
    const sessionOverviewName = this.store.sessionInfo().sessionName;
    const sessionName = sessionNameSignal || sessionOverviewName;

    if (!sessionName) {
      let attempts = 0;
      this.pollIntervalId = setInterval(() => {
        attempts++;
        const sName = this.store.sessionName() || this.store.sessionInfo().sessionName;
        if (sName) {
          clearInterval(this.pollIntervalId);
          this.pollIntervalId = null;
          this.loadMap(sName);
        } else if (attempts > 30) {
          clearInterval(this.pollIntervalId);
          this.pollIntervalId = null;
        }
      }, 1000);
      return;
    }

    this.loadMap(sessionName);
  }

  ngAfterViewInit(): void {
    // load background image for the map
    this.loadMapImage();

    // If map already loaded before view init, trigger sizing + draw now
    this.updateCanvasSize();
    if (this.pendingDraw) {
      this.pendingDraw = false;
      this.scheduleDraw();
    } else {
      this.drawMap();
    }
  }

  private loadMapImage(): void {
    if (this.mapImage) return;
    const img = new Image();
    img.src = 'assets/Deutschland-umriss.svg';
    img.onload = () => {
      this.mapImage = img;
      this.imageLoaded = true;
      // compute the content bounds on the rasterized image once
      this.computeImageContentBounds(img);
      this.scheduleDraw();
    };
    img.onerror = (e) => {
      console.warn('Failed to load map image', e);
      this.mapImage = null;
      this.imageLoaded = false;
    };
  }

  // Rasterize the loaded image and detect non-transparent pixel bbox.
  // Sampling is used to limit CPU for very large images.
  private computeImageContentBounds(img: HTMLImageElement): void {
    try {
      const iw = img.naturalWidth || img.width || 600;
      const ih = img.naturalHeight || img.height || 400;
      const tmp = document.createElement('canvas') as HTMLCanvasElement;
      tmp.width = iw;
      tmp.height = ih;
      const tctx = tmp.getContext('2d');
      if (!tctx) return;
      tctx.clearRect(0, 0, iw, ih);
      tctx.drawImage(img, 0, 0, iw, ih);

      // sample step: target ~800px max dimension for scanning
      const maxScan = 800;
      const step = Math.max(1, Math.floor(Math.max(iw, ih) / maxScan));

      const data = tctx.getImageData(0, 0, iw, ih).data;
      let minX = iw, minY = ih, maxX = 0, maxY = 0;
      for (let yy = 0; yy < ih; yy += step) {
        for (let xx = 0; xx < iw; xx += step) {
          const idx = (yy * iw + xx) * 4;
          const alpha = data[idx + 3];
          if (alpha > 10) { // treat >10 as drawn
            if (xx < minX) minX = xx;
            if (xx > maxX) maxX = xx;
            if (yy < minY) minY = yy;
            if (yy > maxY) maxY = yy;
          }
        }
      }

      if (minX <= maxX && minY <= maxY) {
        // expand bounds slightly to compensate for sampling
        const padX = Math.min(10, Math.floor((maxX - minX) * 0.03));
        const padY = Math.min(10, Math.floor((maxY - minY) * 0.03));
        minX = Math.max(0, minX - padX);
        minY = Math.max(0, minY - padY);
        maxX = Math.min(iw - 1, maxX + padX);
        maxY = Math.min(ih - 1, maxY + padY);
        this.mapImageContentBounds = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
      } else {
        this.mapImageContentBounds = null;
      }
    } catch (e) {
      console.warn('computeImageContentBounds failed', e);
      this.mapImageContentBounds = null;
    }
  }

  loadMap(sessionName: string) {
    this.loading = true;
    this.errorMsg = null;
    this.apiService.getMap(sessionName).subscribe({
      next: (m) => {
        this.mapData = m;
        this.loading = false;

        // compute natural size from data
        if (this.mapData?.map?.length) {
          const rows = this.mapData.map.length;
          const cols = this.mapData.map[0]?.length || 0;
          this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
          this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        }

        // update sizing and draw; if canvasRef isn't ready yet, defer draw
        this.updateCanvasSize();
        if (this.canvasRef?.nativeElement) {
          this.scheduleDraw();
        } else {
          this.pendingDraw = true;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
      }
    });
  }

reloadMap() {
    const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
    if (sessionName) {
      this.loadMap(sessionName);
    }
}

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateCanvasSize();
    this.scheduleDraw();
  }

  private updateCanvasSize(): void {
    const canvas = this.canvasRef?.nativeElement;
    // If canvas not available yet, we cannot size backing store; leave css size defaults
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Fit the natural map to the parent container while preserving aspect
    const parent = canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const sx = rect.width / this.naturalWidth;
    const sy = rect.height / this.naturalHeight;
    this.scale = Math.min(sx || 1, sy || 1, 1.5); // don't upscale too much

    // css size visible to user
    this.canvasWidth = Math.max(1, Math.floor(this.naturalWidth * this.scale));
    this.canvasHeight = Math.max(1, Math.floor(this.naturalHeight * this.scale));

    // backing store size in physical pixels (use css size * dpr)
    const backingW = Math.max(1, Math.floor(this.canvasWidth * dpr));
    const backingH = Math.max(1, Math.floor(this.canvasHeight * dpr));

    canvas.width = backingW;
    canvas.height = backingH;

    // set CSS size (what user sees)
    canvas.style.width = `${this.canvasWidth}px`;
    canvas.style.height = `${this.canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // scale drawing to device pixels; we will account for "scale" in drawing coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private scheduleDraw(): void {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.drawMap());
    } else {
      setTimeout(() => this.drawMap(), 0);
    }
  }

  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.mapData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clear using CSS pixel size (we draw using scaled coordinates)
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!this.mapData.map || !this.mapData.map.length) return;

    const rows = this.mapData.map.length;
    const cols = this.mapData.map[0]?.length || 0;

    // If we have a background image, draw it centered preserving aspect ratio
    let imgLeft = 0;
    let imgTop = 0;
    let drawW = this.canvasWidth;
    let drawH = this.canvasHeight;

    if (this.mapImage && this.imageLoaded) {
      const img = this.mapImage;
      // compute image draw size preserving aspect ratio
      const imgAspect = (img.width || 1) / (img.height || 1);
      const canvasAspect = this.canvasWidth / this.canvasHeight;
      if (imgAspect > canvasAspect) {
        drawW = this.canvasWidth;
        drawH = this.canvasWidth / imgAspect;
      } else {
        drawH = this.canvasHeight;
        drawW = this.canvasHeight * imgAspect;
      }
      imgLeft = Math.max(0, (this.canvasWidth - drawW) / 2);
      imgTop = Math.max(0, (this.canvasHeight - drawH) / 2);

      // draw the image as background
      ctx.drawImage(img, imgLeft, imgTop, drawW, drawH);
    } else {
      // fallback: fill a subtle background so map dots remain visible
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    // compute content rectangle inside the drawn image where actual map is painted
    let contentLeft = imgLeft;
    let contentTop = imgTop;
    let contentW = drawW;
    let contentH = drawH;
    if (this.mapImageContentBounds && this.mapImage) {
      const ib = this.mapImageContentBounds;
      const scaleX = drawW / (this.mapImage.naturalWidth || this.mapImage.width || drawW);
      const scaleY = drawH / (this.mapImage.naturalHeight || this.mapImage.height || drawH);
      contentLeft = imgLeft + ib.left * scaleX;
      contentTop = imgTop + ib.top * scaleY;
      contentW = Math.max(1, ib.width * scaleX);
      contentH = Math.max(1, ib.height * scaleY);
    }

    // compute cell size mapped into the content rectangle
    const cellW = contentW / Math.max(1, cols);
    const cellH = contentH / Math.max(1, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const field = this.mapData.map[y][x];

        // robust station detection
        const rawType = field?.location?.type;
        const typeStr = rawType == null ? '' : String(rawType).toUpperCase();
        const isStation = typeStr.includes('STATION') || !!field?.location?.station;

        // Make non-station dots transparent by not drawing them
        if (!isStation) {
          continue;
        }

        // map cell center into the content rect
        const cx = contentLeft + x * cellW + cellW / 2;
        const cy = contentTop + y * cellH + cellH / 2;

        // determine ownership and color stations accordingly
        const stationObj = field?.location?.station ?? field?.location ?? field;
        const bought = this.isStationBought(stationObj);

        ctx.beginPath();
        const markerRadius = Math.max(4, Math.floor(Math.min(cellW, cellH) * 0.18));
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = bought ? '#2ecc71' /* green */ : '#d62828' /* red */;
        ctx.fill();

        ctx.lineWidth = 1;
        ctx.strokeStyle = bought ? '#0b6623' /* darker green */ : '#8b0000' /* dark red */;
        ctx.stroke();
      }
    }
  }

  // helper: detect whether a station is owned/bought
  private isStationBought(station: any): boolean {
    if (!station) return false;

    // common field names checked in order
    if ('bought' in station) return !!station.bought;
    if ('purchased' in station) return !!station.purchased;
    if ('ownerId' in station) return station.ownerId !== null && station.ownerId !== undefined && station.ownerId !== 0;
    if ('playerId' in station) return station.playerId !== null && station.playerId !== undefined;
    if ('owner' in station && station.owner) {
      const o = station.owner;
      return !!(o.id || o.playerId || o.name);
    }

    return false;
  }

  // replace or update your station drawing routine to use isStationBought()
  private drawStations(ctx: CanvasRenderingContext2D, stations: any[]) {
    const radius = 6; // adjust to your existing radius variable if present
    stations.forEach(station => {
      const x = station.x ?? station.posX ?? station.cx; // fallback names if needed
      const y = station.y ?? station.posY ?? station.cy;

      const bought = this.isStationBought(station);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = bought ? '#2ecc71' : '#e74c3c'; // green if bought, red otherwise
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#222';
      ctx.stroke();
    });
  }
}
