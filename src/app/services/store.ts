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
import { Requirements } from "../models/requierment.model";

@Injectable({
  providedIn: 'root'
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0,
        trainDtos: [] as Train[],
        railDtos:[] as Rail[],
        stationDtos:[] as Station[]
    })

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

    upgradeResourcesTrain = signal<Requirements[]>([{
        uId: '',
        requiredDbCoin: 0,
        requiredEmployees: 0,
        requiredPower: 0
    }]);

    session = signal<SessionOverview | null>(null);
    apiService = inject(APISService)
    playerUid = signal<string | null>(null);
    sessionName = signal<string | null>(null);
    playerName = signal<string | null>(null);
    //upgradeResourcesStation = signal<Requirements[]>(null);

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

    setResources(sessionName: string, playerUid: string) {
        this.apiService.getResources(sessionName, playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources);
            console.log('Resources updated:', this.resources());
        })
    }

    joinPlayer(sessionName: string, playerName: string) {
        this.apiService.postNewPlayer(sessionName, playerName).subscribe({
            next: (res: { name: string; uid: string }) => {
                this.setPlayerUid(res.uid);
                this.setSessionName(sessionName);
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

    buyRequirements(sessionName: string, playerUid: string) {
        this.apiService.buyRequirements(sessionName, playerUid);
    }

    getTrain (sessionName: string, playerName: string, trainUid: string) {
        this.apiService.getTrainInfo(sessionName, playerName, trainUid).subscribe((res: Player) => {
            console.log('');
        })
    }

    buyTrain(sessionName: string, playerUid: string) {
        console.log('Store.buyTrain called with', { sessionName, playerUid });
        if (!sessionName) {
            console.error('buyTrain aborted: sessionName is undefined');
            return;
        }
        if (!playerUid) {
            console.error('buyTrain aborted: playerUid is undefined');
            return;
        }

        this.apiService.buyTrain(sessionName, playerUid).subscribe({
            next: () => {
                console.log('buyTrain API call succeeded, refreshing player infos');
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

    getUpgradeRequirementsTrain(sessionName: string, playerUid: string){
        this.apiService.upgradeRequirementsTrain(sessionName, playerUid).subscribe({
            next: (requirements: Requirements[]) => {
            this.upgradeResourcesTrain.set(requirements);
            console.log('got upgrade reqiirments', requirements)
        },
        error: (err) => {
        console.error('Error fetching train upgrades:', err);
        }   
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

    upgradeRail(sessionName: string, playerUid: string, railId: string) {
         this.apiService.upgradeRail(sessionName, playerUid, railId).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error upgrading rail', err);
            }
        });
    }

    // upgradeRequirementsRail(sessionName: string, playerUid: string, railId: string) {
    //     this.apiService.upgradeRequirementsRail(sessionName, playerUid, railId)
    //       .subscribe((upgradeResourcesRail: Requirements[]) => {
    //           this.upgradeResourcesRail.set(upgradeResourcesRail);
    //       }, (err) => {
    //           console.error('Error fetching rail requirements', err);
    //       });
    // }

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

    upgradeStation(sessionName: string, playerUid: string, stationId: string) {
        this.apiService.upgradeStation(sessionName, playerUid, stationId).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error upgrading station', err);
            }
        });
    }

    // upgradeRequirementsStation(sessionName: string, playerUid: string, stationId: string) {
    //    this.apiService.upgradeRequirementsStation(sessionName, playerUid, stationId)
    //       .subscribe((upgradeResourcesStation: Requirements[]) => {
    //           this.upgradeResourcesStation.set(upgradeResourcesStation);
    //       }, (err) => {
    //           console.error('Error fetching station requirements', err);
    //       });
    // }

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

    buyPower(sessionName: string, playerUid: string) {
        if (!sessionName || !playerUid) {
            console.error('buyPower aborted: sessionName or playerUid missing');
            return;
        }
        this.apiService.buyPower(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying power:', err);
            }
        });
    }
}