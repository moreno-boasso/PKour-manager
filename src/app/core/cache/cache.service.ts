import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL_MS = 30_000; // 30 secondi di default

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Wrapper per Observable con cache
  wrap<T>(key: string, observable: Observable<T>, ttlMs?: number): Observable<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return of(cached);
    }

    return observable.pipe(
      tap((data) => this.set(key, data, ttlMs))
    );
  }
}
