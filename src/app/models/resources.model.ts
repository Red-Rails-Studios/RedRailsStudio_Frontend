import { Rail } from "./rail.model";
import { Train } from "./train.model";
import { Station } from "./station.model";

export interface Resources {
  color: '';
  dbCoin: number;
  employees: number;
  power: number;
  trainDtos: Train[],
  railDtos: Rail[],
  stationDtos: Station[]
}
