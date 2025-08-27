import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';
import { Store } from '../services/store';

@Component({
  selector: 'app-employees',
  imports: [CommonModule, NgFor],
  templateUrl: './employees.component.html',
  styleUrl: './employees.component.scss'
})
export class EmployeesComponent {
  employee = 8;
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUid = this.playerInfo().uid;
    if (sessionName && playerUid) {
      this.store.getPlayerInfos(sessionName, playerUid);
      setInterval(() => {
        this.employee = this.store.playerInfo().employees;
      }, 5000);
    }
    else {
    console.error('Session name or player UID is missing!');
  }
  }

  onBuyEmployee() {
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyEmployee(sessionName, uid);
    console.log('buying train with', sessionName, uid);
  }

  onBuyPower(){
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uid;
    this.store.buyPower(sessionName, uid);
    console.log("power bought");
  }
}
