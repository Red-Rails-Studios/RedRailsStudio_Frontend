import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

  constructor(private router: Router) {}

  startMultiplayer() {
    if (this.sessionName) {
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

  clearFields() {
    this.inputName = '';
    this.inputID = '';
  }

  clearFieldsJoin() {
    this.inputNameJoin = '';
    this.inputIDJoin = '';
  }
}