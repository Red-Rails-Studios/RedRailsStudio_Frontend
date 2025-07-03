import { Component } from '@angular/core';
import { MapComponent } from '../../components/map/map.component';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [MapComponent], // Add MapComponent here
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent {}
