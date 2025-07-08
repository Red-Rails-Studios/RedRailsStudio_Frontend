import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '../../services/store';

@Component({
  selector: 'app-homepage',
  imports: [FormsModule, CommonModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent {
  showMain = true;
  showCreate = false;
  showJoin = false;
  showStart = false;
  sessionName = 'testSession';
  playerName = 'testPlayer';
  inputNameJoin = '';
  joinSession = '';

  constructor(private router: Router, private store: Store) {}

  onCreateSession() {
    this.store.createSessionAndJoinFirstPlayer(this.sessionName, this.playerName);
  }

  startMultiplayer() {
    if (this.sessionName) {
      console.log('Creating multiplayer session:', this.sessionName);
      this.router.navigate(['/game']);
    }
  }

  onJoinSession() {
    this.store.joinPlayer(this.sessionName, this.playerName);
  }

  onStartSession() {
    this.store.startSession(this.sessionName);
  }

  onKillSession() {
    this.store.killSession(this.sessionName);
  }

  get sessionPlayerNames(): string {
    const session = this.store.session();
    if (session && session.players) {
      return session.players.map(player => player.name).join(', \n');
    }
    return '';
  }

  clearFields() {
    this.playerName = '';
    this.sessionName = '';
  }

  clearFieldsJoin() {
    this.inputNameJoin = '';
    this.joinSession = '';
  }
}