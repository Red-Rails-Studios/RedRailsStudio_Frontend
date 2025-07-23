import { Router, Routes } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { GamepageComponent } from './pages/gamepage/gamepage.component';

import { AppComponent } from './app.component';
import { ResourcesComponent } from './components/resources/resources.component';
import { LobbypageComponent } from './pages/lobbypage/lobbypage.component';

export const routes: Routes = [
  { path: 'home', component: HomepageComponent }, // Default route
  { path: 'game', component: GamepageComponent },
  { path: 'lobby', component: LobbypageComponent },
  { path: '**', redirectTo: 'home' } // Fallback route
];
