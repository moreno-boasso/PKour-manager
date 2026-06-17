import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminUser } from '../../shared/models/admin.model';

interface LoginResponse {
  user: AdminUser;
  sessionToken?: string;
  idToken?: string;
}

interface SessionResponse {
  user: AdminUser;
}

const AUTH_TOKEN_KEY = 'pkour_admin_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _currentUser = signal<AdminUser | null>(null);
  private readonly _loading = signal(false);
  private _authToken: string | null = null;

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  readonly loading = this._loading.asReadonly();

  getAuthToken(): string | null {
    if (this._authToken) {
      return this._authToken;
    }

    for (const storage of [localStorage, sessionStorage]) {
      try {
        const token = storage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          this._authToken = token;
          return token;
        }
      } catch {
        // storage blocked (e.g. iOS private mode)
      }
    }

    return null;
  }

  private setAuthToken(token: string | null): void {
    this._authToken = token;

    for (const storage of [localStorage, sessionStorage]) {
      try {
        if (token) {
          storage.setItem(AUTH_TOKEN_KEY, token);
        } else {
          storage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        // in-memory token still works for the current tab session
      }
    }
  }

  private authHeaders(): HttpHeaders {
    const token = this.getAuthToken();
    if (!token) {
      return new HttpHeaders();
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this._loading.set(true);
    this.setAuthToken(null);

    return this.http
      .post<LoginResponse>(
        `${environment.apiBaseUrl}/api/admin/login`,
        { email, password },
        { withCredentials: true },
      )
      .pipe(
        tap((res) => {
          const token = res.sessionToken ?? res.idToken ?? null;
          this._currentUser.set(res.user);
          this.setAuthToken(token);
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
      .post<void>(
        `${environment.apiBaseUrl}/api/admin/logout`,
        {},
        { withCredentials: true, headers: this.authHeaders() },
      )
      .pipe(
        tap(() => {
          this.clearUser();
          this.router.navigate(['/login']);
        }),
        catchError(() => {
          this.clearUser();
          this.router.navigate(['/login']);
          return throwError(() => new Error('Logout failed'));
        }),
      );
  }

  clearUser(): void {
    this._currentUser.set(null);
    this.setAuthToken(null);
  }

  checkSession(): Observable<SessionResponse> {
    return this.http
      .get<SessionResponse>(
        `${environment.apiBaseUrl}/api/admin/session`,
        { withCredentials: true, headers: this.authHeaders() },
      )
      .pipe(
        tap((res) => this._currentUser.set(res.user)),
        catchError((err) => {
          this.clearUser();
          return throwError(() => err);
        }),
      );
  }

  authenticatedRequestOptions(): { withCredentials: true; headers: HttpHeaders } {
    return {
      withCredentials: true,
      headers: this.authHeaders(),
    };
  }
}
