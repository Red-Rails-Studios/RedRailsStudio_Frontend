import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-resources',
  imports: [CommonModule],
  templateUrl: './resources.component.html',
  styleUrl: './resources.component.scss'
})
export class ResourcesComponent {
  resources = [
    { name: 'Electricity', icon: '', amount: 100 },
    { name: 'Employees', icon: '', amount: 100 },
  ];
}
//TODO Logic