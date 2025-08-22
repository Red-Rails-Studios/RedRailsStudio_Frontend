import { Injectable } from '@angular/core';
import { Resources } from '../models/resources.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Train } from '../models/train.model';
import { Session } from '../models/session.model';
import { Player } from '../models/player.model';
import { GameState } from '../models/game-state.model';


@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class APISService {
  private apiUrl = 'http://localhost:8080'; // URL to web api

  constructor(private http: HttpClient) {

  }

  postNewPlayer(sessionName: string, playerName: string) {
    return this.http.post<{ name: string; uid: string }>(
      `http://localhost:8080/session/${sessionName}/${playerName}`,
      null
    );
  }

  startSession(sessionName: string): Observable<any> {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/start`, null); //startet  session
  }

  createSession(sessionName: string): Observable<any> {
    return this.http.post(`http://localhost:8080/session/${sessionName}`, null,  { responseType: 'text'}); //creates session
  }

  killSession(sessionName: string): Observable<any> {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/kill`, null, { responseType: 'text'}); //kills session
  }

  getTrainInfo(sessionName: string, playerUid: string, trainUid: string): Observable<any>{
    return this,this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train/${trainUid}`, { responseType: 'text'}); // holt infos zu einem zug
  }

  getRailInfo(sessionName: string, playerUid: string, railUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080//session/${sessionName}/player/${playerUid}/rail/${railUid}`, { responseType: 'text'}); //holt infos zur gleise
  }

  getStationInfo(sessionName: string, playerUid: string, stationUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080//session/${sessionName}/player/${playerUid}/station/${stationUid}`, { responseType: 'text'}); //holt zur bahnhöfe
  }

  getResources(sessionName: string, playerUid: string): Observable<any> {
    return this.http.get<Resources>(`http://localhost:8080/session/${sessionName}/player/${playerUid}/resource`); //holt die resources
  }

  buyTrain(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train`, null, { responseType: 'text'}); // kauft ein zug
  }

  buyRail(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/rail`, null, { responseType: 'text'}); //kauft ein gleis
  }

  buyStation(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/station`, null, { responseType: 'text'}); // kauft ein baahnhof
  }

  getSessionInfo(sessionName: string): Observable<any> {
    return this.http.get(`http://localhost:8080/session`, { responseType: 'text'}); 
  }

  getSessionPlayers(sessionName: string): Observable<Player[]> {
    return this.http.get<Player[]>(`http://localhost:8080/session/${sessionName}/GetPlayers`);
  }

  removePlayer(sessionName : String, playerUid : String) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/${playerUid}/leave`, null);
  }

  getPlayerInfos(sessionName: string, playerUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/resource `);
  }

  buyEmployee(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/employees`, null, { responseType: 'text'}); //kauft ein gleis
  }
}
