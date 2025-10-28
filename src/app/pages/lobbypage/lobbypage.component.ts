import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../services/store';
import { APISService } from '../../services/apis.service';
import { Player } from '../../models/player.model';
import { normalizeColorRaw } from '../../utils/color.util';

@Component({
  selector: 'app-lobbypage',
  imports: [FormsModule, CommonModule],
  templateUrl: './lobbypage.component.html',
  styleUrls: ['./lobbypage.component.scss']
})
export class LobbypageComponent {
  lobbyPlayers: any[] = [];

  // make helper available in template
  public normalizeColor = normalizeColorRaw;

  constructor(private router: Router, public store: Store, private apiService: APISService) {}

  ngOnInit() {
    this.fetchPlayers();
    setInterval(() => this.fetchPlayers(), 5000);
  }  

  fetchPlayers () {
    const sessionName = this.store.sessionName();
    if (sessionName) {
      this.apiService.getSessionPlayers(sessionName).subscribe(players => {
        this.lobbyPlayers = players || [];
      });
    }
  } 

  onStartSession() {
    const sessionName = this.store.sessionInfo().sessionName;
    if (sessionName) {
      this.store.startSession(sessionName);
      this.router.navigate(['game']);
    } else {
      console.error('No session name set!');
    }
  }

  onLeaveLobby() {   
    const sessionName = this.store.sessionName();
    const playerUid = this.store.playerUid();
    if(sessionName && playerUid) {
      this.apiService.removePlayer(sessionName, playerUid).subscribe({
      next: () => {
        this.router.navigate(['home']);
      },
      error: (err) => {
        console.error('Failed to remove player:', err);
        this.router.navigate(['home']);
      }  
      });
    } else {
      this.router.navigate(['home']);
    }
  }

  colorForUid(player: Player): string {
    for (let index = 0; index < this.lobbyPlayers.length; index++) {
      if(this.lobbyPlayers[index].uId == player.uId) {
        switch(this.lobbyPlayers[index].color) {
          case '#FF0000':
            return '#FF0000';
          case '#00FF00':
            return '#00FF00';
          case '#0000FF':
            return '#0000FF';
          case '#FFFF00':
            return '#FFFF00';
        }
      }
    }

    return '#000000';
  }
}