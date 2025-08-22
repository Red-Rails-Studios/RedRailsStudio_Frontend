import { Component, inject } from '@angular/core';
import { Store } from '../../services/store';
import { Rail } from '../../models/railway.model';
import { Station } from '../../models/trainStation.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-upgrades',
  imports: [CommonModule, NgFor],
  templateUrl: './railsandstations.component.html',
  styleUrl: './railsandstations.component.scss'
})
export class UpgradesComponent {
  rails: Rail[] = [];
  stations: Station[] = [];
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;
    if (sessionName && playerUid) {
      this.store.getPlayerInfos(sessionName, playerUid);
      setInterval(() => {
        this.rails = this.store.playerInfo().rails;
        this.stations = this.store.playerInfo().stations;
      }, 5000);
    }
    else {
    console.error('Session name or player UID is missing!');
  }
  }

  onBuyRail() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyRail(sessionName, uid);
    console.log('buying Rail with', sessionName, uid);
  }

  onBuyStation() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyStation(sessionName, uid);
    console.log('buying Rail with', sessionName, uid);
  }

}