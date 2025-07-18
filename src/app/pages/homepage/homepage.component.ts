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
    this.router.navigate(['/lobby']);
  }

  onJoinSession() {
    this.store.joinPlayer(this.sessionName, this.playerName);
    this.router.navigate(['/lobby']);
  }

  onStartSession() {
    this.store.startSession(this.sessionName);
    this.router.navigate(['game'])
  }

  onKillSession() {
    this.store.killSession(this.sessionName);
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