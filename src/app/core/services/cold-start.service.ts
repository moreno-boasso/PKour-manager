import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, delay, of, retry, timeout } from 'rxjs';
import { ManagerUtilsService } from './manager-utils.service';

@Injectable({ providedIn: 'root' })
export class ColdStartService {
  private isBackendReady = false;
  private readonly healthCheckUrl: string;

  constructor(
    private readonly http: HttpClient,
    private readonly utils: ManagerUtilsService,
  ) {
    this.healthCheckUrl = this.utils.buildApiUrl('/api/health');
  }

  /**
   * Wake up the backend by pinging the health endpoint.
   * Should be called early in app initialization.
   */
  wakeUpBackend(): void {
    this.pingBackend();
  }

  /**
   * Returns true if backend has been successfully pinged at least once.
   */
  isBackendAwake(): boolean {
    return this.isBackendReady;
  }

  /**
   * Get retry configuration for HTTP requests.
   * Use this in pipe() for requests that might fail due to cold start.
   */
  getRetryConfig(maxRetries = 3, delayMs = 2000) {
    return {
      count: maxRetries,
      delay: delayMs,
      resetOnSuccess: true,
    };
  }

  /**
   * Wrap an HTTP observable with cold-start-aware retry logic.
   */
  withColdStartRetry<T>(observable: import('rxjs').Observable<T>, maxRetries = 3) {
    return observable.pipe(
      timeout(30000), // Longer timeout for cold start
      retry({
        count: maxRetries,
        delay: (error, retryCount) => {
          // Only retry on timeout or network errors
          if (error?.name === 'TimeoutError' || !error?.status) {
            console.log(`Cold start retry ${retryCount}/${maxRetries}...`);
            return of(null).pipe(delay(2000 * retryCount)); // Exponential backoff
          }
          throw error;
        },
      }),
      catchError((error) => {
        if (error?.name === 'TimeoutError') {
          throw new Error('Il server sta "svegliandosi" dopo un periodo di inattività. Riprova tra qualche secondo.');
        }
        throw error;
      }),
    );
  }

  private pingBackend(): void {
    console.log('Waking up backend...');

    this.http.get(this.healthCheckUrl, { headers: this.utils.getToolHeaders() })
      .pipe(
        timeout(45000), // Long timeout for cold start (Render can take 30-40s)
        retry({
          count: 5,
          delay: (error, retryCount) => {
            console.log(`Backend wake-up attempt ${retryCount}/5...`);
            return of(null).pipe(delay(3000));
          },
        }),
        catchError((error) => {
          console.warn('Backend wake-up failed:', error);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log('Backend is awake!', response);
            this.isBackendReady = true;
          }
        },
        error: () => {
          // Even if wake-up fails, subsequent requests might work
          this.isBackendReady = false;
        },
      });
  }
}
