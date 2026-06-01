import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ManagerUtilsService } from '../services/manager-utils.service';

export const authGuard: CanActivateFn = () => {
  const utils = inject(ManagerUtilsService);
  const router = inject(Router);

  if (utils.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
