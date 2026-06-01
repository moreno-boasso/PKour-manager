import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUser } from '../../shared/models/admin.model';

interface LoginResponse {
  user: AdminUser;
}

interface SessionResponse {
  user: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<AdminUser | null>(null);
  private readonly _loading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly loading = this._loading.asReadonly();

  login(email: string, password: string): Observable<LoginResponse> {
    this._loading.set(true);
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/api/admin/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._currentUser.set(res.user);
          this._loading.set(false);
        }),
        catchError((err) => {
          this._loading.set(false);
          return throwError(() => err);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${environment.apiBaseUrl}/api/admin/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this._currentUser.set(null);
          this.router.navigate(['/login']);
        }),
        catchError((err) => {
          this._currentUser.set(null);
          this.router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
  }

  clearUser(): void {
    this._currentUser.set(null);
  }

  checkSession(): Observable<SessionResponse> {
    return this.http
      .get<SessionResponse>(`${environment.apiBaseUrl}/api/admin/session`, { withCredentials: true })
      .pipe(
        tap((res) => this._currentUser.set(res.user)),
        catchError((err) => {
          this._currentUser.set(null);
          return throwError(() => err);
        }),
      );
  }
}
