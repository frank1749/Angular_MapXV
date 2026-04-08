import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/map-view/map-view.component').then((m) => m.MapViewComponent),
  },
];
