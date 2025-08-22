import { Rail } from "./railway.model";
import { Train } from "./train.model";
import { Station } from "./trainStation.model";

export interface Resources {
  dbCoin: number;
  employees: number;
  power: number;
  trainDtos: Train[],
  railDtos: Rail[],
  stationDtos: Station[]
}
