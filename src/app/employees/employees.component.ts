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
  power = 10;
  playerInfo = inject(Store).playerInfo;
  sessionInfo = inject(Store).sessionInfo;

  constructor(public store: Store) {}

  ngOnInit(): void {
    const sessionName = this.sessionInfo().sessionName;
    const playerUId = this.store.playerUid();
    if (sessionName && playerUId) {
      this.store.getPlayerInfos(sessionName, playerUId);
      setInterval(() => {
        this.employee = this.store.playerInfo().employees;
        this.power = this.playerInfo().power;
      }, 1000);
    }
    else {
      console.error('Session name or player UID is missing!');
    }
  }

  onBuyPower(){
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uId;
    this.store.buyEmployee(sessionName, uid);
    console.log('buying train with', sessionName, uid);
  }

  onBuyEmployee(){
    const sessionName = this.sessionInfo().sessionName;
    const uid = this.playerInfo().uId;
    this.store.buyPower(sessionName, uid);
    console.log("power bought");
  }
}
