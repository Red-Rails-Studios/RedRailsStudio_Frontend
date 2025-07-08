import { inject, Injectable, signal } from "@angular/core";
import { Resources } from "../models/resources.model";
import { APISService } from "./apis.service";
import { Train } from "../models/train.model";
import { Store } from "./store.model";


@Injectable({
  providedIn: 'root' //Für die ganze anwendung erreichbar
})
export class Store {
    resources = signal<Resources>( {
        dbCoin: 0,
        employees: 0,
        power:0 
    })

    train = signal<Train>({
        id: 0,
        name:``,
        type:``,
        level: 0,
        production: ``,
    })

    apiService = inject(APISService)

    setResources(sessionName: string, playerUid: string){
        this.apiService.getResources(sessionName,playerUid).subscribe((resources: Resources) => {
            this.resources.set(resources)
            console.log('Resources updated:', this.resources());})
    }

    // getTrainInfo(sessionName: string, playerUid: string, trainUid: string) {
    //     this.apiService.getTrainInfo(sessionName, playerUid, trainUid).subscribe((train: Train) => {
    //         this.train.set(train)
    //         console.log('trainsInfo', this.train());
    // } )}
}