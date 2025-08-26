import { Component, inject } from '@angular/core';
import { Store } from '../../services/store';
import { Rail } from '../../models/rail.model';
import { Station } from '../../models/station.model';
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
    const playerUid = this.playerInfo().uId;

    setInterval(() => {
    this.rails = this.store.resources().railDtos;
      //console.log("rails updated", this.rails);
      this.stations = this.store.resources().stationDtos;
      //console.log("stations updated", this.stations)
    }, 500);
  }

  onBuyRail() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.playerInfo().uId;
    this.store.buyRail(sessionName, uId);
    //console.log('buying Rail with', sessionName, uid);
  }

  onBuyStation() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.playerInfo().uId;
    this.store.buyStation(sessionName, uId);
    //console.log('buying Rail with', sessionName, uid);
  }

}