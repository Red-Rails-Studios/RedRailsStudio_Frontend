import { Component, inject } from '@angular/core';
import { Train } from '../../models/train.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
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
  upgrades: Requirements[] = [];

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;
    
    if (sessionName && playerUid) {
      this.store.getPlayerInfos(sessionName, playerUid);

      setInterval(() => {
        this.trains = this.store.resources().trainDtos;
        for (let i=0; i<= this.trains.length; i++) {
          const trainId = this.store.resources().trainDtos[i].uid;
          this.store.upgradeRequirementsTrain(sessionName, playerUid, trainId).subscribe((response:Requirements) => {
            this.upgrades[i] = response;
          });
        }
        //console.log("trains updated", this.trains)
      }, 1000);
    }
  }

  onBuyTrain() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyTrain(sessionName, uid);
    //console.log('buying train with', sessionName, uid);
  }

  onUpgradeTrain(trainNr: number) {  
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    const trainId = this.store.resources().trainDtos[trainNr].uid;
    console.log(trainId);
    this.store.upgradeTrain(sessionName, uid, trainId);
  }

  getTrainUpgrade(trainNr: number) {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    const trainId = this.store.resources().trainDtos[trainNr].uid;
    this.store.upgradeRequirementsTrain(sessionName, uid, trainId);
  }

}
