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
  testTrain: Train[] = [];
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;

    this.trains.push({id: 1212, name: "test", type: 'new', level: 1, production: 'enough'});

    if (sessionName && playerUid) {
      this.store.getPlayerInfos(sessionName, playerUid);
      setInterval(() => {
        const trains = this.store.playerInfo().trains;

        for(let i= 0; i< this.store.playerInfo().trains.length; i++){
          this.trains.push(trains[i])
        }
      }, 5000);
    }
    else {
    console.error('Session name or player UID is missing!');
  }
  }

  onBuyTrain() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyTrain(sessionName, uid);
    console.log('buying train with', sessionName, uid);
  }

}
