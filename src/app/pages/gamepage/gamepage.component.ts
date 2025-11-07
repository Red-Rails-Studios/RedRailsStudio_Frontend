import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MapComponent } from '../../components/map/map.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { UpgradesComponent } from '../../components/railsandstations/railsandstations.component';
import { ResourcesComponent } from '../../components/resources/resources.component';
import { TrainsComponent } from "../../components/trains/trains.component";
import { EmployeesComponent } from '../../employees/employees.component';
import { Store } from '../../services/store'; 

@Component({
  selector: 'app-gamepage',
  standalone: true,
  imports: [MapComponent, ResourcesComponent,EmployeesComponent, SettingsComponent, UpgradesComponent, CommonModule, TrainsComponent],
  templateUrl: './gamepage.component.html',
  styleUrl: './gamepage.component.scss'
})
export class GamepageComponent {
  playerInfo = inject(Store).playerInfo;
  sessionName = inject(Store).sessionName;

  constructor(public store: Store) {}

  activeTab = 1;

  trains = [ {id: 1, name: "", type: ""} ];
  resources = [ {}, {} ];
  connections = [ { id: 1, from: "", to: ""} ];

  showDropdown = false;
  onSettings() {
    const sessionName = this.store.sessionName();
    const playerName = this.store.playerInfo().name;

  }
  onExit() {
    // Handle logout click
  }
}