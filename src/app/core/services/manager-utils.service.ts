import { Injectable } from '@angular/core';
import { getRuntimeEnv } from '../../runtime-env';

const AUTH_TOKEN_KEY = 'pkour_manager_token';

@Injectable({ providedIn: 'root' })
export class ManagerUtilsService {
  private readonly env = getRuntimeEnv();

  readonly apiBaseUrl = this.env.apiBaseUrl;
  readonly spotsListEndpoint = this.env.spotsListEndpoint;
  readonly spotsModerateEndpoint = this.env.spotsModerateEndpoint;
  readonly spotsDetailEndpoint = this.env.spotsDetailEndpoint;
  readonly reviewsListEndpoint = this.env.reviewsListEndpoint;
  readonly reviewsModerateEndpoint = this.env.reviewsModerateEndpoint;
  readonly reportsListEndpoint = this.env.reportsListEndpoint;
  readonly reportsModerateEndpoint = this.env.reportsModerateEndpoint;
  readonly bugReportsListEndpoint = this.env.bugReportsListEndpoint;
  readonly bugReportsModerateEndpoint = this.env.bugReportsModerateEndpoint;
  readonly photosListEndpoint = this.env.photosListEndpoint;
  readonly photosModerateEndpoint = this.env.photosModerateEndpoint;
  readonly tricksWriteEndpoint = this.env.tricksWriteEndpoint;
  readonly tricksDeleteEndpoint = this.env.tricksDeleteEndpoint;

  buildApiUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = this.apiBaseUrl.replace(/\/+$/, '');
    const p = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${p}`;
  }

  buildSpotsUrl(pathOrUrl: string): string {
    return this.buildApiUrl(pathOrUrl);
  }

  getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  getToolHeaders(): Record<string, string> {
    return this.getAuthHeaders();
  }

  saveToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
  }

  extractHttpError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const errName = (error as { name?: string }).name;
      if (errName === 'TimeoutError') {
        return 'Timeout richiesta: il backend non ha risposto in tempo.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: { error?: string } }).error;
      if (body?.error) {
        return body.error;
      }
    }
    return fallback;
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return 'n/d';
    }
    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return value;
    }
    return asDate.toLocaleString('it-IT');
  }
}
