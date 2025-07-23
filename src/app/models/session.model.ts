import { Player } from "./player.model";

export interface Session {
    sessionName: string;
    players: Player[];
    gameState: string;
    sessionStarted: string;
    sessionEnded: string;
}
    
