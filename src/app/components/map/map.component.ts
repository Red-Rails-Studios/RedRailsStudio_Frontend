/*
  DE: Umstellung der Map-Komponente von einer CSS-Grid-Darstellung auf ein HTML-Canvas.
*/
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, WritableSignal, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// alias the exported map model to avoid colliding with the builtin Map type
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
  // use the aliased MapModel from your frontend models
  public mapData: WritableSignal<MapModel | null> = signal(null);
  public loading = false;
  public errorMsg: string | null = null;
  // legend entries exposed to template
  public legendEntries: { key: string; name: string; color: string }[] = [];

  // controls visibility: reload button shows until a successful load completes
  public showReloadButton = true;

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

  // cache / config for owner colors
  // keep keys as strings consistently
  private ownerColorMap: Map<string, string> = new Map<string, string>([
    // optional known presets
    // ['1', '#1f77b4'],
  ]);

  // default color for unbought or unknown owner
  private readonly unownedColor = '#d62828'; // red

  // realtime / polling helpers (declared so methods using them compile)
  private pollIntervalId: any = null;
  private eventSource: EventSource | null = null;
  private pollMs = 3000;
  private lastMapHash: string | null = null;
  private realtimeStarted = false;

  constructor(private apiService: APISService, private store: Store) {}

  // deterministic color generator for unknown owners (returns css color)
  private colorForKey(key: string | number | null | undefined): string {
    if (key == null) return this.unownedColor;
    const k = String(key);
    const existing = this.ownerColorMap.get(k);
    if (existing) return existing;

    // simple deterministic hash -> hue
    let h = 0;
    for (let i = 0; i < k.length; i++) h = (h << 5) - h + k.charCodeAt(i);
    h = Math.abs(h);
    const hue = h % 360;
    const color = `hsl(${hue} 72% 45%)`;
    this.ownerColorMap.set(k, color);
    return color;
  }

  // resolve an owner key from station object (adjust to your model)
  private ownerKeyFromStation(station: Station | any): string | number | null {
    if (!station) return null;
    // prefer explicit ownerId / playerId fields
    if ('ownerId' in station && station.ownerId != null) return station.ownerId;
    if ('playerId' in station && station.playerId != null) return station.playerId;
    // older code used boughtBy / purchasedBy
    if ('boughtBy' in station && station.boughtBy != null) return station.boughtBy;
    if ('purchasedBy' in station && station.purchasedBy != null) return station.purchasedBy;
    // nested owner object
    if ('owner' in station && station.owner) {
      const o = station.owner;
      if (typeof o === 'object') {
        if ('id' in o && o.id != null) return o.id;
        if ('playerId' in o && o.playerId != null) return o.playerId;
        if ('name' in o && o.name) return o.name;
      }
      // owner might be a scalar (string)
      if (typeof o === 'string') return o;
    }
    return null;
  }

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

  ngOnDestroy(): void {
    this.stopRealtime();
  }

  // start SSE, fallback to polling if SSE fails or not available
  private startRealtime(sessionName: string): void {
    if (this.realtimeStarted) return;
    this.realtimeStarted = true;

    // try SSE first (change endpoint to your backend path if different)
    try {
      const url = `/api/sessions/${encodeURIComponent(sessionName)}/map/stream`;
      this.eventSource = new EventSource(url);
      this.eventSource.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          this.applyMapIfChanged(data);
        } catch (e) {
          // ignore parse errors
        }
      };
      this.eventSource.onerror = (_err) => {
        // SSE failed: close and fall back to polling
        this.stopEventSource();
        this.startPolling();
      };
      // if connection doesn't open within a short time, start polling as fallback
      const sseTimeout = setTimeout(() => {
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
          this.stopEventSource();
          this.startPolling();
        }
        clearTimeout(sseTimeout);
      }, 2500);
      return;
    } catch (e) {
      // fall through to polling
    }

    // SSE not available — start polling
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
      // use apiService.getMap to fetch latest map
      this.apiService.getMap(sessionName).subscribe({
        next: (m) => this.applyMapIfChanged(m),
        error: () => { /* ignore transient errors */ }
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

  // update map only when changed (cheap JSON-hash)
  private applyMapIfChanged(newMap: any): void {
    try {
      const json = JSON.stringify(newMap || {});
      if (json === this.lastMapHash) {
        return; // no change
      }
      this.lastMapHash = json;
      this.mapData.set(newMap);
      // recompute natural size if necessary (same logic as loadMap)
      if (newMap?.map?.length) {
        const rows = newMap.map.length || 0;
        const cols = newMap.map[0]?.length || 0;
        this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
        this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        this.updateCanvasSize();
      }
      this.scheduleDraw();
      // update legend from new map
      this.updateLegend();
    } catch (e) {
      // on any error, still set and draw
      this.mapData.set(newMap);
      this.scheduleDraw();
      this.updateLegend();
    }
  }

  private loadMapImage(): void {
    if (this.mapImage) return;
    const img = new Image();
    img.src = 'assets/Deutschland.svg';
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
      // still schedule draw to display fallback or hide when error exists
      this.scheduleDraw();
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
      // getImageData can throw if the image taints the canvas (CORS / SVG with external resources).
      // We tolerate that and simply skip content bounds detection.
      console.warn('computeImageContentBounds failed', e);
      this.mapImageContentBounds = null;
    }
  }

  loadMap(sessionName: string) {
    this.loading = true;
    this.errorMsg = null;
    // showReloadButton remains as-is except when explicitly set by reload action;
    // when the request completes successfully we hide it below.
    this.apiService.getMap(sessionName).subscribe({
      next: (m) => {
        this.mapData.set(m);
        this.loading = false;
        this.errorMsg = null;

        // compute natural size from data
        if (this.mapData()?.map?.length) {
          const rows = this.mapData()?.map.length || 0;
          const cols = this.mapData()?.map[0]?.length || 0;
          this.naturalWidth = Math.max(1, cols * (this.tileSize + this.gap));
          this.naturalHeight = Math.max(1, rows * (this.tileSize + this.gap));
        }

        // ensure canvas visible on successful load
        this.setCanvasVisibility(true);

        // update sizing and draw; if canvasRef isn't ready yet, defer draw
        this.updateCanvasSize();
        if (this.canvasRef?.nativeElement) {
          this.scheduleDraw();
        } else {
          this.pendingDraw = true;
        }

        // update legend now that map is loaded
        this.updateLegend();

        // hide reload button after successful load
        this.showReloadButton = false;

        // start realtime updates for this session (SSE with polling fallback)
        this.startRealtime(sessionName);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        // clear map data and hide canvas
        this.mapData.set(null);
        this.setCanvasVisibility(false);
        this.scheduleDraw();
        // show reload button so the user can retry
        this.showReloadButton = true;
      }
    });
  }

  // called by the UI when the user clicks reload
  triggerReload(): void {
    this.showReloadButton = true;
    const sessionName = this.store.sessionName() || this.store.sessionInfo().sessionName;
    if (sessionName) {
      this.loadMap(sessionName);
    }
  }

  // kept for compatibility if other code calls reloadMap directly
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

    // ensure a visible CSS fallback border
    canvas.style.border = '2px solid #000';

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

  private setCanvasVisibility(visible: boolean): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    canvas.style.display = visible ? 'block' : 'none';
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

  // build legend entries from current map data (prefer players metadata if present)
  private updateLegend(): void {
    const map = this.mapData?.();
    if (!map) {
      this.legendEntries = [];
      return;
    }

    // first try canonical players list if backend provides it in the map payload
    // try a few common property names to be resilient
    const playersList = (map as any).players ?? (map as any).playerList ?? (map as any).playersInfo ?? null;

    const entries: { key: string; name: string; color: string }[] = [];

    if (Array.isArray(playersList) && playersList.length) {
      for (const p of playersList) {
        const id = p?.id ?? p?.playerId ?? p?.name ?? p?.userId ?? null;
        if (id == null) continue;
        const key = String(id);
        // use player provided color if available, else deterministic
        const color = (p?.color && String(p.color)) || this.colorForKey(key);
        const name = p?.displayName ?? p?.name ?? p?.playerName ?? String(id);
        // cache color to ensure drawMap uses same color
        this.ownerColorMap.set(key, color);
        entries.push({ key, name, color });
      }
      // sort stable by name
      entries.sort((a, b) => a.name.localeCompare(b.name));
      this.legendEntries = entries;
      return;
    }

    // fallback: scan stations for owners and build legend
    const owners = new Map<string, { key: string; name: string }>();
    const rows = map.map?.length || 0;
    const cols = map.map?.[0]?.length || 0;

    // small debug: print one station sample on first load to help identify model fields
    if (rows && cols) {
      const sample = map.map[0][0];
      if (sample) console.debug('map first-cell sample:', sample);
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const field = map.map[y][x];
        const stationObj = field?.location?.station ?? field?.location ?? field;
        const keyRaw = this.ownerKeyFromStation(stationObj);
        if (keyRaw == null) continue;
        const k = String(keyRaw);
        if (owners.has(k)) continue;
        let display = k;
        if (stationObj?.owner && typeof stationObj.owner === 'object') {
          if (stationObj.owner.name) display = stationObj.owner.name;
        owners.set(k, { key: k, name: display });
      }
    }

    owners.forEach((v, k) => {
      const color = this.colorForKey(k);
      // ensure cache contains the color for later use
      this.ownerColorMap.set(k, color);
      entries.push({ key: k, name: v.name, color });
    });

    entries.sort((a, b) => a.name.localeCompare(b.name));
    this.legendEntries = entries;
  }
 }

  private drawMap(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If there was a load error and no map data, ensure canvas is hidden and cleared.
    const map = this.mapData?.();
    if (this.errorMsg && (!map?.map || !map.map.length)) {
      this.setCanvasVisibility(false);
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
      return;
    } else {
      // ensure visible unless explicitly hidden by error
      this.setCanvasVisibility(true);
    }

    // clear using CSS pixel size (we draw using scaled coordinates)
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Draw background image (or fallback) immediately so the canvas is never blank
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
      try {
        ctx.drawImage(this.mapImage as HTMLImageElement, imgLeft, imgTop, drawW, drawH);
      } catch (e) {
        // drawImage can throw if the image taints the canvas for getImageData;
        // ignore and fall back to fill background.
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
    } else {
      // fallback: fill a subtle background so map dots remain visible
      ctx.fillStyle = '#fafafa';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    // If map data is not present, render an overlay message and stop.
    if (!map?.map || !map.map.length) {
      ctx.save();
      // a slight translucent panel for readability
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const pad = 8;
      const msg = this.loading ? 'Loading map...' : (this.errorMsg || 'Map not loaded');
      const textWidth = Math.min(300, ctx.measureText ? ctx.measureText(msg).width : 200);
      const boxW = textWidth + pad * 2;
      const boxH = 28;
      const bx = Math.max(10, Math.round((this.canvasWidth - boxW) / 2));
      const by = Math.max(10, Math.round((this.canvasHeight - boxH) / 2));
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.fillStyle = '#000';
      ctx.font = '14px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(msg, bx + pad, by + boxH / 2);
      ctx.restore();
      return;
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

    // draw a visible black border around the content rectangle
    ctx.save();
    // draw border as four stroked lines inset by half the stroke width
    const borderWidth = Math.max(2, Math.round(2 * this.scale)); // scale slightly with zoom
    const bw = Math.min(borderWidth, Math.floor(Math.min(contentW, contentH) / 2));
    if (contentW > 0 && contentH > 0 && bw > 0) {
      const inset = bw / 2;
      // inset coordinates to keep stroke entirely inside the content rect
      const leftI = Math.round(contentLeft + inset);
      const topI = Math.round(contentTop + inset);
      const rightI = Math.round(contentLeft + contentW - inset);
      const bottomI = Math.round(contentTop + contentH - inset);

      ctx.beginPath();
      ctx.lineWidth = bw;
      ctx.strokeStyle = '#000';
      ctx.lineJoin = 'miter';
      ctx.lineCap = 'butt';
      // draw the four sides as one closed polyline
      ctx.moveTo(leftI, topI);
      ctx.lineTo(rightI, topI);      // top
      ctx.lineTo(rightI, bottomI);   // right
      ctx.lineTo(leftI, bottomI);    // bottom
      ctx.lineTo(leftI, topI);       // left (close)
      ctx.stroke();
    }
    ctx.restore();

    // draw station markers on top
    const rows = map.map.length || 0;
    const cols = map.map[0]?.length || 0;

    // compute cell size mapped into the content rectangle
    const cellW = contentW / Math.max(1, cols);
    const cellH = contentH / Math.max(1, rows);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const field = map.map[y][x];

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
        // choose color: if bought -> owner color, otherwise unownedColor
        const ownerKey = this.ownerKeyFromStation(stationObj);
        const ownerKeyStr = ownerKey == null ? null : String(ownerKey);
        const fillColor = bought ? (ownerKeyStr ? (this.ownerColorMap.get(ownerKeyStr) ?? this.colorForKey(ownerKeyStr)) : this.colorForKey('unknown')) : this.unownedColor;

        ctx.beginPath();
        const markerRadius = Math.max(4, Math.floor(Math.min(cellW, cellH) * 0.18));
        ctx.arc(cx, cy, markerRadius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.stroke();
      }
    }
  }
}

