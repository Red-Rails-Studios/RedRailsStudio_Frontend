import { Player } from "./player.model";
import { GameState } from "./game-state.model";

export interface Session {
    sessionName: string;
    players: Player[];
    gameState: GameState;
    sessionStarted: string;
    sessionEnded: string;
}
    
