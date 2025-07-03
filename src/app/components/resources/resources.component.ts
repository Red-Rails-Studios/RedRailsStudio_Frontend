import { Component, OnInit } from '@angular/core';
import { Store } from '../../services/store';
import { CommonModule } from '@angular/common';
import { Resources } from '../../models/resources.model';

@Component({
  selector: 'app-resources',
  standalone: true,
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})

export class ResoursesComponent implements OnInit {
  sessionName: string = '';
  playerUid: string = '';

  constructor(public store: Store) {}

  ngOnInit(): void {
    setInterval(() => {
    this.store.setResources(this.sessionName, this.playerUid); 
    }, 1000);
  }

  // get energy() {
  //   return this.store.resources().energy_capacity;
  // }
  // get coinZahl() {
  //   return this.store.resources().DB_coin;
  // }
  // get workers() {
  //   return this.store.resources().man_power;
  // }
}
