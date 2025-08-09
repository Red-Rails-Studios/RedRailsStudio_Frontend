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

  sessionName: string = 'testsession';
  resources = inject(Store).resources;
  playerUid = inject(Store).playerUid;

  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;


  constructor(public store: Store) {}

  ngOnInit(): void {
    setInterval(() => {
      // const uid = this.playerUid();
      // if (uid) {
      //   this.store.setResources(this.sessionName, uid);
      // }

    this.store.setResources(this.store.sessionInfo().sessionName, this.playerInfo().uid);
    }, 5000);
  }
}
