import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../services/store';
import { APISService } from '../../services/apis.service';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-lobbypage',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './lobbypage.component.html',
  styleUrls: ['./lobbypage.component.scss']
})
export class LobbypageComponent {
  lobbyPlayers: Player[] = [];

  constructor(private router: Router, public store: Store, private apiService: APISService) {}

  ngOnInit() {
    this.fetchPlayers();
    setInterval(() => this.fetchPlayers(), 5000);
  }  

  fetchPlayers () {
    const sessionName = this.store.sessionName();
    if (sessionName) {
      this.apiService.getSessionPlayers(sessionName).subscribe(players => {
        console.log('Received lobby players:', players);
        this.lobbyPlayers = players || [];
        this.lobbyPlayers.forEach(player => {
          console.log(`Player ${player.name} color: ${this.colorForUid(player)}`);
        });
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
    if (!player.color) return '#999999';
    // Ensure proper hex color format
    const color = player.color.replace('#', '').toUpperCase();
    if (color === '000000') return '#999999'; // Replace black with gray
    return `#${color}`;
  }
}