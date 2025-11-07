import { Requirements } from "./requierment.model";

export interface Rail {
  uid: string;
  level: number;
  requirements: Requirements[]; 
}
