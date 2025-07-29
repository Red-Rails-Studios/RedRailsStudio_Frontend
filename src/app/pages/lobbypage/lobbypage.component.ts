import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
  showMain = true;
  showCreate = false;
  showJoin = false;
  showStart = false;
  inputNameJoin = '';
  joinSession = '';
  lobbyPlayers: Player[] = [];

  constructor(private router: Router, public store: Store, private apiService: APISService) {}

  ngOnInit() {
    this.fetchPlayers();
    setInterval(() => this.fetchPlayers(), 5000 );
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
    const sessionName = this.store.sessionName();
    if (sessionName) {
      this.store.startSession(sessionName);
      this.router.navigate(['game']);
    } else {
      console.error('No session name set!');
    }
  }

  onLeaveLobby() {   
    this.router.navigate(['home']);
  }

  get playerName(): string | null {
    return this.store.playerName();
  }
}