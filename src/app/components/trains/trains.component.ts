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
    const playerUId = this.playerInfo().uId;
    

 if (sessionName && playerUId) {
  this.store.getPlayerInfos(sessionName, playerUId);

  setInterval(() => {
    this.trains = this.store.resources().trainDtos;
      //console.log("trains updated", this.trains)
    }, 500);}
  }

  onBuyTrain() {
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.playerInfo().uId;
    this.store.buyTrain(sessionName, uId);
    //console.log('buying train with', sessionName, uid);
  }

  onUpgradeTrain(trainNr: number) {  //TODO: need to fix upgrade see other branch
    const sessionName = this.sessionInfo().sessionName;
    const uId = this.playerInfo().uId;
    const trainId = this.store.resources().trainDtos[trainNr].uId;
    //const trainId = this.trains[trainNr].id;
    console.log(trainId);
    this.store.upgradeTrain(sessionName, uId, trainId);
  }

}
