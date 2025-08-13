import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { Session } from "../models/session.model";
import { concat, concatMap } from "rxjs";
import { Railway } from "../models/railway.model";
import { TrainStation } from "../models/trainStation.model";
import { GameState } from "../models/game-state.model";
import { Player } from "../models/player.model";

@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0 
    })

    sessionInfo = signal<Session>({
        sessionName: '',
        players: [] as Player[],
        gameState: {} as GameState,
        sessionStarted: '',
        sessionEnded: ''
    })

    playerInfo = signal<Player>({ 
        uid: '',
        name: '',
        trains: [] as Train[],
        rails: [] as Railway[],
        stations: [] as TrainStation[],
        accountBalance: 0,
        runtime: 0
    })

    gamestate = signal<GameState>({
        users: [] as Player[],
        runtime: 0
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

    setResources(sessionName: string, playerUid: string) {
        this.apiService.getResources(sessionName, playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    getPlayerInfos(sessionName: string, playerUid: string) {
        this.apiService.getPlayerInfos(sessionName, playerUid).subscribe((playerInfo: Player) => {
            this.playerInfo.set(playerInfo);
            console.log('PlayerInfos set', this.playerInfo());
        });
    }

    createSessionAndJoinFirstPlayer(sessionName: string, playerName: string) {
        this.apiService.createSession(sessionName).pipe(
            concatMap(() => this.apiService.postNewPlayer(sessionName, playerName))
        ).subscribe({
            next: (res: { name: string; uid: string }) => {
                this.setPlayerUid(res.uid);
                this.setSessionName(sessionName);
                // Optionally fetch session info here if needed
                console.log('Session created and player joined:', res, sessionName);
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
            this.sessionInfo.set(res);
            console.log('Session Started');
        })
        this.getPlayerInfos(sessionName, this.playerInfo().uid)
    }

    killSession (sessionName: string) {
        this.apiService.killSession(sessionName).subscribe((res: Session) => {
            this.session.set(res);
            console.log('Session Killed');
        });
    }

    getTrain (sessionName: string, playerName: string, trainUid: string) {
        this.apiService.getTrainInfo(sessionName, playerName, trainUid).subscribe((res: Player) => {
            console.log('')
        })
    }

    buyTrain(sessionName: string, playerName: string) {
        this.apiService.buyTrain(sessionName, playerName);
    }

    setSessionInfo(sessionName: string){
        this.apiService.getSessionInfo(sessionName).subscribe((res: Session) => {
            this.sessionInfo.set(res);
            console.log('SessionInfos set');
        });
    }

    getSessionPlayers(sessionName: string) {
    this.apiService.getSessionPlayers(sessionName).subscribe((players: Player[]) => {
        this.sessionInfo.update(session => ({
            ...session,
            players: players
        }));
    });
}
}