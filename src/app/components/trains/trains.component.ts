import { Component, Injectable } from '@angular/core';
import { Train } from '../../models/train.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { Store } from '../../services/store';
import { Inject } from '@angular/core';
import { APIService } from

@Component({
  selector: 'app-trains',
  imports: [CommonModule, NgFor],
  templateUrl: './trains.component.html',
  styleUrl: './trains.component.scss'
})
export class TrainsComponent {
  trains: string[] = ['train 1'];

  constructor(public store: Store,  apiService: APIService) {}

  onAddTrain(){
    this.trains.push(`Trains ${this.trains.length+1}`); //TODO: update anzahl trains in store make to trains
  }

  buyTrain() {
    this.apiService.
  }
}
