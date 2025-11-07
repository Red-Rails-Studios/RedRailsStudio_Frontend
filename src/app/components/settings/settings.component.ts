import { Component, OnInit, inject } from '@angular/core';
import { Store } from '../../services/store';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  playerInfo = inject(Store).playerInfo;
  
  constructor(public store: Store) {}

  ngOnInit(): void {

  }

  sessionKill(){

  }
}

