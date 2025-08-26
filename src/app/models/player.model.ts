import { Station } from "./station.model";
import { Train } from "./train.model";
import { Rail } from "./rail.model";

export interface Player {
  uid: string;
  name: string;

  dbCoin: number;
  employees: number;
  power: number;

  stations: Station[];
  trains: Train[];
  rails: Rail[];
}
