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
  currentAmount: number = 0;

  constructor(public store: Store) {}

  ngOnInit(): void {
  const sessionName = this.store.sessionInfo().sessionName;
  const playerUid = this.store.playerUid();
  
  if (sessionName && playerUid) {
    this.store.getPlayerInfos(sessionName, playerUid);
    //let deltaAmount = 0;
    setInterval(() => {
      this.store.setResources(sessionName, playerUid);
     // deltaAmount = this.store.resources().dbCoin as number - this.currentAmount;
      // this.countToLastCoinAmount(currentAmount, this.store.resources().dbCoin as number);
    }, 1000);
    // setInterval(() => {
    //   //if (this.currentAmount !== this.store.resources().dbCoin as number)
    //     this.currentAmount += deltaAmount / 5;
    // }, 1000)
  } 
  else {
    console.error('Session name or player UID is missing!');
    }
  }

  // countToLastCoinAmount(currentAmount: number, newAmount: number){
  //   const amountPerSecond = (newAmount - currentAmount) / 5; 
  //   //for (let i = 0; i < 5; i++){
  //     const interval = setInterval(() => {
  //       if (currentAmount !== newAmount){
  //         currentAmount += amountPerSecond;
  //         console.log(currentAmount);
  //         this.currentAmount = Math.floor(currentAmount);
  //       }
  //       clearInterval(interval);
  //     }, 200);
  //   //}
  // }
}
