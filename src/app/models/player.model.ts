import { Rail } from "./railway.model";
import { Train } from "./train.model";
import { Station } from "./trainStation.model";

export interface Player {
  uid: string;
  name: string;

  trains: Train[];
  rails: Rail[];
  stations: Station[];

  employees: number;
  dbCoin: number;
  power: number;

}
