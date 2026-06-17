import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUser } from '../../shared/models/admin.model';

interface LoginResponse {
  user: AdminUser;
  sessionToken?: string;
}

interface SessionResponse {
  user: AdminUser;
}

const SESSION_TOKEN_KEY = 'pkour_admin_session_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<AdminUser | null>(null);
  private readonly _loading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly loading = this._loading.asReadonly();

  getSessionToken(): string | null {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private setSessionToken(token: string | null): void {
    try {
      if (token) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch {
      // sessionStorage unavailable (e.g. private mode restrictions)
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this._loading.set(true);
    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/api/admin/login`, { email, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._currentUser.set(res.user);
          if (res.sessionToken) {
            this.setSessionToken(res.sessionToken);
          }
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
      .post<void>(`${environment.apiBaseUrl}/api/admin/logout`, {}, this.authenticatedRequestOptions())
      .pipe(
        tap(() => {
          this.clearUser();
          this.router.navigate(['/login']);
        }),
        catchError((err) => {
          this.clearUser();
          this.router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
  }

  clearUser(): void {
    this._currentUser.set(null);
    this.setSessionToken(null);
  }

  checkSession(): Observable<SessionResponse> {
    return this.http
      .get<SessionResponse>(`${environment.apiBaseUrl}/api/admin/session`, this.authenticatedRequestOptions())
      .pipe(
        tap((res) => this._currentUser.set(res.user)),
        catchError((err) => {
          this.clearUser();
          return throwError(() => err);
        }),
      );
  }

  authenticatedRequestOptions(): { withCredentials: true; headers?: { Authorization: string } } {
    const token = this.getSessionToken();
    if (!token) {
      return { withCredentials: true };
    }

    return {
      withCredentials: true,
      headers: { Authorization: `Bearer ${token}` },
    };
  }
}
