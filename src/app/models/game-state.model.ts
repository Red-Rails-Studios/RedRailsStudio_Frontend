import { Train } from "./train.model";
import { Player } from "./player.model";
import { Railway } from "./railway.model";
import { TrainStation } from "./trainStation.model";
import { NumberSymbol } from "@angular/common";

export interface GameState {
  users: Player[];
  runtime: number;
}
