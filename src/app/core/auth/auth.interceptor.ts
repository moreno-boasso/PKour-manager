import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const cloned = req.clone({ withCredentials: true });

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401 && !req.url.includes('/api/admin/login')) {
        auth.clearUser();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
