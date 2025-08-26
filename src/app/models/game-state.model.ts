import { Player } from "./player.model";

export interface GameState {
  users: Player[];
  runtime: number;
}
