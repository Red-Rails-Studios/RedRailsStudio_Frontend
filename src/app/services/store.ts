import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { SessionOverview } from "../models/sessionOverview.model";
import { concat, concatMap } from "rxjs";
import { Rail } from "../models/rail.model";
import { Station } from "../models/station.model";
import { GameState } from "../models/game-state.model";
import { Player } from "../models/player.model";

@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0,
        trainDtos: [],
        railDtos:[],
        stationDtos:[]
    })

    // map = signal<Map>({
    //     map: [] as Map
    // })

    sessionInfo = signal<SessionOverview>({
        sessionName: '',
        players: [] as Player[],
        gameState: {} as GameState,
        sessionStarted: '',
        sessionEnded: ''
    })

    playerInfo = signal<Player>({ 
        uId: '',
        name: '',
        trains: [] as Train[],
        rails: [] as Rail[],
        stations: [] as Station[],
        employees: 0,
        dbCoin: 0,
        power: 0
    })

    gamestate = signal<GameState>({
        users: [] as Player[],
        runtime: 0
    })

    session = signal<SessionOverview | null>(null);
    apiService = inject(APISService)
    playerUid = signal<string | null>(null);
    sessionName = signal<string | null>(null); 
    playerName = signal<string | null>(null);

    setPlayerUid(uid: string) {
        this.playerUid.set(uid);
        this.playerInfo().uId = uid;
    }

    setSessionName(name: string) { 
        this.sessionName.set(name);
        this.sessionInfo().sessionName = name;
    }

    setPlayerName(name: string) {
        this.playerName.set(name);
        this.playerInfo().name = name;
    }

    setResources(sessionName: string, playerUid: string) {
        this.apiService.getResources(sessionName, playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    getPlayerInfos(sessionName: string, playerUid: string) {
        this.apiService.getPlayerInfos(sessionName, playerUid).subscribe((playerInfo: Player) => {
            this.playerInfo.set(playerInfo);
            console.log('PlayerInfos set', this.playerInfo().name, this.playerInfo().uId, this.playerInfo().trains);
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
                console.log('SessionOverview created and player joined:', res, sessionName);
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
        this.apiService.startSession(sessionName).subscribe((res: SessionOverview) => {
            this.sessionInfo.set(res);
            console.log('Session Started ', sessionName);
        })
        this.getPlayerInfos(sessionName, this.playerInfo().uId)
    }

    killSession (sessionName: string) {
        this.apiService.killSession(sessionName).subscribe((res: SessionOverview) => {
            this.session.set(res);
            console.log('Session Killed');
        });
    }

    getTrain (sessionName: string, playerName: string, trainUid: string) {
        this.apiService.getTrainInfo(sessionName, playerName, trainUid).subscribe((res: Player) => {
            console.log('')
        })
    }

    buyTrain(sessionName: string, playerUid: string) {
        this.apiService.buyTrain(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying train:', err);
            }
        });
    }

    upgradeTrain(sessionName: string, playerUid: string, trainId: string) {
         this.apiService.upgradeTrain(sessionName, playerUid, trainId).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error upgrading train', err);
            }
        });
    }

    setSessionInfo(sessionName: string){
        this.apiService.getSessionInfo(sessionName).subscribe((res: SessionOverview) => {
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

    buyRail(sessionName: string, playerUid: string) {
        this.apiService.buyRail(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying station:', err);
            }
        });
    }

    buyStation(sessionName: string, playerUid: string) {
        this.apiService.buyStation(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying station:', err);
            }
        });
    }

    buyEmployee(sessionName: string, playerUid: string) {
        this.apiService.buyEmployee(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying employee:', err);
            }
        });
    }
}