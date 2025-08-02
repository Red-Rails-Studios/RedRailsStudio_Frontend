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
  trains: string[] = ['train 1'];
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  onAddTrain(){
    this.trains.push(`Trains ${this.trains.length+1}`); //TODO: update anzahl trains in store make to trains
  }

  onBuyTrain() {
    this.store.buyTrain(this.sessionInfo().sessionName, this.playerInfo().uid);
  }
}
