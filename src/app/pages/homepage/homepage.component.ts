import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { APISService } from '../../services/apis.service'; // Adjust the import path
import { Store } from '../../services/store'; // Adjust the import path


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
  sessionName: any;
  playerName = '';
  inputName: any = '';
  inputID: any = '';
  inputNameJoin: any = '';
  inputIDJoin: any = '';

  constructor(private apiService: APISService, public store: Store, private router: Router) {}

  onCreateSession() {
    if (this.sessionName) {
      this.apiService.createSession(this.sessionName);
      this.apiService.postNewPlayer(this.sessionName, this.playerName);
      this.store.setSessionName(this.sessionName); // Save session name in store
      console.log('Creating multiplayer session:', this.sessionName);
      this.router.navigate(['/lobby']);
    }

  }

  onKillSession() {
    this.store.killSession(this.sessionName);
  }

  onJoinSession(sessionName: string, playerName: string) {
    this.apiService.postNewPlayer(sessionName, playerName).subscribe({
      next: (response: { name: string; uid: string }) => {
        if (response && response.uid) {
          this.store.setPlayerUid(response.uid);
          this.router.navigate(['/lobby']);
        }
      },
      error: (err) => {
        // handle error
      }
    });
  }

  clearFields() {
    this.playerName = '';
    this.sessionName = '';
  }

  clearFieldsJoin() {
    this.inputNameJoin = '';
    this.inputIDJoin = '';
  }
}