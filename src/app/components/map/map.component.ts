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

  constructor(private apiService: APISService, public store: Store) {}

  ngOnInit(): void {
    const sessionNameSignal = this.store.sessionName();
    const sessionOverviewName = this.store.sessionInfo().sessionName;
    const sessionName = sessionNameSignal || sessionOverviewName;

    console.log('🗺️ MapComponent init. sessionName signal:', sessionNameSignal, 'sessionInfo:', sessionOverviewName);

    if (!sessionName) {
      console.warn('MapComponent: no sessionName available, skipping map load.');
      return;
    }

    console.log('MapComponent: loading map for session:', sessionName);
    this.apiService.getMap(sessionName).subscribe({
      next: (m) => {
        this.mapData = m;
        console.log('Map loaded:', m);
      },
      error: (err) => {
        console.error('Failed to load map', err);
      }
    });
  }
}
