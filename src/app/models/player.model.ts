import { Station } from "./station.model";
import { Train } from "./train.model";
import { Rail } from "./rail.model";
import { Requirements } from "./requierment.model";

export interface Player {
  uId: string;
  name: string;
  color?: string;

  dbCoin: number;
  employees: number;
  power: number;

  stations: Station[];
  trains: Train[];
  rails: Rail[];
}
