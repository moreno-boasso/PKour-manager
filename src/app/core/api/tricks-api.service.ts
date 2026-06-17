import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse, Trick } from '../../shared/models/admin.model';

export interface CreateTrickPayload {
  id: string;
  nome: string;
  difficolta: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  tags?: string[];
  required?: string[];
}

@Injectable({ providedIn: 'root' })
export class TricksApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getTricks(limit: number, offset: number, q?: string, difficolta?: string, tag?: string): Observable<PaginatedResponse<Trick>> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (q) params = params.set('q', q);
    if (difficolta) params = params.set('difficolta', difficolta);
    if (tag) params = params.set('tag', tag);
    const url = q ? `${this.base}/api/tricks/search` : `${this.base}/api/tricks`;
    return this.http.get<PaginatedResponse<Trick>>(url, { params });
  }

  patchTrick(id: string, data: Partial<Trick>): Observable<Trick> {
    return this.http.patch<Trick>(`${this.base}/api/manager/tricks/${id}`, data);
  }

  createTrick(data: CreateTrickPayload): Observable<Trick> {
    return this.http.post<Trick>(`${this.base}/api/manager/tricks`, data);
  }

  deleteTrick(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/manager/tricks/${id}`);
  }
}
