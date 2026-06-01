import { Routes } from '@angular/router';
import { ManagerShellComponent } from '../layout/manager-shell.component';
import { LoginPageComponent } from '../features/auth/login-page.component';
import { authGuard } from '../core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: '',
    component: ManagerShellComponent,
    canActivate: [authGuard],
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
        path: 'photos',
        loadChildren: () => import('../features/photos/photos.routes').then((m) => m.PHOTOS_ROUTES),
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
        path: 'bug-reports',
        loadChildren: () => import('../features/bug-reports/bug-reports.routes').then((m) => m.BUG_REPORTS_ROUTES),
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
