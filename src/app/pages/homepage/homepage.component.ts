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
    if (!this.sessionName || !this.playerName) {
      alert('Please enter both a session name and a player name.');
      return;
    }
    this.apiService.createSession(this.sessionName).subscribe({
       next: () => {
         this.apiService.postNewPlayer(this.sessionName, this.playerName).subscribe({
           next: (response: { name: string; uid: string }) => {
             if (response && response.uid) {
              this.store.sessionInfo().sessionName = this.sessionName;
              this.store.playerInfo().name = this.playerName;
              this.store.playerInfo().uid = response.uid;
              console.log('Session created, PlayerCreated, player Joined', this.playerName, this.sessionName)
               this.router.navigate(['/lobby']);
             } else {
               alert('Failed to join session.');
             }
           },
           error: () => {
             alert('Failed to create player.');
           }
         });
       },
       error: () => {
         alert('Failed to create session.');
       }
     });
  }

  onKillSession() {
    this.store.killSession(this.sessionName);
  }

  onJoinSession(sessionName: string, playerName: string) {
    if (!sessionName || !playerName) {
      alert('Please enter both a session name and a player name.');
      return;
    }
     this.apiService.postNewPlayer(sessionName, playerName).subscribe({
       next: (response: { name: string; uid: string }) => {
         if (response && response.uid) {
           this.store.setPlayerUid(response.uid);
           this.store.setSessionName(sessionName);
           this.store.setPlayerName(playerName);
           this.router.navigate(['/lobby']);
         } else {
           alert('Failed to join session.');
         }
       },
       error: () => {
         alert('Failed to join session.');
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