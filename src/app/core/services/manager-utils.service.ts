import { Injectable } from '@angular/core';
import { getRuntimeEnv } from '../../runtime-env';

@Injectable({ providedIn: 'root' })
export class ManagerUtilsService {
  private readonly env = getRuntimeEnv();

  readonly apiBaseUrl = this.env.apiBaseUrl;
  readonly spotsApiBaseUrl = this.env.spotsApiBaseUrl || this.env.apiBaseUrl;
  readonly spotsListEndpoint = this.env.spotsListEndpoint;
  readonly spotsModerateEndpoint = this.env.spotsModerateEndpoint;
  readonly spotsDetailEndpoint = this.env.spotsDetailEndpoint;
  readonly reviewsListEndpoint = this.env.reviewsListEndpoint;
  readonly reviewsModerateEndpoint = this.env.reviewsModerateEndpoint;
  readonly reportsListEndpoint = this.env.reportsListEndpoint;
  readonly reportsModerateEndpoint = this.env.reportsModerateEndpoint;
  readonly tricksWriteEndpoint = this.env.tricksWriteEndpoint;
  readonly tricksDeleteEndpoint = this.env.tricksDeleteEndpoint;
  readonly localToolSecret = this.env.localToolSecret;

  buildApiUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = this.apiBaseUrl.replace(/\/+$/, '');
    const path = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  buildSpotsUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = this.spotsApiBaseUrl.replace(/\/+$/, '');
    const path = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  getToolHeaders(): Record<string, string> {
    if (!this.localToolSecret) {
      return {};
    }
    return {
      'x-local-tool-secret': this.localToolSecret,
    };
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
