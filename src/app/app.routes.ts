import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./core/layout/shell/shell.component').then(m => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'tricks',
        loadComponent: () => import('./features/tricks/tricks-list/tricks-list.component').then(m => m.TricksListComponent),
      },
      {
        path: 'spots',
        loadComponent: () => import('./features/spots/spots-moderation/spots-moderation.component').then(m => m.SpotsModerationComponent),
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/reviews/reviews-moderation/reviews-moderation.component').then(m => m.ReviewsModerationComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-moderation/reports-moderation.component').then(m => m.ReportsModerationComponent),
      },
      {
        path: 'photos',
        loadComponent: () => import('./features/photos/photos-moderation/photos-moderation.component').then(m => m.PhotosModerationComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
