import { Requirements } from "./requierment.model";

export interface Rail {
  uId: string;
  level: number;
  requirements: Requirements[]; 
}
