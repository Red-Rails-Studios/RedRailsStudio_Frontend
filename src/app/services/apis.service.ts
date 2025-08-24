import { Injectable } from '@angular/core';
import { Resources } from '../models/resources.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player.model';


@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class APISService {
  private apiUrl = 'http://localhost:8080'; // URL to web api

  constructor(private http: HttpClient) {

  }

  postNewPlayer(sessionName: string, playerName: string) {
    return this.http.post<{ name: string; uid: string }>(`http://localhost:8080/session/${sessionName}/${playerName}`, null);
  }

  removePlayer(sessionName : String, playerUid : String) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/${playerUid}/leave`, null);
  }

  getPlayerInfos(sessionName: string, playerUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/resource `);
  }

  startSession(sessionName: string): Observable<any> {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/start`, null); //startet  session
  }

  createSession(sessionName: string): Observable<any> {
    return this.http.post(`http://localhost:8080/session/${sessionName}`, null, { responseType: 'text'}); //creates session
  }

  killSession(sessionName: string): Observable<any> {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/kill`, null, { responseType: 'text'}); //kills session
  }

  getSessionInfo(sessionName: string): Observable<any> {
    return this.http.get(`http://localhost:8080/session`, { responseType: 'text'}); 
  }

  getSessionPlayers(sessionName: string): Observable<Player[]> {
    return this.http.get<Player[]>(`http://localhost:8080/session/${sessionName}/GetPlayers`);
  }

  getResources(sessionName: string, playerUid: string): Observable<any> {
    return this.http.get<Resources>(`http://localhost:8080/session/${sessionName}/player/${playerUid}/resource`); //holt die resources
  }

  getTrainInfo(sessionName: string, playerUid: string, trainUid: string): Observable<any> {
    return this,this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train/${trainUid}`, { responseType: 'text'}); // holt infos zu einem zug
  }

  buyTrain(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train`, null, { responseType: 'text'}); // kauft ein zug
  }

  upgradeTrain(sessionName: string, playerUid: string, trainUid: string) {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train/${trainUid}/upgrade`, null, {responseType: 'text'})
  }

  getRailInfo(sessionName: string, playerUid: string, railUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080//session/${sessionName}/player/${playerUid}/rail/${railUid}`, { responseType: 'text'}); //holt infos zur gleise
  }

  buyRail(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/rail`, null, { responseType: 'text'}); //kauft ein gleis
  }

  upgradeRail(sessionName: string, playerUid:string, railId: string) {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/player/${playerUid}/rail/${railId}/upgrade`, null, {responseType: 'text'})
  }

  getStationInfo(sessionName: string, playerUid: string, stationUid: string): Observable<any> {
    return this.http.get(`http://localhost:8080//session/${sessionName}/player/${playerUid}/station/${stationUid}`, { responseType: 'text'}); //holt zur bahnhöfe
  }

  buyStation(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/station`, null, { responseType: 'text'}); // kauft ein baahnhof
  }

  upgradeStation(sessionName: string, playerUid: string, stationId: string) {
    return this.http.patch(`http://localhost:8080/session/${sessionName}/player/${playerUid}/station/${stationId}/upgrade`, null, {responseType: 'text'})
  }

  buyEmployee(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/employees`, null, { responseType: 'text'}); //kauft ein gleis
  }

  buyPower(sessionName: string, playerUid: string) {
    return this.http.post(`http://localhost:8080/session/${sessionName}/player/${playerUid}/power`, null, {responseType: 'text'});
  }

  buyRequirements(sessionName: string, playerUid: string) {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/buy/getRequirements`);
  }

  requirementRails(sessionName: string, playerUid: string) {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/rails/getUpgradeRequirements`);
  }

  requirementStations(sessionName: string, playerUid: string) {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/station/getUpgradeRequirements`);
  }

  requirementTrain(sessionName: string, playerUid: string) {
    return this.http.get(`http://localhost:8080/session/${sessionName}/player/${playerUid}/train/getUpgradeRequirements`);
  }
}
