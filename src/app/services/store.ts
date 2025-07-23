import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { Session } from "../models/session.model";
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

    setPlayerUid(uid: string) {
        this.playerUid.set(uid);
    }

    setSessionName(name: string) { 
        this.sessionName.set(name);
    }

    setResources(sessionName: string, playerUid: string){
        this.apiService.getResources(sessionName,playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    createSessionAndJoinFirstPlayer(sessionName: string, playerName: string) {
        this.apiService.createSession(sessionName).pipe(
            concatMap(() => this.apiService.postNewPlayer(sessionName, playerName))
        ).subscribe((res: Session) => {
            this.session.set(res);
            console.log('Session created and player joined:', this.session());
        })
    }

    joinPlayer(sessionName: string, playerName: string) {
        this.apiService.postNewPlayer(sessionName, playerName).subscribe((res: Session) => {
            this.session.set(res);
            console.log('Player Joined');
        })
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