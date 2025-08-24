import { Station } from "./station.model";

export interface Location {
    type: string;
    name: string;
    customers: number;
    station: Station;
    x: number;
    y: number;
}
