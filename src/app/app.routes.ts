import { Router, Routes } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { GamepageComponent } from './pages/gamepage/gamepage.component';

import { AppComponent } from './app.component';
import { ResourcesComponent } from './components/resources/resources.component';
import { LobbypageComponent } from './pages/lobbypage/lobbypage.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' }, 
  { path: 'home', component: HomepageComponent },
  { path: 'game', component: GamepageComponent },
  { path: 'lobby', component: LobbypageComponent },
  { path: '**', redirectTo: 'home' }
];
