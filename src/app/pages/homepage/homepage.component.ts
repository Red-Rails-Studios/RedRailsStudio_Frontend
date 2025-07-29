import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { APISService } from '../../services/apis.service'; 
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
  sessionName: string = '';
  playerName: string = '';
  inputName: any = '';
  inputID: any = '';
  inputNameJoin: string = '';
  inputIDJoin: string = '';

  constructor(private apiService: APISService, public store: Store, private router: Router) {}

  onCreateSession() {
    if (this.sessionName && this.playerName) {
      this.apiService.createSession(this.sessionName).subscribe(() => {
        this.apiService.postNewPlayer(this.sessionName, this.playerName).subscribe((response: { name: string; uid: string }) => {
          if (response && response.uid) {
            this.store.setSessionName(this.sessionName);
            this.store.setPlayerUid(response.uid);
            this.store.setPlayerName(this.playerName); 
            this.router.navigate(['/lobby']);
          }
        });
      });
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
          this.store.setSessionName(sessionName);
          this.store.setPlayerName(playerName); 
          this.router.navigate(['/lobby']);
        }
      },
      error: (err) => {
        
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