import { Component } from '@angular/core';
import { Train } from '../../models/train.model';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-trains',
  imports: [CommonModule, NgFor],
  templateUrl: './trains.component.html',
  styleUrl: './trains.component.scss'
})
export class TrainsComponent {
  buttons: string[] = ['Button 1'];

  addButton(){
    this.buttons.push(`Button ${this.buttons.length+1}`); //TODO: update anzahl trains in store
  }
}
