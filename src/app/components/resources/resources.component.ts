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

  sessionName: string = 'testsession';
  playerUid = inject(Store).playerUid;

  constructor(public store: Store) {}

  ngOnInit(): void {
    setInterval(() => {
    this.store.setResources(this.sessionInfo().sessionName, this.playerInfo().uid);
    }, 5000);
  }
}
