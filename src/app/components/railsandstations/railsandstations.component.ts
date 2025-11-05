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

  get freeEmployee(): number {
    return this.store.freeEmployee() ?? 0;
  }

  get freePower(): number {
    return this.store.freePower() ?? 0;
  }

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;
    this.store.getUpgradeRequirementsRail(sessionName, playerUid);
    this.store.getUpgradeRequirementsStation(sessionName, playerUid);

    setInterval(() => {
      this.store.getUpgradeRequirementsRail(sessionName, playerUid);
      this.store.getUpgradeRequirementsStation(sessionName, playerUid);
      this.rails = this.store.resources().railDtos;
      this.stations = this.store.resources().stationDtos;
      this.upgradesRail = this.store.upgradeResourcesRail();
      this.upgradesStation = this.store.upgradeResourcesStation();
      console.log("1.", this.upgradesStation);
      console.log("2.", this.store.upgradeResourcesRail());
    }, 1000);
  }

  onBuyRail() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.store.playerUid();
    if (!sessionName || !uid) {
      console.error('Cannot buy rail: sessionName or playerUid missing');
      return;
    }
    this.store.buyRail(sessionName, uid);
    this.upgradesRail = this.store.upgradeResourcesRail();
    //console.log('buying Rail with', sessionName, uid);
  }

   onUpgradeRail(railNr: number) {  
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    const railId = this.store.resources().railDtos[railNr].uid;
    //console.log(railId);
    this.store.upgradeRail(sessionName, uid, railId);
    this.upgradesRail = this.store.upgradeResourcesRail();
  }

  onBuyStation() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.store.playerUid();
    if (!sessionName || !uId) {
      console.error('Cannot buy station: sessionName or playerUid missing');
      return;
    }
    this.store.buyStation(sessionName, uId);
    this.upgradesStation = this.store.upgradeResourcesStation();
  }

  onUpgradeStation(stationNr: number) {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    const stationId = this.store.resources().stationDtos[stationNr].uid;
    //console.log(stationId);
    this.store.upgradeStation(sessionName, uid, stationId);
    this.upgradesStation = this.store.upgradeResourcesStation();
  }

}