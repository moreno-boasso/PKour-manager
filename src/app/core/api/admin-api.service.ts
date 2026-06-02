import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminSpot,
  AdminSpotDetail,
  ManagerPhoto,
  ManagerReport,
  ManagerReview,
  ManagerStats,
  ModerationStatus,
  PaginatedResponse,
} from '../../shared/models/admin.model';
import { CacheService } from '../cache/cache.service';

export type SortField = 'created_at' | 'updated_at' | 'nome' | 'qualita' | 'sicurezza' | 'motivo' | 'id';
export type SortOrder = 'asc' | 'desc';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly cache = inject(CacheService);
  private readonly CACHE_TTL = 30_000; // 30s per liste
  private readonly DETAIL_CACHE_TTL = 60_000; // 60s per dettagli

  getStats(): Observable<ManagerStats> {
    return this.cache.wrap(
      'stats',
      this.http.get<ManagerStats>(`${this.base}/api/manager/stats`),
      this.CACHE_TTL
    );
  }

  getReviews(
    status: ModerationStatus,
    limit: number,
    offset: number,
    spotId?: number,
    sortBy: SortField = 'created_at',
    sortOrder: SortOrder = 'desc',
    q?: string
  ): Observable<PaginatedResponse<ManagerReview>> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', limit)
      .set('offset', offset)
      .set('sort_by', sortBy)
      .set('sort_order', sortOrder);
    if (spotId) params = params.set('spot_id', spotId);
    if (q) params = params.set('q', q);
    const cacheKey = `reviews-${status}-${limit}-${offset}-${spotId || 'all'}-${sortBy}-${sortOrder}-${q || ''}`;
    return this.cache.wrap(
      cacheKey,
      this.http.get<PaginatedResponse<ManagerReview>>(`${this.base}/api/manager/reviews`, { params }),
      this.CACHE_TTL
    );
  }

  patchReviewStatus(userId: string, spotId: number, status: ModerationStatus): Observable<unknown> {
    // Invalida cache reviews dopo modifica
    return this.http.patch(`${this.base}/api/manager/reviews/${userId}/${spotId}/status`, { status }).pipe(
      tap(() => this.cache.invalidate('reviews-'))
    );
  }

  deleteReview(userId: string, spotId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/reviews/${userId}/${spotId}`);
  }

  getReports(
    status: string,
    limit: number,
    offset: number,
    sortBy: SortField = 'created_at',
    sortOrder: SortOrder = 'desc',
    q?: string
  ): Observable<PaginatedResponse<ManagerReport>> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', limit)
      .set('offset', offset)
      .set('sort_by', sortBy)
      .set('sort_order', sortOrder);
    if (q) params = params.set('q', q);
    const cacheKey = `reports-${status}-${limit}-${offset}-${sortBy}-${sortOrder}-${q || ''}`;
    return this.cache.wrap(
      cacheKey,
      this.http.get<PaginatedResponse<ManagerReport>>(`${this.base}/api/manager/reports`, { params }),
      this.CACHE_TTL
    );
  }

  patchReportStatus(id: number, status: string): Observable<unknown> {
    return this.http.patch(`${this.base}/api/manager/reports/${id}/status`, { status }).pipe(
      tap(() => this.cache.invalidate('reports-'))
    );
  }

  deleteReport(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/reports/${id}`).pipe(
      tap(() => this.cache.invalidate('reports-'))
    );
  }

  getPhotos(
    status: ModerationStatus,
    limit: number,
    offset: number,
    sortBy: SortField = 'created_at',
    sortOrder: SortOrder = 'desc',
    q?: string
  ): Observable<PaginatedResponse<ManagerPhoto>> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', limit)
      .set('offset', offset)
      .set('sort_by', sortBy)
      .set('sort_order', sortOrder);
    if (q) params = params.set('q', q);
    const cacheKey = `photos-${status}-${limit}-${offset}-${sortBy}-${sortOrder}-${q || ''}`;
    return this.cache.wrap(
      cacheKey,
      this.http.get<PaginatedResponse<ManagerPhoto>>(`${this.base}/api/manager/photos`, { params }),
      this.CACHE_TTL
    );
  }

  patchPhotoStatus(id: number, status: ModerationStatus): Observable<unknown> {
    return this.http.patch(`${this.base}/api/manager/photos/${id}/status`, { status }).pipe(
      tap(() => this.cache.invalidate('photos-'))
    );
  }

  bulkPatchPhotoStatus(ids: number[], status: ModerationStatus): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.base}/api/manager/photos/bulk-status`, { ids, status }).pipe(
      tap(() => this.cache.invalidate('photos-'))
    );
  }

  deletePhoto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/photos/${id}`).pipe(
      tap(() => this.cache.invalidate('photos-'))
    );
  }

  getSpots(
    status: ModerationStatus,
    limit: number,
    offset: number,
    q?: string,
    sortBy: SortField = 'created_at',
    sortOrder: SortOrder = 'desc'
  ): Observable<PaginatedResponse<AdminSpot>> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', limit)
      .set('offset', offset)
      .set('sort_by', sortBy)
      .set('sort_order', sortOrder);
    if (q) params = params.set('q', q);
    const cacheKey = `spots-${status}-${limit}-${offset}-${q || 'all'}-${sortBy}-${sortOrder}`;
    return this.cache.wrap(
      cacheKey,
      this.http.get<PaginatedResponse<AdminSpot>>(`${this.base}/api/admin/spots`, { params }),
      this.CACHE_TTL
    );
  }

  getSpotDetail(id: number): Observable<AdminSpotDetail> {
    return this.cache.wrap(
      `spot-detail-${id}`,
      this.http.get<AdminSpotDetail>(`${this.base}/api/admin/spots/${id}`),
      this.DETAIL_CACHE_TTL
    );
  }

  patchSpotStatus(id: number, status: ModerationStatus): Observable<AdminSpotDetail> {
    return this.http.patch<AdminSpotDetail>(`${this.base}/api/admin/spots/${id}/status`, { status }).pipe(
      tap(() => {
        this.cache.invalidate(`spot-detail-${id}`);
        this.cache.invalidate('spots-');
        this.cache.invalidate('stats');
      })
    );
  }

  deleteSpot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/admin/spots/${id}`).pipe(
      tap(() => {
        this.cache.invalidate(`spot-detail-${id}`);
        this.cache.invalidate('spots-');
        this.cache.invalidate('stats');
      })
    );
  }
}
