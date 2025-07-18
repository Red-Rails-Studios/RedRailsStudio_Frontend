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

  startMultiplayer() {
    if (this.sessionName) {
      this.store.setSessionName(this.sessionName); // Save session name in store
      console.log('Creating multiplayer session:', this.sessionName);
      this.router.navigate(['/game']);
    }
  }

  joinMultiplayer() {
    if (this.playerName) {
      console.log('Joining multiplayer session:', this.playerName);
      this.router.navigate(['/game']);
    }
  }

  joinSession(sessionName: string, playerName: string) {
    this.apiService.postNewPlayer(sessionName, playerName).subscribe({
      next: (response: { name: string; uid: string }) => {
        if (response && response.uid) {
          this.store.setPlayerUid(response.uid);
          this.router.navigate(['/game']);
        }
      },
      error: (err) => {
        // handle error
      }
    });
  }

  clearFields() {
    this.inputName = '';
    this.inputID = '';
  }

  clearFieldsJoin() {
    this.inputNameJoin = '';
    this.inputIDJoin = '';
  }
}