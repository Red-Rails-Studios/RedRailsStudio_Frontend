/*
  DE: Map-Komponente (Canvas). Restored missing functions and removed signal usage,
  using plain properties so it only relies on existing project symbols.
  Updated: draw white background and draw black border around the rendered SVG map.
*/
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Map as MapModel } from '../../models/map.model';
import type { Station } from '../../models/station.model';
import { APISService } from '../../services/apis.service';
import { Store } from '../../services/store';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  public mapData: MapModel | null = null;
  public loading = false;
  public errorMsg: string | null = null;
  public legendEntries: { uid: string; name: string; color: string }[] = [];
  public showReloadButton = true;

  @ViewChild('mapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // logical map size
  private naturalWidth = 600;
  private naturalHeight = 400;

  // visual config
  tileSize = 32;
  gap = 2;
  private scale = 1;

  // CSS size visible to user
  canvasWidth = 600;
  canvasHeight = 400;

  // image background
  private mapImage: HTMLImageElement | null = null;
  private imageLoaded = false;
  private mapImageContentBounds: { left: number; top: number; width: number; height: number } | null = null;

  // players map: normalizedUid -> { name, color }
  private playersByUid: Map<string, { name: string; color: string }> = new Map();
  private ownerColorMap: Map<string, string> = new Map();

  // unowned station color (grey)
  private readonly unownedColor = '#b0b0b0';

  // realtime / polling
  private eventSource: EventSource | null = null;
  private pollIntervalId: any = null;
  private pollMs = 3000;
  private lastMapHash: string | null = null;
  private realtimeStarted = false;

  constructor(private apiService: APISService, public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.store.sessionName();
    if (!sessionName) {
      let attempts = 0;
      this.pollIntervalId = setInterval(() => {
        attempts++;
        const sName = this.store.sessionName();
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
    this.loadMapImage();
    this.updateCanvasSize();
    if (this.mapData) this.scheduleDraw();
    else this.drawMap();
  }

  ngOnDestroy(): void {
    this.stopRealtime();
  }

  // ----- loading / realtime / polling -----
  loadMap(sessionName: string) {
    this.loading = true;
    this.errorMsg = null;
    this.apiService.getMap(sessionName).subscribe({
      next: (m) => {
        this.mapData = m;
        this.loading = false;
        this.errorMsg = null;

        if (this.mapData?.map?.length) {
          const rows = this.mapData.map.length || 0;
          const cols = this.mapData.map[0]?.length || 0;
          this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
          this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        }

        this.setCanvasVisibility(true);
        this.updateCanvasSize();
        this.scheduleDraw();

        this.showReloadButton = false;

        this.startRealtime(sessionName);
        this.startPolling();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        this.mapData = null;
        this.setCanvasVisibility(false);
        this.scheduleDraw();

        this.showReloadButton = true;
        this.playersByUid.clear();

        this.stopPolling();
      }
    });
  }

  triggerReload(): void {
    this.showReloadButton = true;
    const sessionName = this.store.sessionName();
    if (sessionName) this.loadMap(sessionName);
  }

  reloadMap() {
    this.triggerReload();
  }

  private startRealtime(sessionName: string): void {
    if (this.realtimeStarted) return;
    this.realtimeStarted = true;

    try {
      const url = `/api/sessions/${encodeURIComponent(sessionName)}/map/stream`;
      this.eventSource = new EventSource(url);
      this.eventSource.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          this.applyMapIfChanged(data);
        } catch {}
      };
      this.eventSource.onerror = () => {
        this.stopEventSource();
        this.startPolling();
      };
      const sseTimeout = setTimeout(() => {
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.stopEventSource();
          this.startPolling();
        }
        clearTimeout(sseTimeout);
      }, 2500);
      return;
    } catch {
      // fallthrough to polling
    }

    this.startPolling();
  }

  private stopEventSource(): void {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
  }

  // start polling (periodic map refresh)
  private startPolling(): void {
    if (this.pollIntervalId) return;
    const sessionName = this.store.sessionName();
    if (!sessionName) return;
    this.pollIntervalId = setInterval(() => {
      this.apiService.getMap(sessionName!).subscribe({
        next: (m) => this.applyMapIfChanged(m),
        error: () => {}
      });
    }, this.pollMs);
  }

  private stopPolling(): void {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  private stopRealtime(): void {
    this.stopEventSource();
    this.stopPolling();
    this.realtimeStarted = false;
  }

  private applyMapIfChanged(newMap: any): void {
    try {
      const json = JSON.stringify(newMap || {});
      if (json === this.lastMapHash) return;
      this.lastMapHash = json;
      this.mapData = newMap;
      if (newMap?.map?.length) {
        const rows = newMap.map.length || 0;
        const cols = newMap.map[0]?.length || 0;
        this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
        this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        this.updateCanvasSize();
      }
      this.scheduleDraw();
    } catch {
      this.scheduleDraw();
    }
  }

  // ----- canvas sizing / image loading -----
  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateCanvasSize();
    this.scheduleDraw();
  }

  private updateCanvasSize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement!;
    const rect = parent.getBoundingClientRect();
    const sx = rect.width / this.naturalWidth;
    const sy = rect.height / this.naturalHeight;
    this.scale = Math.min(sx || 1, sy || 1, 1.5);

    this.canvasWidth = Math.max(1, Math.floor(this.naturalWidth * this.scale));
    this.canvasHeight = Math.max(1, Math.floor(this.naturalHeight * this.scale));

    const backingW = Math.max(1, Math.floor(this.canvasWidth * dpr));
    const backingH = Math.max(1, Math.floor(this.canvasHeight * dpr));

    canvas.width = backingW;
    canvas.height = backingH;
    canvas.style.width = `${this.canvasWidth}px`;
    canvas.style.height = `${this.canvasHeight}px`;
    canvas.style.backgroundColor = '#ffffff';

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private scheduleDraw(): void {
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.drawMap());
    else setTimeout(() => this.drawMap(), 0);
  }

  private loadMapImage(): void {
    if (this.mapImage) return;
    const img = new Image();
    // allow drawing + reading pixels if server CORS erlaubt
    img.crossOrigin = 'anonymous';
    const src = '/assets/Deutschland.svg'; // use absolute assets path

    img.onload = () => {
      this.mapImage = img;
      this.imageLoaded = true;
      this.computeImageContentBounds(img);
      this.scheduleDraw();
    };
    img.onerror = (ev) => {
      console.error('Map image load failed:', src, ev);
      this.mapImage = null;
      this.imageLoaded = false;
      this.mapImageContentBounds = null;
      this.scheduleDraw();
    };

    img.src = src;
  }

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

      const maxScan = 800;
      const step = Math.max(1, Math.floor(Math.max(iw, ih) / maxScan));
      const data = tctx.getImageData(0, 0, iw, ih).data;
      let minX = iw, minY = ih, maxX = 0, maxY = 0;
      for (let yy = 0; yy < ih; yy += step) {
        for (let xx = 0; xx < iw; xx += step) {
          const idx = (yy * iw + xx) * 4;
          const alpha = data[idx + 3];
          if (alpha > 10) {
            if (xx < minX) minX = xx;
            if (xx > maxX) maxX = xx;
            if (yy < minY) minY = yy;
            if (yy > maxY) maxY = yy;
          }
        }
      }

      if (minX <= maxX && minY <= maxY) {
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
    } catch {
      this.mapImageContentBounds = null;
    }
  }

  // deterministic fallback color for player uid

  // helper: safely show/hide canvas element used in this component
  private setCanvasVisibility(visible: boolean): void {
    try {
      const canvas = this.canvasRef?.nativeElement;
      if (!canvas) return;
      canvas.style.display = visible ? 'block' : 'none';
    } catch {}
  }

  // ----- rendering -----
  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clear and white background
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // draw background image (Deutschland.svg) centered, keep aspect
    let imgLeft = 0;
    let imgTop = 0;
    let drawW = this.canvasWidth;
    let drawH = this.canvasHeight;

    // if (this.mapImage && this.imageLoaded) { 
      const img = this.mapImage;
      const imgAspect = (img?.width || 1) / (img?.height || 1);
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
      if(img){
        try { ctx.drawImage(img, imgLeft, imgTop, drawW, drawH); } catch {}
      }
    // }

    // black border around the svg area
    const borderWidth = Math.max(2, Math.round(2 * this.scale));
    const inset = borderWidth / 2;
    ctx.save();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(imgLeft + inset, imgTop + inset, Math.max(0, drawW - inset * 2), Math.max(0, drawH - inset * 2));
    ctx.restore();

    const map = this.mapData;
    if (!map?.map || !map.map.length) return;

    // compute content box for stations
    let contentLeft = imgLeft;
    let contentTop = imgTop;
    let contentWidth = drawW;
    let contentHeight = drawH;
    if (this.mapImageContentBounds /*&& this.mapImage*/) {
      const b = this.mapImageContentBounds;
      const img = this.mapImage;
      const imgNaturalW = img?.naturalWidth;
      const imgNaturalH = img?.naturalHeight;

      if(imgNaturalW && imgNaturalH){
        const scaleX = drawW / imgNaturalW;
        const scaleY = drawH / imgNaturalH;
        contentLeft = imgLeft + (b.left * scaleX);
        contentTop = imgTop + (b.top * scaleY);
        contentWidth = Math.max(0, b.width * scaleX);
        contentHeight = Math.max(0, b.height * scaleY);
      }
    }

    // draw stations
    const rows = map.map.length;
    const cols = map.map[0]?.length || 0;
    const cellWidth = contentWidth / Math.max(1, cols);
    const cellHeight = contentHeight / Math.max(1, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const centerX = contentLeft + x * cellWidth + cellWidth / 2;
        const centerY = contentTop + y * cellHeight + cellHeight / 2;
        const cell = map.map[y][x];

        const location = cell.location;
        if(location === null) continue;

        const station = location.station;
        if(station === null) continue;
        
        const masterUid = station.masterUid;
        if(!masterUid) {
          ctx.beginPath();
          const radius = Math.max(4, Math.floor(Math.min(cellWidth, cellHeight) * 0.18));
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#6b6b6bff";
          ctx.fill();
        };

        const player = this.store.sessionInfo().players.find((player : Player) => player.uId === masterUid);
        if(!player) continue;

        const playerColor = player.color; 
        if(!playerColor) continue;

        ctx.beginPath();
        const radius = Math.max(4, Math.floor(Math.min(cellWidth, cellHeight) * 0.18));
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = playerColor;
        ctx.fill();
      }
    }
  }
}