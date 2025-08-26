import { Train } from "./train.model";
import { Player } from "./player.model";
import { Rail } from "./rail.model";
import { Station } from "./station.model";
import { NumberSymbol } from "@angular/common";

export interface GameState {
  users: Player[];
  runtime: number;
}
