import { Component, inject } from '@angular/core';
import { Store } from '../../services/store';
import { Rail } from '../../models/rail.model';
import { Station } from '../../models/station.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { Requirements } from '../../models/requierment.model';

@Component({
  selector: 'app-upgrades',
  imports: [CommonModule, NgFor],
  templateUrl: './railsandstations.component.html',
  styleUrl: './railsandstations.component.scss'
})
export class UpgradesComponent {
  rails: Rail[] = [];
  stations: Station[] = [];
  upgradesRail: Requirements[] = [];
  upgradesStation: Requirements[] = [];
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
      this.upgradesRail = this.store.upgradeResourcesRail();
      this.upgradesStation = this.store.upgradeResourcesStation();
    }, 1000);
  }

  onBuyRail() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.store.playerUid();
    if (!sessionName || !uId) {
      console.error('Cannot buy rail: sessionName or playerUid missing');
      return;
    }
    this.store.buyRail(sessionName, uId);
    //console.log('buying Rail with', sessionName, uid);
  }

   onUpgradeRail(railNr: number) {  
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uId;
    const railId = this.store.resources().railDtos[railNr].uId;
    console.log(railId);
    this.store.upgradeTrain(sessionName, uid, railId);
  }

  onBuyStation() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.store.playerUid();
    if (!sessionName || !uId) {
      console.error('Cannot buy station: sessionName or playerUid missing');
      return;
    }
    this.store.buyStation(sessionName, uId);
    //console.log('buying Rail with', sessionName, uid);
  }

  onUpgradeStation(stationNr: number) {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uId;
    const stationId = this.store.resources().stationDtos[stationNr].uId;
    console.log(stationId);
    this.store.upgradeTrain(sessionName, uid, stationId);
  }

}