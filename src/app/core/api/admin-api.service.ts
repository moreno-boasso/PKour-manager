import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getStats(): Observable<ManagerStats> {
    return this.http.get<ManagerStats>(`${this.base}/api/manager/stats`);
  }

  getReviews(status: ModerationStatus, limit: number, offset: number, spotId?: number): Observable<PaginatedResponse<ManagerReview>> {
    let params = new HttpParams().set('status', status).set('limit', limit).set('offset', offset);
    if (spotId) params = params.set('spot_id', spotId);
    return this.http.get<PaginatedResponse<ManagerReview>>(`${this.base}/api/manager/reviews`, { params });
  }

  patchReviewStatus(userId: string, spotId: number, status: ModerationStatus): Observable<unknown> {
    return this.http.patch(`${this.base}/api/manager/reviews/${userId}/${spotId}/status`, { status });
  }

  deleteReview(userId: string, spotId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/reviews/${userId}/${spotId}`);
  }

  getReports(status: string, limit: number, offset: number): Observable<PaginatedResponse<ManagerReport>> {
    const params = new HttpParams().set('status', status).set('limit', limit).set('offset', offset);
    return this.http.get<PaginatedResponse<ManagerReport>>(`${this.base}/api/manager/reports`, { params });
  }

  patchReportStatus(id: number, status: string): Observable<unknown> {
    return this.http.patch(`${this.base}/api/manager/reports/${id}/status`, { status });
  }

  deleteReport(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/reports/${id}`);
  }

  getPhotos(status: ModerationStatus, limit: number, offset: number): Observable<PaginatedResponse<ManagerPhoto>> {
    const params = new HttpParams().set('status', status).set('limit', limit).set('offset', offset);
    return this.http.get<PaginatedResponse<ManagerPhoto>>(`${this.base}/api/manager/photos`, { params });
  }

  patchPhotoStatus(id: number, status: ModerationStatus): Observable<unknown> {
    return this.http.patch(`${this.base}/api/manager/photos/${id}/status`, { status });
  }

  bulkPatchPhotoStatus(ids: number[], status: ModerationStatus): Observable<{ updated: number }> {
    return this.http.patch<{ updated: number }>(`${this.base}/api/manager/photos/bulk-status`, { ids, status });
  }

  deletePhoto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/photos/${id}`);
  }

  getSpots(status: ModerationStatus, limit: number, offset: number, q?: string): Observable<PaginatedResponse<AdminSpot>> {
    let params = new HttpParams()
      .set('status', status)
      .set('limit', limit)
      .set('offset', offset);
    if (q) params = params.set('q', q);
    return this.http.get<PaginatedResponse<AdminSpot>>(`${this.base}/api/admin/spots`, { params });
  }

  getSpotDetail(id: number): Observable<AdminSpotDetail> {
    return this.http.get<AdminSpotDetail>(`${this.base}/api/admin/spots/${id}`);
  }

  patchSpotStatus(id: number, status: ModerationStatus): Observable<AdminSpotDetail> {
    return this.http.patch<AdminSpotDetail>(`${this.base}/api/admin/spots/${id}/status`, { status });
  }

  deleteSpot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/admin/spots/${id}`);
  }
}
