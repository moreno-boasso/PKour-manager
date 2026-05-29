import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

type ModerationStatus = 'pending' | 'approved' | 'rejected';
type PhotoFilterStatus = 'pending' | 'approved';

interface ModerationPhoto {
  id: number;
  url: string;
  descrizione: string | null;
  status: ModerationStatus;
  created_at: string | null;
  uploader: {
    user_id: string | null;
    nome: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  spot: {
    id: number;
    nome: string | null;
    tipo: string | null;
    status: ModerationStatus | null;
    posizione: { lat: number | null; lon: number | null };
    maps: {
      googleMapsUrl: string | null;
      googleMapsSatelliteUrl: string | null;
      googleEarthWebUrl: string | null;
      googleMapsStreetViewUrl: string | null;
    } | null;
  };
}

interface PhotosResponse {
  pagination?: { total?: number; page?: number; totalPages?: number };
  data: ModerationPhoto[];
}

@Component({
  selector: 'app-photos-page',
  imports: [FormsModule],
  templateUrl: './photos-page.component.html',
})
export class PhotosPageComponent implements OnInit {
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected photoSearchText = '';
  protected selectedPhotoStatus: PhotoFilterStatus = 'pending';
  protected photosPage = 1;
  protected photosPageSize = 12;
  protected photosTotal = 0;
  protected photosTotalPages = 1;
  protected photos: ModerationPhoto[] = [];
  protected isPhotosLoading = false;
  protected isPhotoActionLoading = false;
  protected photoActionTargetId: number | null = null;
  protected selectedPhoto: ModerationPhoto | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
    private readonly utils: ManagerUtilsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadPhotos();
  }

  protected get photoStatusLabel(): string {
    if (this.selectedPhotoStatus === 'approved') return 'Approvate';
    return 'In attesa';
  }

  protected refreshPhotos(): void {
    this.loadPhotos();
  }

  protected searchPhotos(): void {
    this.photosPage = 1;
    this.loadPhotos();
  }

  protected goToPhotosPage(page: number): void {
    if (page < 1 || page > this.photosTotalPages || page === this.photosPage) return;
    this.photosPage = page;
    this.loadPhotos();
  }

  protected formatDateTime(value: string | null): string {
    return this.utils.formatDateTime(value);
  }

  protected uploaderLabel(photo: ModerationPhoto): string {
    return photo.uploader.username?.trim()
      ? `@${photo.uploader.username.trim()}`
      : (photo.uploader.nome?.trim() || photo.uploader.user_id?.trim() || 'utente sconosciuto');
  }

  protected spotLabel(photo: ModerationPhoto): string {
    return photo.spot.nome?.trim() || `Spot #${photo.spot.id}`;
  }

  protected selectPhoto(photo: ModerationPhoto): void {
    this.selectedPhoto = photo;
  }

  protected closeSelectedPhoto(): void {
    this.selectedPhoto = null;
  }

  protected openPhotoInNewTab(url: string): void {
    const normalizedUrl = url.trim();
    if (!normalizedUrl) return;
    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  protected moderatePhoto(photo: ModerationPhoto, status: Extract<ModerationStatus, 'approved' | 'rejected'>): void {
    if (this.isPhotoActionLoading || this.photoActionTargetId !== null) return;
    this.isPhotoActionLoading = true;
    this.photoActionTargetId = photo.id;
    this.setStatus(status === 'approved' ? `Approvo foto #${photo.id}...` : `Rifiuto foto #${photo.id}...`, 'info');

    this.http.patch(
      this.utils.buildSpotsUrl(`${this.utils.photosModerateEndpoint}/${photo.id}/decision`),
      { decision: status },
      { headers: this.utils.getToolHeaders() },
    ).pipe(
      timeout(15000),
      finalize(() => {
        this.isPhotoActionLoading = false;
        this.photoActionTargetId = null;
        this.syncView();
      }),
    ).subscribe({
      next: () => {
        this.setStatus(status === 'approved' ? `Foto #${photo.id} approvata correttamente.` : `Foto #${photo.id} rifiutata correttamente.`, 'success');
        this.loadPhotos();
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nella moderazione della foto.'), 'error'),
    });
  }

  protected get mapsEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedPhoto?.spot.posizione.lat;
    const lon = this.selectedPhoto?.spot.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}&output=embed`);
  }

  protected get satelliteEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedPhoto?.spot.posizione.lat;
    const lon = this.selectedPhoto?.spot.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?ll=${encodeURIComponent(`${lat},${lon}`)}&z=19&t=k&output=embed`);
  }

  protected get streetViewEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedPhoto?.spot.posizione.lat;
    const lon = this.selectedPhoto?.spot.posizione.lon;
    if (lat == null || lon == null) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(`${lat},${lon}`)}&cbp=11,0,0,0,0&output=svembed`);
  }

  private loadPhotos(): void {
    this.isPhotosLoading = true;
    const params = new URLSearchParams({
      status: this.selectedPhotoStatus,
      page: String(this.photosPage),
      pageSize: String(this.photosPageSize),
      sortBy: 'created_at',
      order: 'desc',
    });
    const query = this.photoSearchText.trim();
    if (query) params.set('q', query);

    this.http.get<unknown>(this.utils.buildSpotsUrl(`${this.utils.photosListEndpoint}?${params.toString()}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isPhotosLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        const normalized = this.normalizePhotosResponse(response);
        this.photos = normalized.data;
        this.photosTotal = normalized.total;
        this.photosTotalPages = normalized.totalPages;
        this.photosPage = normalized.page;
        if (this.selectedPhoto) {
          this.selectedPhoto = normalized.data.find((row) => row.id === this.selectedPhoto!.id) ?? null;
        }
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento delle foto.'), 'error'),
    });
  }

  private normalizePhotosResponse(response: unknown): { data: ModerationPhoto[]; total: number; page: number; totalPages: number } {
    if (!response || typeof response !== 'object') return { data: [], total: 0, page: 1, totalPages: 1 };
    const parsed = response as PhotosResponse;
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const pagination = parsed.pagination ?? {};
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const page = typeof pagination.page === 'number' ? pagination.page : this.photosPage;
    const totalPages = typeof pagination.totalPages === 'number' ? pagination.totalPages : Math.max(1, Math.ceil(total / this.photosPageSize));
    return { data: rows, total, page, totalPages };
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
