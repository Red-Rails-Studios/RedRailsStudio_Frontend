import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../services/store';
import { APISService } from '../../services/apis.service';
import { Player } from '../../models/player.model';

@Component({
  selector: 'app-lobbypage',
  imports: [FormsModule, CommonModule],
  templateUrl: './lobbypage.component.html',
  styleUrls: ['./lobbypage.component.scss']
})
export class LobbypageComponent {
  lobbyPlayers: any[] = [];

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

  // deterministic color generator - same logic as map component fallback
  colorForUid(player: any): string {
    const uid = player?.uid ?? player?.playerUid ?? player?.uId ?? player?.id ?? player?.UId ?? null;
    if (!uid) return '#9e9e9e';
    const s = String(uid);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    h = Math.abs(h);
    const hue = h % 360;
    return `hsl(${hue} 65% 45%)`;
  }
}