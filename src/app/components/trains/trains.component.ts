import { Component, inject } from '@angular/core';
import { Train } from '../../models/train.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { Store } from '../../services/store';

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

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;
    

 if (sessionName && playerUid) {
  this.store.getPlayerInfos(sessionName, playerUid);

  setInterval(() => {
    this.trains = this.store.resources().trainDtos;
      //console.log("trains updated", this.trains)
    }, 500);}
  }

  onBuyTrain() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyTrain(sessionName, uid);
    //console.log('buying train with', sessionName, uid);
  }

  onUpgradeTrain(trainNr: number) {  //TODO: need to fix upgrade see other branch
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    const trainId = this.store.resources().trainDtos[trainNr].uid;
    //const trainId = this.trains[trainNr].id;
    console.log(trainId);
    this.store.upgradeTrain(sessionName, uid, trainId);
  }

}
