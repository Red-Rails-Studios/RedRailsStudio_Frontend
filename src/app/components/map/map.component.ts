/*
  DE: Map-Komponente (Canvas). Updated to use player.masterUid and player.color.
*/
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, WritableSignal, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { Map as MapModel } from '../../models/map.model';
import type { Station } from '../../models/station.model';
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
  public mapData: WritableSignal<MapModel | null> = signal(null);
  public loading = false;
  public errorMsg: string | null = null;
  public legendEntries: { uid: string; name: string; color: string }[] = [];
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
      this.mapData.set(newMap);
      if (newMap?.map?.length) {
        const rows = newMap.map.length || 0;
        const cols = newMap.map[0]?.length || 0;
        this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
        this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        this.updateCanvasSize();
      }
      // update players map & legend then draw
      this.updatePlayersFromMap(newMap);
      this.scheduleDraw();
    } catch (e) {
      this.mapData.set(newMap);
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
        this.mapData.set(m);
        this.loading = false;
        this.errorMsg = null;

        if (this.mapData()?.map?.length) {
          const rows = this.mapData()?.map.length || 0;
          const cols = this.mapData()?.map[0]?.length || 0;
          this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
          this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        }

        this.setCanvasVisibility(true);
        this.updateCanvasSize();
        if (this.canvasRef?.nativeElement) this.scheduleDraw();
        else this.pendingDraw = true;

        // populate player mapping and legend from payload
        this.updatePlayersFromMap(m);
        this.updateLegend();

        this.showReloadButton = false;
        this.startRealtime(sessionName);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        this.mapData.set(null);
        this.setCanvasVisibility(false);
        this.scheduleDraw();
        this.showReloadButton = true;
        this.playersByUid.clear();
        this.legendEntries = [];
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

  private setCanvasVisibility(visible: boolean): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.style.display = visible ? 'block' : 'none';
  }

  // Build playersByUid map from incoming map payload (called on load and updates)
  private updatePlayersFromMap(mapPayload: any): void {
    this.playersByUid.clear();
    if (!mapPayload) {
      this.legendEntries = [];
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

    // rebuild legend entries to reflect current playersByUid
    this.updateLegend();
  }

  // deterministic fallback color for players without explicit color
  private colorForFallback(key: string | number | null | undefined): string {
    if (key == null) return this.unownedColor;
    const s = String(key);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    h = Math.abs(h);
    const hue = h % 360;
    return `hsl(${hue} 65% 45%)`;
  }

  private updateLegend(): void {
    const entries: { uid: string; name: string; color: string }[] = [];
    for (const [uid, info] of this.playersByUid.entries()) {
      entries.push({ uid, name: info.name, color: info.color });
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    this.legendEntries = entries;
  }

  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const map = this.mapData?.();
    if (this.errorMsg && (!map?.map || !map.map.length)) {
      this.setCanvasVisibility(false);
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      return;
    } else {
      this.setCanvasVisibility(true);
    }

    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    let imgLeft = 0;
    let imgTop = 0;
    let drawW = this.canvasWidth;
    let drawH = this.canvasHeight;

    if (this.mapImage && this.imageLoaded) {
      const img = this.mapImage;
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

      try {
        ctx.drawImage(this.mapImage as HTMLImageElement, imgLeft, imgTop, drawW, drawH);
      } catch {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
    } else {
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    if (!map?.map || !map.map.length) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const pad = 8;
      const msg = this.loading ? 'Loading map...' : (this.errorMsg || 'Map not loaded');
      ctx.font = '14px sans-serif';
      const textWidth = Math.min(300, ctx.measureText ? ctx.measureText(msg).width : 200);
      const boxW = textWidth + pad * 2;
      const boxH = 28;
      const bx = Math.max(10, Math.round((this.canvasWidth - boxW) / 2));
      const by = Math.max(10, Math.round((this.canvasHeight - boxH) / 2));
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.fillStyle = '#000';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, bx + pad, by + boxH / 2);
      ctx.restore();
      return;
    }

    // content rectangle where map image sits (used to position stations)
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

    ctx.save();
    const borderWidth = Math.max(2, Math.round(2 * this.scale));
    const bw = Math.min(borderWidth, Math.floor(Math.min(contentW, contentH) / 2));
    if (contentW > 0 && contentH > 0 && bw > 0) {
      const inset = bw / 2;
      const leftI = Math.round(contentLeft + inset);
      const topI = Math.round(contentTop + inset);
      const rightI = Math.round(contentLeft + contentW - inset);
      const bottomI = Math.round(contentTop + contentH - inset);
      ctx.beginPath();
      ctx.lineWidth = bw;
      ctx.strokeStyle = '#000';
      ctx.moveTo(leftI, topI);
      ctx.lineTo(rightI, topI);
      ctx.lineTo(rightI, bottomI);
      ctx.lineTo(leftI, bottomI);
      ctx.lineTo(leftI, topI);
      ctx.stroke();
    }
    ctx.restore();

    const rows = map.map.length || 0;
    const cols = map.map[0]?.length || 0;
    const cellW = contentW / Math.max(1, cols);
    const cellH = contentH / Math.max(1, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const field = map.map[y][x];
        const rawType = field?.location?.type;
        const typeStr = rawType == null ? '' : String(rawType).toUpperCase();
        const isStation = typeStr.includes('STATION') || !!field?.location?.station;

        if (!isStation) continue;

        const stationObj: Station | any = field?.location?.station ?? field?.location ?? field;
        // ownership is now signaled by station.masterUid (string) per your update
        const masterUid = stationObj?.masterUid ?? stationObj?.ownerUid ?? stationObj?.playerUid ?? null;
        const ownerInfo = masterUid ? this.playersByUid.get(String(masterUid)) : null;
        const fillColor = ownerInfo?.color ?? this.unownedColor;

        const cx = contentLeft + x * cellW + cellW / 2;
        const cy = contentTop + y * cellH + cellH / 2;
        ctx.beginPath();
        const markerRadius = Math.max(4, Math.floor(Math.min(cellW, cellH) * 0.18));
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.stroke();
      }
    }
  }
}

