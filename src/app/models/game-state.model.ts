import { Train } from "./train.model";
import { Player } from "./player.model";
import { Railway } from "./railway.model";
import { TrainStation } from "./trainStation.model";

export interface GameState {
  trains: Train[];
  rails: Railway[];
  stations: TrainStation[];
  users: Player[];
  accountBalance: number;
  runtime: number;
}
