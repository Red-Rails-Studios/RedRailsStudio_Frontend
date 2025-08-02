import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { Session } from "../models/session.model";
import { concat, concatMap } from "rxjs";
import { TrainsInfo } from "../models/trainsInfo.model"; 
import { Railway } from "../models/railway.model";
import { TrainStation } from "../models/trainStation.model";
import { GameState } from "../models/game-state.model";


@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0 
    })

    trainsInfo = signal<TrainsInfo>({
        total_trains: 0,
        total_passengers: 0,
        total_railways: 0
    })

    playerInfo = signal<GameState>({
        trains: [] as Train[],
        rails: [] as Railway[],
        stations: [] as TrainStation[],
        users: [],
        accountBalance: 0,
        runtime: 0
    })

    session = signal<Session | null>(null);
    apiService = inject(APISService)

    setResources(sessionName: string, playerUid: string) {
        this.apiService.getResources(sessionName, playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    setTrainInfo(sessionName: string, playerUid: string) {
        this.apiService.getPlayerInfos(sessionName, playerUid).subscribe((trainsInfo: TrainsInfo) => {
            this.trainsInfo.set(trainsInfo)
            console.log('TrainInfos updated:', this.trainsInfo)
        })
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

    getTrain (sessionName: string, playerName: string, trainUid: string) {
        this.apiService.getTrainInfo(sessionName, playerName, trainUid).subscribe((res: TrainsInfo) => {
            console.log('')
        })
    }

    // getTrainInfo(sessionName: string, playerUid: string, trainUid: string) {
    //     this.apiService.getPlayerInfo(sessionName, playerUid).subscribe((train: Train) => {
    //         this.train.set(train)
    //         console.log('trainsInfo', this.train());
    // } )}
}