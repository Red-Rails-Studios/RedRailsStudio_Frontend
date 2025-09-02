import { Requirements } from "./requierment.model";

export interface Train {
  uid: string;
  level: number;
  requirements: Requirements[]; 
}
