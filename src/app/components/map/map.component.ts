/*
  DE: Umstellung der Map-Komponente von einer CSS-Grid-Darstellung auf ein HTML-Canvas.
*/
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener, WritableSignal, signal } from '@angular/core';
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
  public mapData: WritableSignal<GameMap | null> = signal(null);
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
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        // clear map data and hide canvas
        this.mapData.set(null);
        this.setCanvasVisibility(false);
        this.scheduleDraw();
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
