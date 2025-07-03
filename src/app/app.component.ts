import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GamepageComponent } from './pages/gamepage/gamepage.component';
import { HomepageComponent } from './pages/homepage/homepage.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HomepageComponent, GamepageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'rrs_frontend';
}