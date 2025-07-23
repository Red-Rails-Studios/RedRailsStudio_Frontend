import { Train } from "./train.model";
import { iUser } from "./player.model";
export interface GameState {
  trains: Train[];
  accountBalance: number;
  runtime: number;
  users: iUser[];
}
