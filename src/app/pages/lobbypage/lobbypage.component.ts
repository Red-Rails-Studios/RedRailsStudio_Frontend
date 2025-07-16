import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../services/store';

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
  sessionName = 'testSession';
  playerName = 'testPlayer';
  inputNameJoin = '';
  joinSession = '';

  constructor(private router: Router, public store: Store) {}

  onStartSession() {
    this.store.startSession(this.sessionName);
    this.router.navigate(['game'])
  }

  onLeaveLobby() {   
    this.router.navigate(['home']);
  }

  get sessionPlayerNames(): string {
    const session = this.store.session();
    if (session && session.players) {
      return session.players.map(player => player.name).join(', \n');
    }
    return '';
  }

  get isCreator(): boolean {
    const session = this.store.session();
    const currentPlayer = localStorage.getItem('playerName');
    // If the first player in the session is the creator
    return !!(session && session.players && session.players.length > 0 && session.players[0].name === currentPlayer);
  }
}