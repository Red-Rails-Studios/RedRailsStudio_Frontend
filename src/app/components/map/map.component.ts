/*
  DE: Map-Komponente (Canvas). Restored missing functions and removed signal usage,
  using plain properties so it only relies on existing project symbols.
*/
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Map as MapModel } from '../../models/map.model';
import { APISService } from '../../services/apis.service';
import { Store } from '../../services/store';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  // use plain property instead of Angular signals so we only use existing project things
  public mapData: MapModel | null = null;
  public loading = false;
  public errorMsg: string | null = null;
  public showReloadButton = true;

  @ViewChild('mapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private naturalWidth = 600;
  private naturalHeight = 400;
  private scale = 1;

  tileSize = 32;
  gap = 2;

  canvasWidth = 600;
  canvasHeight = 400;

  private pendingDraw = false;
  private mapImage: HTMLImageElement | null = null;
  private imageLoaded = false;
  private mapImageContentBounds: { left: number; top: number; width: number; height: number } | null = null;

  // mapping of playerUid -> { name, color }
  private playersByUid: Map<string, { name: string; color: string }> = new Map();

  // default color for unowned locations (grey)
  private readonly unownedColor = '#9e9e9e';

  // realtime / polling helpers
  private pollIntervalId: any = null;
  private eventSource: EventSource | null = null;
  private pollMs = 3000;
  private lastMapHash: string | null = null;
  private realtimeStarted = false;

  constructor(private apiService: APISService, private store: Store) {}

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
    this.loadMapImage();
    this.updateCanvasSize();
    if (this.pendingDraw) {
      this.pendingDraw = false;
      this.scheduleDraw();
    } else {
      this.drawMap();
    }
  }

  ngOnDestroy(): void {
    this.stopRealtime();
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
    } catch {}

    this.startPolling();
  }

  private stopEventSource(): void {
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
  }

  private startPolling(): void {
    if (this.pollIntervalId) return;
    this.pollIntervalId = setInterval(() => {
      const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
      if (!sessionName) return;
      this.apiService.getMap(sessionName).subscribe({
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
      // update players map then draw
      this.updatePlayersFromMap(newMap);
      this.scheduleDraw();
    } catch (e) {
      this.mapData = newMap;
      this.updatePlayersFromMap(newMap);
      this.scheduleDraw();
    }
  }

  private loadMapImage(): void {
    if (this.mapImage) return;
    const img = new Image();
    img.src = 'assets/Deutschland.svg';
    img.onload = () => {
      this.mapImage = img;
      this.imageLoaded = true;
      this.computeImageContentBounds(img);
      this.scheduleDraw();
    };
    img.onerror = () => {
      this.mapImage = null;
      this.imageLoaded = false;
      this.scheduleDraw();
    };
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
    } catch (e) {
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
        this.errorMsg = null;

        if (this.mapData?.map?.length) {
          const rows = this.mapData?.map.length || 0;
          const cols = this.mapData?.map[0]?.length || 0;
          this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
          this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        }

        this.setCanvasVisibility(true);
        this.updateCanvasSize();
        if (this.canvasRef?.nativeElement) this.scheduleDraw();
        else this.pendingDraw = true;

        // populate player mapping from payload
        this.updatePlayersFromMap(m);

        this.showReloadButton = false;
        this.startRealtime(sessionName);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        this.mapData = null;
        this.setCanvasVisibility(false);
        this.scheduleDraw();
        this.showReloadButton = true;
        this.playersByUid.clear();
      }
    });
  }

  // called when user clicks reload
  triggerReload(): void {
    this.showReloadButton = true;
    const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
    if (sessionName) this.loadMap(sessionName);
  }

  reloadMap() {
    this.triggerReload();
  }

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
    canvas.style.border = '2px solid #000';

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private scheduleDraw(): void {
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.drawMap());
    else setTimeout(() => this.drawMap(), 0);
  }

  // draw the map and dots (stations colored by owner, others grey)
  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    const mapVal = this.mapData;
    if (!canvas || !mapVal) {
      // if canvas exists but no data, clear it
      if (canvas) {
        const ctxEmpty = canvas.getContext('2d');
        if (ctxEmpty) ctxEmpty.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // clear the visible area (css pixels)
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    if (!mapVal.map || !mapVal.map.length) return;

    const rows = mapVal.map.length;
    const cols = mapVal.map[0]?.length || 0;

    // scaled tile sizes in CSS pixels
    const tilePx = (this.tileSize + this.gap) * this.scale;
    const tileSizeScaled = this.tileSize * this.scale;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = x * tilePx;
        const py = y * tilePx;

        const cx = px + tileSizeScaled / 2;
        const cy = py + tileSizeScaled / 2;
        const r = Math.max(2, Math.floor(tileSizeScaled * 0.25));

        const field = mapVal.map[y][x];

        // robust station detection and owner lookup
        const rawType = field?.location?.type;
        const typeStr = rawType == null ? '' : String(rawType).toUpperCase();
        const isStation = typeStr.includes('STATION') || !!field?.location?.station? || !!field?.location?.station?.uId?;

        // determine owner uid from common fields
        const ownerUid = field?.location?.station?.masterUID; 

        let fillColor = this.unownedColor;
        if (isStation && ownerUid != null) {
          const owner = this.playersByUid.get(String(ownerUid));
          fillColor = owner?.color ?? this.colorForFallback(String(ownerUid));
        } else if (isStation) {
          // station but no owner -> use distinct color (dark red fallback)
          fillColor = '#d62828';
        } else {
          // non-station tiles - neutral dark grey
          fillColor = '#2e2e2e';
        }

        ctx.beginPath();
        ctx.fillStyle = fillColor;
        const dotRadius = isStation ? Math.max(4, Math.floor(tileSizeScaled * 0.18)) : r;
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isStation) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#8b0000';
          ctx.stroke();
        }
      }
    }
  }

  // Build playersByUid map from incoming map payload (called on load and updates)
  private updatePlayersFromMap(mapPayload: any): void {
    this.playersByUid.clear();
    if (!mapPayload) {
      return;
    }

    // backend may provide players list under different keys; be resilient
    const playersList = mapPayload.players ?? mapPayload.playerList ?? mapPayload.playersInfo ?? mapPayload.playersData ?? null;
    if (Array.isArray(playersList) && playersList.length) {
      for (const p of playersList) {
        // common uid field names: uid, playerUid, id
        const uid = p?.uid ?? p?.playerUid ?? p?.playerId ?? p?.id ?? null;
        if (uid == null) continue;
        const key = String(uid);
        const color = (typeof p?.color === 'string' && p.color) ? p.color : undefined;
        const name = p?.displayName ?? p?.name ?? p?.playerName ?? key;
        // store only when color exists, otherwise will fallback to deterministic color
        this.playersByUid.set(key, { name: String(name), color: color ?? this.colorForFallback(key) });
      }
    } else {
      // If no explicit players list, try to infer from stations (best-effort)
      const rows = mapPayload.map?.length || 0;
      const cols = mapPayload.map?.[0]?.length || 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = mapPayload.map[y][x];
          const stationObj = cell?.location?.station ?? cell?.location ?? cell;
          const masterUid = stationObj?.masterUid ?? stationObj?.ownerUid ?? stationObj?.playerUid ?? null;
          if (!masterUid) continue;
          const k = String(masterUid);
          if (!this.playersByUid.has(k)) {
            // unknown owner - name set to uid, color set by fallback generator
            this.playersByUid.set(k, { name: k, color: this.colorForFallback(k) });
          }
        }
      }
    }
  }

  // deterministic fallback color for players without explicit color
  private colorForFallback(key: string | number | null | undefined): string {
    if (key == null) return this.unownedColor;
    const s = String(key);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h = h & h;
    }
    const hue = Math.abs(h) % 360;
    return `hsl(${hue} 65% 45%)`;
  }

  // re-added helper used elsewhere to hide/show the canvas safely
  private setCanvasVisibility(visible: boolean): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.style.display = visible ? 'block' : 'none';
  }
}

