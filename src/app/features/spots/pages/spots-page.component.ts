import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

type SpotStatus = 'pending' | 'approved' | 'rejected';
type SpotTypeFilter = 'all' | 'indoor' | 'outdoor';
type SpotPhotosFilter = 'all' | 'true' | 'false';

interface Spot {
  id: number;
  nome: string;
  descrizione: string | null;
  posizione: { lat: number | null; lon: number | null };
  tipo: string | null;
  status: SpotStatus;
  created_at: string | null;
  features: string[];
  photos_count: number;
  photo_cover_url: string | null;
  reviews_count: number;
  reports_count: number;
  visitors_count: number;
}

interface SpotsResponse {
  pagination?: { total?: number; page?: number; totalPages?: number };
  data: Spot[];
}

interface SpotDetail {
  id: number;
  nome: string;
  descrizione: string | null;
  posizione: { lat: number | null; lon: number | null };
  tipo: string | null;
  status: SpotStatus;
  created_at: string | null;
  features: string[];
  photos: Array<{ id: number; url: string; descrizione: string | null }>;
  reviews: Array<{ id: number; created_at: string | null; qualita: number | null; sicurezza: number | null; commento: string | null; user: { username: string | null } | null }>;
  reports: Array<{ id: number; created_at: string | null; motivo: string | null; descrizione: string | null; user: { username: string | null } | null }>;
  counters: { photos: number; reviews: number; reports: number; visitors: number } | null;
  rating: { qualita_avg: number | null; sicurezza_avg: number | null } | null;
  maps: { googleMapsUrl: string | null; googleMapsSatelliteUrl: string | null; googleEarthWebUrl: string | null; googleMapsStreetViewUrl: string | null } | null;
}

@Component({
  selector: 'app-spots-page',
  imports: [FormsModule],
  templateUrl: './spots-page.component.html',
})
export class SpotsPageComponent implements OnInit {
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected isSpotsLoading = false;
  protected isSpotActionLoading = false;
  protected spotActionTargetId: number | null = null;
  protected spotSearchText = '';
  protected selectedSpotStatus: SpotStatus = 'pending';
  protected selectedSpotType: SpotTypeFilter = 'all';
  protected selectedSpotHasPhotos: SpotPhotosFilter = 'all';
  protected spotsPage = 1;
  protected spotsPageSize = 12;
  protected spotsTotal = 0;
  protected spotsTotalPages = 1;
  protected spots: Spot[] = [];
  protected selectedSpotDetail: SpotDetail | null = null;
  protected isSpotDetailOpen = false;
  protected isSpotDetailLoading = false;

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
    private readonly utils: ManagerUtilsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadSpots();
  }

  protected get spotStatusLabel(): string {
    if (this.selectedSpotStatus === 'approved') return 'Approvati';
    if (this.selectedSpotStatus === 'rejected') return 'Rifiutati';
    return 'In attesa';
  }

  protected refreshSpots(): void {
    this.loadSpots();
  }

  protected searchSpots(): void {
    this.spotsPage = 1;
    this.loadSpots();
  }

  protected goToSpotsPage(page: number): void {
    if (page < 1 || page > this.spotsTotalPages || page === this.spotsPage) return;
    this.spotsPage = page;
    this.loadSpots();
  }

  protected formatDateTime(value: string | null): string {
    return this.utils.formatDateTime(value);
  }

  protected openSpotDetail(spot: Spot): void {
    this.isSpotDetailOpen = true;
    this.selectedSpotDetail = null;
    this.loadSpotDetail(spot.id);
  }

  protected closeSpotDetail(): void {
    this.isSpotDetailOpen = false;
    this.selectedSpotDetail = null;
  }

  protected get mapsEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}&output=embed`);
  }

  protected get satelliteEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?ll=${encodeURIComponent(`${lat},${lon}`)}&z=19&t=k&output=embed`);
  }

  protected get streetViewEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(`${lat},${lon}`)}&cbp=11,0,0,0,0&output=svembed`);
  }

  protected moderateSpot(spot: Spot, status: Extract<SpotStatus, 'approved' | 'rejected'>): void {
    if (this.isSpotActionLoading || this.spotActionTargetId !== null) return;
    if (status === 'rejected' && !window.confirm(`Confermi rifiuto spot "${spot.nome}"? Lo spot verra eliminato.`)) return;
    this.isSpotActionLoading = true;
    this.spotActionTargetId = spot.id;
    this.setStatus(status === 'approved' ? `Approvo spot "${spot.nome}"...` : `Rifiuto spot "${spot.nome}"...`, 'info');

    this.http.patch(
      this.utils.buildSpotsUrl(`${this.utils.spotsModerateEndpoint}/${spot.id}/decision`),
      { decision: status },
      { headers: this.utils.getToolHeaders() },
    ).pipe(
      timeout(15000),
      finalize(() => {
        this.isSpotActionLoading = false;
        this.spotActionTargetId = null;
        this.syncView();
      }),
    ).subscribe({
      next: () => {
        this.setStatus(status === 'approved' ? `Spot "${spot.nome}" approvato correttamente.` : `Spot "${spot.nome}" rifiutato correttamente.`, 'success');
        this.loadSpots();
        if (this.selectedSpotDetail?.id === spot.id) {
          this.loadSpotDetail(spot.id);
        }
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nella moderazione dello spot.'), 'error'),
    });
  }

  private loadSpots(): void {
    this.isSpotsLoading = true;
    const params = new URLSearchParams({
      status: this.selectedSpotStatus,
      tipo: this.selectedSpotType,
      hasPhotos: this.selectedSpotHasPhotos,
      page: String(this.spotsPage),
      pageSize: String(this.spotsPageSize),
      sortBy: 'created_at',
      order: 'desc',
    });
    const query = this.spotSearchText.trim();
    if (query) params.set('q', query);

    this.http.get<unknown>(this.utils.buildSpotsUrl(`${this.utils.spotsListEndpoint}?${params.toString()}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isSpotsLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        const normalized = this.normalizeSpotsResponse(response);
        this.spots = normalized.data;
        this.spotsTotal = normalized.total;
        this.spotsTotalPages = normalized.totalPages;
        this.spotsPage = normalized.page;
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento degli spot.'), 'error'),
    });
  }

  private normalizeSpotsResponse(response: unknown): { data: Spot[]; total: number; page: number; totalPages: number } {
    if (!response || typeof response !== 'object') return { data: [], total: 0, page: 1, totalPages: 1 };
    const parsed = response as SpotsResponse;
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const pagination = parsed.pagination ?? {};
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const page = typeof pagination.page === 'number' ? pagination.page : this.spotsPage;
    const totalPages = typeof pagination.totalPages === 'number' ? pagination.totalPages : Math.max(1, Math.ceil(total / this.spotsPageSize));
    return { data: rows, total, page, totalPages };
  }

  private loadSpotDetail(spotId: number): void {
    this.isSpotDetailLoading = true;
    this.http.get<SpotDetail>(this.utils.buildSpotsUrl(`${this.utils.spotsDetailEndpoint}/${spotId}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isSpotDetailLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        this.selectedSpotDetail = response;
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nel caricamento dettaglio spot.'), 'error'),
    });
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
    this.syncView();
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}
