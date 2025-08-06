import { Player } from "./player.model";

export interface SessionOverview {
    sessionName: string;
    players: Player[];
    gameState: string;
    sessionStarted: string;
    sessionEnded: string;
}
    
