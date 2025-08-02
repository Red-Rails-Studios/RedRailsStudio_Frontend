import { Component, inject, OnInit } from '@angular/core';
import { Store } from '../../services/store';
import { CommonModule, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-resources',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})

export class ResourcesComponent implements OnInit {
  // sessionName: string = 'testsession';
  // playerUid: string = 'a7dda6fa-5fa2-4e68-882d-054e66756bcf';  //TODO: playerUid muss irgendwie geholt werden
  resources = inject(Store).resources;
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
    setInterval(() => {
    this.store.setResources(this.store.sessionInfo().sessionName, this.playerInfo().uid);
    }, 5000);
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
