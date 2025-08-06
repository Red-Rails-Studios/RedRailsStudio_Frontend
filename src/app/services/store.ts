import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { Session } from "../models/sessionOverview.model";
import { concat, concatMap } from "rxjs";


@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0 
    })

    session = signal<Session | null>(null);
    apiService = inject(APISService)
    playerUid = signal<string | null>(null);
    sessionName = signal<string | null>(null); 
    playerName = signal<string | null>(null);

    setPlayerUid(uid: string) {
        this.playerUid.set(uid);
    }

    setSessionName(name: string) { 
        this.sessionName.set(name);
    }

    setPlayerName(name: string) {
        this.playerName.set(name);
    }

    setResources(sessionName: string, playerUid: string){
        this.apiService.getResources(sessionName,playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    createSessionAndJoinFirstPlayer(sessionName: string, playerName: string) {
        this.apiService.createSession(sessionName).pipe(
            concatMap(() => this.apiService.postNewPlayer(sessionName, playerName))
        ).subscribe({
            next: (res: { name: string; uid: string }) => {
                this.setPlayerUid(res.uid);
                this.setSessionName(sessionName);
                // Optionally fetch session info here if needed
                console.log('Session created and player joined:', res);
            },
            error: (err) => {
                console.error('Error creating session and joining player:', err);
            }
        });
    }

    joinPlayer(sessionName: string, playerName: string) {
        this.apiService.postNewPlayer(sessionName, playerName).subscribe({
            next: (res: { name: string; uid: string }) => {
                this.setPlayerUid(res.uid);
                this.setSessionName(sessionName);
                // Optionally fetch session info here if needed
                console.log('Player Joined:', res);
            },
            error: (err) => {
                console.error('Error joining player:', err);
            }
        });
    }

    startSession(sessionName: string,) {
        this.apiService.startSession(sessionName).subscribe((res: Session) => {
            this.session.set(res);
            console.log('Session Started');
        })
    }

    killSession (sessionName: string) {
        this.apiService.killSession(sessionName).subscribe((res: Session) => {
            this.session.set(res);
            console.log('Session Killed');
        });
    }

    // getTrainInfo(sessionName: string, playerUid: string, trainUid: string) {
    //     this.apiService.getTrainInfo(sessionName, playerUid, trainUid).subscribe((train: Train) => {
    //         this.train.set(train)
    //         console.log('trainsInfo', this.train());
    // } )}
}