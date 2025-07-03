import { Component, inject, OnInit } from '@angular/core';
import { Store } from '../../services/store';
import { CommonModule, CurrencyPipe, JsonPipe } from '@angular/common';

@Component({
  selector: 'app-resources',
  imports: [CommonModule, CurrencyPipe],
  standalone: true,
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})

export class ResourcesComponent implements OnInit {
  sessionName: string = 'testsession';
  playerUid: string = 'eb24bb6a-f994-4953-8b0a-723510bfda7e';
  resources = inject(Store).resources

  constructor(public store: Store) {}

  ngOnInit(): void {
    setInterval(() => {
    this.store.setResources(this.sessionName, this.playerUid);
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
