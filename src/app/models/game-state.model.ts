import { Train } from "./train.model";
import { Player } from "./player.model";
import { Rail } from "./railway.model";
import { Station } from "./trainStation.model";
import { NumberSymbol } from "@angular/common";

export interface GameState {
  users: Player[];
  runtime: number;
}
