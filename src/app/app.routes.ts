import { Router, Routes } from '@angular/router';
import { HomepageComponent } from './pages/homepage/homepage.component';
import { GamepageComponent } from './pages/gamepage/gamepage.component';

import { AppComponent } from './app.component';
import { ResoursesComponent } from './components/resources/resources.component';

export const routes: Routes = [
  { path: '', component: HomepageComponent }, // Default route
  { path: 'game', component: GamepageComponent },
  { path: '**', redirectTo: '' } // Fallback route
];
