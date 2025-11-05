import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { SessionOverview } from "../models/sessionOverview.model";
import { concatMap } from "rxjs";
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
        color: '',
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
        uid: '',
        name: '',
        color: '',
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
    }])

    upgradeResourcesRail = signal<Requirements[]>([{
        uId: '',
        requiredDbCoin: 0,
        requiredEmployees: 0,
        requiredPower: 0
    }])

    upgradeResourcesStation = signal<Requirements[]>([{
        uId: '',
        requiredDbCoin: 0,
        requiredEmployees: 0,
        requiredPower: 0
    }])

    elementBuyRequirements = signal<Requirements[]>([{
        requiredEmployees: 0,
        uId: '',
        requiredPower: 0,
        requiredDbCoin: 0
    }])


    session = signal<SessionOverview | null>(null);
    apiService = inject(APISService);
    playerUid = signal<string | null>(null);
    sessionName = signal<string | null>(null);
    playerName = signal<string | null>(null);
    freePower = signal<number | null>(null);
    freeEmployee = signal<number | null>(null);

    setPlayerUid(uid: string) {
        this.playerUid.set(uid);
        this.playerInfo().uid = uid;
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
            this.setPlayerUid(playerUid);
            this.setSessionName(sessionName);
            console.log('PlayerInfos set', this.playerName, this.playerUid);
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
            console.log('Resources updated:', this.resources(), this.resources().trainDtos[0].uid);
        })
        console.log(this.resources().trainDtos[0]);
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
        this.getPlayerInfos(sessionName, this.playerInfo().uid)
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

    getBuyRequirements(sessionName: string, playerUid: string){
        this.apiService.buyRequirements(sessionName, playerUid).subscribe({
            next: (requirements: Requirements[]) => {
            this.elementBuyRequirements.set(requirements);
            //console.log('got upgrade reqiirments train', requirements)
        },
        error: (err) => {
        console.error('Error fetching train upgrades:', err);
        }
        });
    }


    getTrain (sessionName: string, playerName: string, trainUid: string) {
        this.apiService.getTrainInfo(sessionName, playerName, trainUid).subscribe((res: Player) => {
            
        })
    }

    buyTrain(sessionName: string, playerUid: string) {
        //console.log('Store.buyTrain called with', { sessionName, playerUid });
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
                //alert("not enough resources");
            }
        });
    }

    upgradeTrain(sessionName: string, playerUid: string, trainNr: number) {//trainId: string) {
         this.apiService.upgradeTrain(sessionName, playerUid, this.resources().trainDtos[trainNr].uid).subscribe({
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
            //console.log('got upgrade reqiirments train', requirements)
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
                //alert("not enough resources");
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

    getUpgradeRequirementsRail(sessionName: string, playerUid: string){
        this.apiService.upgradeRequirementsRail(sessionName, playerUid).subscribe({
            next: (requirements: Requirements[]) => {
            this.upgradeResourcesRail.set(requirements);
            //console.log('got upgrade reqirments rail', requirements)
        },
        error: (err) => {
        console.error('Error fetching rail upgrades:', err);
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
                //alert("not enough resources");
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

    getUpgradeRequirementsStation(sessionName: string, playerUid: string) {
        this.apiService.upgradeRequirementsStation(sessionName, playerUid)
            .subscribe((upgradeResourcesStation: Requirements[]) => {
               this.upgradeResourcesStation.set(upgradeResourcesStation);
            }, (err) => {
               console.error('Error fetching station requirements', err);
            });
    }

    buyEmployee(sessionName: string, playerUid: string) {
        if (!sessionName || !playerUid) {
            console.error('buyEmployee aborted: sessionName or playerUid missing');
            return;
        }
        this.apiService.buyEmployee(sessionName, playerUid).subscribe({
            next: () => {
                this.getPlayerInfos(sessionName, playerUid);
            },
            error: (err) => {
                console.error('Error buying employee:', err);
            }
        });
    }

    updateEmployee(sessionName: string, playerUid: string){
        this.apiService.getEmployee(sessionName, playerUid).subscribe({
        next: (employees: number) => {
            this.freeEmployee.set(employees);
        },
        error: (err) => {
            console.error('Error getting employee count:', err);
            //this.freeEmployee.set(0); 
        }});
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

    updatePower(sessionName: string, playerUid: string){
        this.apiService.getPower(sessionName, playerUid).subscribe({
        next: (power: number) => {
            this.freePower.set(power);
        },
        error: (err) => {
            console.error('Error getting power count:', err);
            //this.freePower.set(0); 
        }});
    }
}
