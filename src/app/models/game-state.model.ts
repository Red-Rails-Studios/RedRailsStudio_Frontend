import { Train } from "./train.model";
import { iUser } from "./user.model";
export interface GameState {
  trains: Train[];
  accountBalance: number;
  runtime: number;
  users: iUser[];
}
