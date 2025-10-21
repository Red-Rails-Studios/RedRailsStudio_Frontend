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
    const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
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

        this.updatePlayersFromMap(m);
        this.updateLegend();

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
        this.updateLegend();

        this.stopPolling();
      }
    });
  }

  triggerReload(): void {
    this.showReloadButton = true;
    const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
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
    const sessionName = this.store.sessionName() || (this.store.sessionInfo && this.store.sessionInfo().sessionName) || null;
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
      this.updatePlayersFromMap(newMap);
      this.updateLegend();
      this.scheduleDraw();
    } catch {
      this.mapData = newMap;
      this.updatePlayersFromMap(newMap);
      this.updateLegend();
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
      this.mapImageContentBounds = null;
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
    } catch {
      this.mapImageContentBounds = null;
    }
  }

  // ----- helpers for players/colors -----
  private normalizeUid(u: any): string | null {
    if (u == null) return null;
    try { return String(u).trim().toLowerCase(); } catch { return null; }
  }

  private resolvePlayerColor(masterUid: any, mapPayload?: any): string | null {
    const key = this.normalizeUid(masterUid);
    if (!key) return null;

    const cached = this.playersByUid.get(key);
    if (cached && cached.color) return cached.color;

    const payload = mapPayload ?? this.mapData;
    const playersList = payload?.players ?? payload?.playerList ?? null;
    if (Array.isArray(playersList)) {
      const p = playersList.find((pp: any) => this.normalizeUid(pp?.uid ?? pp?.playerUid ?? pp?.playerId ?? pp?.id) === key);
      if (p && typeof p?.color === 'string' && p.color) return p.color;
    }

    try {
      const sessionInfo: any = this.store?.sessionInfo?.() ?? this.store?.sessionInfo ?? null;
      const sessionPlayers = sessionInfo?.players ?? sessionInfo?.playerList ?? null;
      if (Array.isArray(sessionPlayers)) {
        const sp = sessionPlayers.find((pp: any) => this.normalizeUid(pp?.uid ?? pp?.playerUid ?? pp?.playerId ?? pp?.id) === key);
        if (sp && typeof sp?.color === 'string' && sp.color) return sp.color;
      }
    } catch {}

    return null;
  }

  private updatePlayersFromMap(mapPayload: any): void {
    this.playersByUid.clear();
    if (!mapPayload) {
      const sessionInfo: any = this.store?.sessionInfo?.() ?? this.store?.sessionInfo ?? null;
      const sessionPlayers = sessionInfo?.players ?? sessionInfo?.playerList ?? null;
      if (Array.isArray(sessionPlayers)) {
        for (const p of sessionPlayers) {
          const uidRaw = p?.uid ?? p?.playerUid ?? p?.playerId ?? p?.id ?? null;
          const key = this.normalizeUid(uidRaw);
          if (!key) continue;
          const color = (typeof p?.color === 'string' && p.color) ? p.color : this.colorForFallback(key);
          const name = p?.displayName ?? p?.name ?? p?.playerName ?? key;
          this.playersByUid.set(key, { name: String(name), color });
        }
      }
      this.updateLegend();
      return;
    }

    const playersList = mapPayload.players ?? mapPayload.playerList ?? mapPayload.playersInfo ?? mapPayload.playersData ?? null;
    const sessionInfo: any = this.store?.sessionInfo?.() ?? this.store?.sessionInfo ?? null;
    const sessionPlayers = sessionInfo?.players ?? sessionInfo?.playerList ?? null;

    if (Array.isArray(playersList) && playersList.length) {
      for (const p of playersList) {
        const uidRaw = p?.uid ?? p?.playerUid ?? p?.playerId ?? p?.id ?? null;
        const key = this.normalizeUid(uidRaw);
        if (!key) continue;
        let color = (typeof p?.color === 'string' && p.color) ? p.color : undefined;
        if (!color && Array.isArray(sessionPlayers)) {
          const sp = sessionPlayers.find((s: any) => this.normalizeUid(s?.uid ?? s?.playerUid ?? s?.playerId ?? s?.id) === key);
          if (sp && typeof sp?.color === 'string' && sp.color) color = sp.color;
        }
        const name = p?.displayName ?? p?.name ?? p?.playerName ?? key;
        this.playersByUid.set(key, { name: String(name), color: color ?? this.colorForFallback(key) });
      }
    } else if (Array.isArray(sessionPlayers) && sessionPlayers.length) {
      for (const p of sessionPlayers) {
        const uidRaw = p?.uid ?? p?.playerUid ?? p?.playerId ?? p?.id ?? null;
        const key = this.normalizeUid(uidRaw);
        if (!key) continue;
        const color = (typeof p?.color === 'string' && p.color) ? p.color : this.colorForFallback(key);
        const name = p?.displayName ?? p?.name ?? p?.playerName ?? key;
        this.playersByUid.set(key, { name: String(name), color });
      }
    } else {
      const rows = mapPayload.map?.length || 0;
      const cols = mapPayload.map?.[0]?.length || 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = mapPayload.map[y][x];
          const stationObj = cell?.location?.station ?? cell?.location ?? cell;
          const masterUid = stationObj?.masterUid ?? stationObj?.ownerUid ?? stationObj?.playerUid ?? stationObj?.uId ?? null;
          const k = this.normalizeUid(masterUid);
          if (!k) continue;
          if (!this.playersByUid.has(k)) {
            let color = null;
            if (Array.isArray(sessionPlayers)) {
              const sp = sessionPlayers.find((s: any) => this.normalizeUid(s?.uid ?? s?.playerUid ?? s?.playerId ?? s?.id) === k);
              if (sp && typeof sp?.color === 'string' && sp.color) color = sp.color;
            }
            this.playersByUid.set(k, { name: k, color: color ?? this.colorForFallback(k) });
          }
        }
      }
    }

    this.updateLegend();
  }

  private updateLegend(): void {
    const entries: { uid: string; name: string; color: string }[] = [];
    for (const [uid, info] of this.playersByUid.entries()) entries.push({ uid, name: info.name, color: info.color });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    this.legendEntries = entries;
  }

  // deterministic fallback color for player uid
  private colorForFallback(key: string | number | null | undefined): string {
    if (key == null) return this.unownedColor;
    const s = String(key);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    const hue = Math.abs(h) % 360;
    return `hsl(${hue} 65% 45%)`;
  }

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
      try { ctx.drawImage(img, imgLeft, imgTop, drawW, drawH); } catch {}
    }

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

    const rows = map.map.length || 0;
    const cols = map.map[0]?.length || 0;
    const cellW = contentW / Math.max(1, cols);
    const cellH = contentH / Math.max(1, rows);

    for (let ry = 0; ry < rows; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const field = map.map[ry][rx];
        const rawType = field?.location?.type;
        const typeStr = rawType == null ? '' : String(rawType).toUpperCase();
        const stationObj: Station | any = field?.location?.station ?? field?.location ?? field;
        const isStation = typeStr.includes('STATION') || !!field?.location?.station || !!stationObj?.masterUid;

        if (!isStation) continue; // transparent

        const cx = contentLeft + rx * cellW + cellW / 2;
        const cy = contentTop + ry * cellH + cellH / 2;

        const masterUid = stationObj?.masterUid ?? stationObj?.ownerUid ?? stationObj?.playerUid ?? stationObj?.uId ?? null;
        const resolvedColor = this.resolvePlayerColor(masterUid, this.mapData);
        const fillColor = resolvedColor ?? this.unownedColor;

        ctx.beginPath();
        const radius = Math.max(4, Math.floor(Math.min(cellW, cellH) * 0.18));
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.stroke();
      }
    }
  }
}

