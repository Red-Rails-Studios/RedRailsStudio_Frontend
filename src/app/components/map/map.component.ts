import { Component, OnInit } from '@angular/core';
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
export class MapComponent implements OnInit {
  public mapData: GameMap | null = null;
  public loading = false;
  public errorMsg: string | null = null;
  private pollIntervalId: any = null;

  constructor(private apiService: APISService, public store: Store) {}

  ngOnInit(): void {
    const sessionNameSignal = this.store.sessionName();
    const sessionOverviewName = this.store.sessionInfo().sessionName;
    const sessionName = sessionNameSignal || sessionOverviewName;

    console.log('🗺️ MapComponent init. sessionName signal:', sessionNameSignal, 'sessionInfo:', sessionOverviewName);

    if (!sessionName) {
      console.warn('MapComponent: no sessionName available yet, starting poll to wait for sessionName...');
      // poll for sessionName for up to 30s
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

    // If we have sessionName, load map immediately
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
        console.log('Map loaded:', m);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = `Failed to load map: ${err?.status || ''} ${err?.statusText || ''}`;
        console.error('Failed to load map', err);
      }
    });
  }

  // Manual reload callable from template
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
}
