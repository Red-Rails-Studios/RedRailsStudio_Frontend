import { Component } from '@angular/core';
import { MapComponent } from './components/map/map.component';
import { ResoursesComponent } from './components/resources/resources.component';
import { APISService } from './services/apis.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MapComponent, ResoursesComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'rrs_frontend';
  //sessionId = new Date().getTime().toString();
  playerName: string = '';
  sessionId: string = '';

  constructor(private apiService: APISService) {
    this.sessionId = this.sessionId; // Initialisiert die sessionId
  }

  onSetPlayerName(name: string){
    this.apiService.postNewPlayer(this.sessionId, name).subscribe((response)=> {console.log('New Player')},
    (error)=> {console.error('Error player')});  //erstellt eine Player
  }

  onCreateSession(sessionName: string) {
    this.apiService.createSession(sessionName).subscribe((response) => {console.log('Session created')},
    (error) => {console.error('Error creating session')},
     );  //erstellt ein Session
     return this.sessionId = sessionName; // Setzt die sessionId
  }

  onStartSession() {
    this.apiService.startSession(this.sessionId).subscribe((response) => {console.log('Session started')},
    (error) => {console.error('Error starting session')},
    );  //startet ein Session
  }

  onKillSession(){
    this.apiService.killSession(this.sessionId).subscribe((response) => {console.log('Session killed')},
    (error) => {console.error('Error killing session')},
  );  //killt ein Session
  }

  onJoinSession(playerName?: string) {
    const name = playerName || this.playerName || 'Player2';
    this.apiService.postNewPlayer('testsession', name).subscribe(
      (response) => { console.log('New Player joined the Session'); },
      (error) => { console.error('Error joining session'); }
  ); //man joins a session

 }
}
