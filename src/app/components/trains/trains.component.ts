import { Component, inject } from '@angular/core';
import { Train } from '../../models/train.model';
import { CommonModule } from '@angular/common';
import { NgFor, NgIf } from '@angular/common';
import { Store } from '../../services/store';
import { Requirements } from '../../models/requierment.model';

@Component({
  selector: 'app-trains',
  imports: [CommonModule, NgFor],
  templateUrl: './trains.component.html',
  styleUrl: './trains.component.scss'
})
export class TrainsComponent {
  trains: Train[] = [];
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;
  requirements = inject(Store).upgradeResourcesTrain;
  upgrades: Requirements[] = [];
  buy: Requirements | undefined;

  get freeEmployee(): number {
    return this.store.freeEmployee() ?? 0;
  }

  get freePower(): number {
    return this.store.freePower() ?? 0;
  }

  constructor(public store: Store) {}

  ngOnInit(): void { 
    const sessionName = this.sessionInfo().sessionName;
    const playerUId = this.store.playerUid();

    if (sessionName && playerUId) {
      this.store.getPlayerInfos(sessionName, playerUId);
      this.store.getUpgradeRequirementsTrain(sessionName, playerUId);

      setInterval(() => {
        this.store.getUpgradeRequirementsTrain(sessionName, playerUId);
        this.trains = this.store.resources().trainDtos;
        this.upgrades = this.store.upgradeResourcesTrain();
        this.store.getBuyRequirements(sessionName, playerUId);
        //console.log('upgrade requirements train',this.upgrades, playerUId);
      }, 500);
    }
  }

  onBuyTrain() {
    const sessionName = this.sessionInfo().sessionName;
    // prefer store.playerUid() signal because it is the authoritative uid
    const uIdFromStore = this.store.playerUid();
    const uIdFromPlayerInfo = this.playerInfo().uId;
    const uId = uIdFromStore || uIdFromPlayerInfo;

    console.log('onBuyTrain called. sessionName:', sessionName, 'uIdFromStore:', uIdFromStore, 'uIdFromPlayerInfo:', uIdFromPlayerInfo);

    if (!sessionName) {
      console.error('Cannot buy train: sessionName is missing');
      return;
    }
    if (!uId) {
      console.error('Cannot buy train: player UID is missing');
      return;
    }

    this.store.buyTrain(sessionName, uId);
    this.store.getUpgradeRequirementsTrain(sessionName, uId);

    this.buy = this.store.elementBuyRequirements()[0];
  }

  onUpgradeTrain(trainNr: number) {  //TODO: fix upgrades on trains
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.playerInfo().uId;
    const trainId = this.store.resources().trainDtos[trainNr].uId;
    //const trainId = this.trains[trainNr].id;
    //console.log(trainId);
    this.store.upgradeTrain(sessionName, uId, trainId);
    this.store.getUpgradeRequirementsTrain(sessionName, uId);
  }

}
