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
    const sessionName = this.store.sessionInfo().sessionName;
    if (sessionName) {
      this.apiService.getMap(sessionName).subscribe({
        next: (m) => this.mapData = m,
        error: (err) => console.error('Failed to load map', err)
      });
    }
  }
}
