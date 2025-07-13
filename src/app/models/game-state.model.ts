import { Train } from "./train.model";
import { iUser } from "./player.model";
import { Railway } from "./railway.model";
import { TrainStation } from "./trainStation.model";

export interface GameState {
  trains: Train[];
  rails: Railway[];
  stations: TrainStation[];
  users: iUser[];
  accountBalance: number;
  runtime: number;
}
