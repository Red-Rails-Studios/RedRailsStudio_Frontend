import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MapComponent } from '../../components/map/map.component';
import { SettingsComponent } from '../../components/settings/settings.component';
import { UpgradesComponent } from '../../components/upgrades/upgrades.component';
import { ResourcesComponent } from '../../components/resources/resources.component';

@Component({
  selector: 'app-gamepage',
  standalone: true,
  imports: [MapComponent, ResourcesComponent, SettingsComponent, UpgradesComponent, CommonModule],
  templateUrl: './gamepage.component.html',
  styleUrl: './gamepage.component.scss'
})
export class GamepageComponent {
activeTab = 1;

trains = [ {id: 1, name: "", type: ""} ];
resources = [ {}, {} ];
connections = [ { id: 1, from: "", to: ""} ];

showDropdown = false;
  onSettings() {
    // Handle settings click
  }
  onExit() {
    // Handle logout click
  }
}