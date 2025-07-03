import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-homepage',
  imports: [FormsModule, CommonModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent {
  sessionName: any;
  playerName = '';
  inputValue: any = '';
  showOptions: any;

  startMultiplayer() {
    if (this.sessionName) {
      console.log('Creating multiplayer session:', this.sessionName);
    }
  }

  joinMultiplayer() {
    if (this.playerName) {
      console.log('Joining multiplayer session:', this.playerName);
    }
  }

  startSingleplayer() {
    console.log('Singleplayer session started');
  }

  endSingleplayer() {
    console.log('Singleplayer session ended');
  }
}