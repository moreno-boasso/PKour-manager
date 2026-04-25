import { Routes } from '@angular/router';
import { ManagerShellComponent } from '../layout/manager-shell.component';

export const routes: Routes = [
  {
    path: '',
    component: ManagerShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'spots',
        pathMatch: 'full',
      },
      {
        path: 'spots',
        loadChildren: () => import('../features/spots/spots.routes').then((m) => m.SPOTS_ROUTES),
      },
      {
        path: 'reviews',
        loadChildren: () => import('../features/reviews/reviews.routes').then((m) => m.REVIEWS_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () => import('../features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: 'tricks',
        loadChildren: () => import('../features/tricks/tricks.routes').then((m) => m.TRICKS_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/spots',
    pathMatch: 'full',
  },
];
