import { Component, inject, OnInit } from '@angular/core';
import { Store } from '../../services/store';
import { CommonModule, CurrencyPipe } from '@angular/common';


@Component({
  selector: 'app-resources',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './resources.component.html',
  styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {
  resources = inject(Store).resources;
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
  const sessionName = this.store.sessionInfo().sessionName;
  const playerUid = this.store.playerInfo().uid;
  if (sessionName && playerUid) {
    this.store.getPlayerInfos(sessionName, playerUid);
    setInterval(() => {
      this.store.setResources(sessionName, playerUid);
    }, 5000);
  } else {
    console.error('Session name or player UID is missing!');
  }
}

  // ngOnInit(): void {
  //   this.store.getPlayerInfos(this.store.sessionInfo().sessionName, this.store.playerInfo().uid);
  //   setInterval(() => {
  //   this.store.setResources(this.store.sessionInfo().sessionName, this.store.playerInfo().uid);
  //   }, 5000);
  // }
}
