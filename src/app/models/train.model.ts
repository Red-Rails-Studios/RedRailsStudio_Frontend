import { Requirements } from "./requierment.model";

export interface Train {
  uId: string;
  level: number;
  requirements: Requirements[]; 
}
