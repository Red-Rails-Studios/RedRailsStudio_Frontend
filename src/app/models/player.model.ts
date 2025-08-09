import { Railway } from "./railway.model";
import { Train } from "./train.model";
import { TrainStation } from "./trainStation.model";

export interface Player {
  uid: string;
  name: string;
  trains: Train[];
  rails: Railway[];
  stations: TrainStation[];
  accountBalance: number;
  runtime: number;
}
