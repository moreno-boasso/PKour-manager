import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, timeout } from 'rxjs';
import { getRuntimeEnv } from './runtime-env';

interface Trick {
  id: string;
  nome: string;
  difficolta: string;
  video_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  required: string[];
  quality: TrickQuality;
}

interface TricksResponse {
  data: Trick[];
}

interface UpsertTrickResponse {
  trick: Trick;
}

interface DeleteTrickResponse {
  deleted: {
    id: string;
    nome: string;
  };
}

type ManagerModuleKey = 'spots' | 'tricks';

interface MenuItem {
  key: ManagerModuleKey | 'photos' | 'reviews' | 'reports' | 'accounts';
  label: string;
  enabled: boolean;
}

type SpotStatus = 'pending' | 'approved' | 'rejected';
type SpotTypeFilter = 'all' | 'indoor' | 'outdoor';
type SpotPhotosFilter = 'all' | 'true' | 'false';

interface Spot {
  id: number;
  nome: string;
  descrizione: string | null;
  posizione: {
    lat: number | null;
    lon: number | null;
  };
  tipo: string | null;
  status: SpotStatus;
  created_at: string | null;
  aggiunto_da: {
    user_id: string;
    nome: string | null;
    username: string | null;
  } | null;
  features: string[];
  photos_count: number;
  photo_cover_url: string | null;
  reviews_count: number;
  reports_count: number;
  visitors_count: number;
}

interface SpotsResponse {
  pagination?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
  data: Spot[];
}

interface SpotDetailPhoto {
  id: number;
  url: string;
  descrizione: string | null;
  uploaded_by_user_id: string | null;
  created_at: string | null;
}

interface SpotDetailInteraction {
  id: number;
  created_at: string | null;
  status: SpotStatus;
}

interface SpotDetail {
  id: number;
  nome: string;
  descrizione: string | null;
  posizione: {
    lat: number | null;
    lon: number | null;
  };
  tipo: string | null;
  status: SpotStatus;
  created_at: string | null;
  features: string[];
  aggiunto_da: {
    user_id: string;
    nome: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  photos: SpotDetailPhoto[];
  reviews: Array<
    SpotDetailInteraction & {
      user: {
        user_id: string;
        nome: string | null;
        username: string | null;
      } | null;
      qualita: number | null;
      sicurezza: number | null;
      commento: string | null;
    }
  >;
  reports: Array<
    SpotDetailInteraction & {
      user: {
        user_id: string;
        nome: string | null;
        username: string | null;
      } | null;
      motivo: string | null;
      descrizione: string | null;
    }
  >;
  counters: {
    photos: number;
    reviews: number;
    reports: number;
    visitors: number;
  } | null;
  rating: {
    qualita_avg: number | null;
    sicurezza_avg: number | null;
  } | null;
  maps: {
    googleMapsUrl: string | null;
    googleMapsSatelliteUrl: string | null;
    googleEarthWebUrl: string | null;
    googleMapsStreetViewUrl: string | null;
  } | null;
}

type TrickIssueCode =
  | 'missing_name'
  | 'unknown_difficulty'
  | 'missing_video'
  | 'video_not_previewable'
  | 'missing_thumbnail'
  | 'thumbnail_invalid_url'
  | 'thumbnail_unreachable';

interface TrickQuality {
  level: 'ok' | 'warn' | 'critical';
  issues: TrickIssueCode[];
}

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected readonly menuItems: MenuItem[] = [
    { key: 'spots', label: 'Approvazione Spot', enabled: true },
    { key: 'photos', label: 'Approvazione Foto', enabled: false },
    { key: 'reviews', label: 'Approvazione Recensioni', enabled: false },
    { key: 'reports', label: 'Approvazione Segnalazioni', enabled: false },
    { key: 'tricks', label: 'Gestione Tricks', enabled: true },
    { key: 'accounts', label: 'Gestione Account', enabled: false },
  ];

  protected readonly difficultyOptions = ['base', 'intermedio', 'avanzato', 'esperto', 'maestro'];
  protected readonly spotStatusOptions: SpotStatus[] = ['pending', 'approved', 'rejected'];

  protected apiBaseUrl = '';
  protected spotsApiBaseUrl = '';
  protected spotsListEndpoint = '';
  protected spotsModerateEndpoint = '';
  protected spotsDetailEndpoint = '';
  protected tricksWriteEndpoint = '';
  protected tricksDeleteEndpoint = '';
  protected localToolSecret = '';

  protected activeModule: ManagerModuleKey = 'spots';
  protected isSidebarOpen = false;
  protected isLoading = false;
  protected isSaving = false;
  protected isDeleting = false;
  protected isSpotsLoading = false;
  protected isSpotActionLoading = false;
  protected spotActionTargetId: number | null = null;
  protected isModalOpen = false;
  protected isCreateMode = false;
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';

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

  protected searchText = '';
  protected selectedDifficulty = '';
  protected filterOnlyIssues = false;
  protected filterMissingThumbnail = false;
  protected filterMissingVideo = false;
  protected filterVideoNotPreviewable = false;
  protected filterBrokenThumbnail = false;

  protected tricks: Trick[] = [];
  protected filteredTricks: Trick[] = [];
  protected selectedTrickId: string | null = null;

  protected formId = '';
  protected formNome = '';
  protected formDifficolta = 'base';
  protected formVideoUrl = '';
  protected formThumbnailUrl = '';
  protected formTags = '';
  protected formRequired = '';
  private hasLoadedTricks = false;
  private readonly thumbnailReachability = new Map<string, boolean>();
  private readonly thumbnailProbeInFlight = new Set<string>();
  private readonly thumbnailProbeTimeoutMs = 5000;

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const runtimeEnv = getRuntimeEnv();
    this.apiBaseUrl = runtimeEnv.apiBaseUrl;
    this.spotsApiBaseUrl = runtimeEnv.spotsApiBaseUrl || runtimeEnv.apiBaseUrl;
    this.spotsListEndpoint = runtimeEnv.spotsListEndpoint;
    this.spotsModerateEndpoint = runtimeEnv.spotsModerateEndpoint;
    this.spotsDetailEndpoint = runtimeEnv.spotsDetailEndpoint;
    this.tricksWriteEndpoint = runtimeEnv.tricksWriteEndpoint;
    this.tricksDeleteEndpoint = runtimeEnv.tricksDeleteEndpoint;
    this.localToolSecret = runtimeEnv.localToolSecret;
    this.loadSpots();
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  protected closeSidebarOnMobile(): void {
    this.isSidebarOpen = false;
  }

  protected selectModule(item: MenuItem): void {
    if (!item.enabled || (item.key !== 'spots' && item.key !== 'tricks')) {
      return;
    }

    this.activeModule = item.key;
    this.closeSidebarOnMobile();

    if (item.key === 'spots') {
      this.loadSpots();
      return;
    }

    if (!this.hasLoadedTricks) {
      this.loadTricks();
    }
  }

  protected get activeModuleTitle(): string {
    return this.activeModule === 'spots' ? 'Approvazione Spot' : 'Gestione Tricks';
  }

  protected get spotStatusLabel(): string {
    switch (this.selectedSpotStatus) {
      case 'approved':
        return 'Approvati';
      case 'rejected':
        return 'Rifiutati';
      default:
        return 'In attesa';
    }
  }

  protected refreshSpots(): void {
    this.loadSpots();
  }

  protected searchSpots(): void {
    this.spotsPage = 1;
    this.loadSpots();
  }

  protected goToSpotsPage(page: number): void {
    if (page < 1 || page > this.spotsTotalPages || page === this.spotsPage) {
      return;
    }
    this.spotsPage = page;
    this.loadSpots();
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

  protected formatDateTime(value: string | null): string {
    if (!value) {
      return 'n/d';
    }
    const asDate = new Date(value);
    if (Number.isNaN(asDate.getTime())) {
      return value;
    }
    return asDate.toLocaleString('it-IT');
  }

  protected get mapsEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) {
      return null;
    }
    const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lon}`)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected get satelliteEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) {
      return null;
    }
    const url = `https://www.google.com/maps?ll=${encodeURIComponent(`${lat},${lon}`)}&z=19&t=k&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected get streetViewEmbedPreviewUrl(): SafeResourceUrl | null {
    const lat = this.selectedSpotDetail?.posizione.lat;
    const lon = this.selectedSpotDetail?.posizione.lon;
    if (lat == null || lon == null) {
      return null;
    }
    const url = `https://www.google.com/maps?q=&layer=c&cbll=${encodeURIComponent(`${lat},${lon}`)}&cbp=11,0,0,0,0&output=svembed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  protected moderateSpot(spot: Spot, status: Extract<SpotStatus, 'approved' | 'rejected'>): void {
    if (this.isSpotActionLoading || this.spotActionTargetId !== null) {
      return;
    }

    if (status === 'rejected') {
      const confirmed = window.confirm(`Confermi rifiuto spot "${spot.nome}"? Lo spot verra eliminato.`);
      if (!confirmed) {
        return;
      }
    }

    this.isSpotActionLoading = true;
    this.spotActionTargetId = spot.id;
    this.setStatus(
      status === 'approved' ? `Approvo spot "${spot.nome}"...` : `Rifiuto spot "${spot.nome}"...`,
      'info',
    );

    this.http
      .patch(
        this.buildSpotsUrl(`${this.spotsModerateEndpoint}/${spot.id}/decision`),
        { decision: status },
        {
          headers: this.getToolHeaders(),
        },
      )
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isSpotActionLoading = false;
          this.spotActionTargetId = null;
          this.syncView();
        }),
      )
      .subscribe({
        next: () => {
          this.setStatus(
            status === 'approved'
              ? `Spot "${spot.nome}" approvato correttamente.`
              : `Spot "${spot.nome}" rifiutato correttamente.`,
            'success',
          );
          this.loadSpots();
          if (this.selectedSpotDetail?.id === spot.id) {
            this.loadSpotDetail(spot.id);
          }
        },
        error: (error) => {
          this.setStatus(this.extractHttpError(error, 'Errore nella moderazione dello spot.'), 'error');
          this.syncView();
        },
      });
  }

  protected applyFilters(): void {
    const search = this.searchText.trim().toLowerCase();
    const selectedDiff = this.selectedDifficulty.trim().toLowerCase();

    this.filteredTricks = this.tricks.filter((trick) => {
      const byDifficulty = !selectedDiff || trick.difficolta.toLowerCase() === selectedDiff;
      const bySearch =
        !search ||
        trick.id.toLowerCase().includes(search) ||
        trick.nome.toLowerCase().includes(search) ||
        (trick.tags ?? []).some((tag) => tag.toLowerCase().includes(search));
      const byIssues = !this.filterOnlyIssues || trick.quality.issues.length > 0;
      const byMissingThumbnail =
        !this.filterMissingThumbnail ||
        trick.quality.issues.includes('missing_thumbnail') ||
        trick.quality.issues.includes('thumbnail_invalid_url') ||
        trick.quality.issues.includes('thumbnail_unreachable');
      const byMissingVideo = !this.filterMissingVideo || trick.quality.issues.includes('missing_video');
      const byVideoNotPreviewable =
        !this.filterVideoNotPreviewable || trick.quality.issues.includes('video_not_previewable');
      const byBrokenThumbnail =
        !this.filterBrokenThumbnail ||
        trick.quality.issues.includes('thumbnail_invalid_url') ||
        trick.quality.issues.includes('thumbnail_unreachable');
      return (
        byDifficulty &&
        bySearch &&
        byIssues &&
        byMissingThumbnail &&
        byMissingVideo &&
        byVideoNotPreviewable &&
        byBrokenThumbnail
      );
    });
  }

  protected openEditModal(trick: Trick): void {
    this.isCreateMode = false;
    this.isModalOpen = true;
    this.selectTrick(trick);
  }

  protected openCreateModal(): void {
    this.isCreateMode = true;
    this.isModalOpen = true;
    this.startNewTrick();
  }

  protected closeModal(): void {
    // Emergency escape hatch: never trap the user in modal.
    this.isSaving = false;
    this.isDeleting = false;
    this.isModalOpen = false;
  }

  private selectTrick(trick: Trick): void {
    this.selectedTrickId = trick.id;
    this.formId = trick.id;
    this.formNome = trick.nome;
    this.formDifficolta = trick.difficolta;
    this.formVideoUrl = trick.video_url ?? '';
    this.formThumbnailUrl = trick.thumbnail_url ?? '';
    this.formTags = trick.tags.join(', ');
    this.formRequired = trick.required.join('\n');
  }

  private startNewTrick(): void {
    this.selectedTrickId = null;
    this.formId = '';
    this.formNome = '';
    this.formDifficolta = 'base';
    this.formVideoUrl = '';
    this.formThumbnailUrl = '';
    this.formTags = '';
    this.formRequired = '';
  }

  protected saveTrick(): void {
    const id = this.formId.trim();
    const nome = this.formNome.trim();
    const difficolta = this.formDifficolta.trim();

    if (!id || !nome || !difficolta) {
      this.setStatus('Compila i campi obbligatori: ID, Nome, Difficolta.', 'error');
      return;
    }

    let videoUrl: string | null;
    let thumbnailUrl: string | null;
    try {
      videoUrl = this.normalizeOptionalUrl(this.formVideoUrl);
      thumbnailUrl = this.normalizeOptionalUrl(this.formThumbnailUrl);
    } catch (error) {
      this.setStatus((error as Error).message, 'error');
      return;
    }

    const payload = {
      id,
      nome,
      difficolta,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      tags: this.parseDelimitedList(this.formTags),
      required: this.parseDelimitedList(this.formRequired),
    };

    this.isSaving = true;
    this.setStatus('Salvataggio trick in corso...', 'info');

    this.http
      .post<UpsertTrickResponse>(this.buildUrl(this.tricksWriteEndpoint), payload, {
        headers: this.getToolHeaders(),
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isSaving = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: (response) => {
          const savedId = response?.trick?.id ?? id;
          this.setStatus(`Trick "${savedId}" salvato correttamente.`, 'success');
          this.isModalOpen = false;
          this.syncView();
          this.loadTricks(savedId);
        },
        error: (error) => {
          this.setStatus(this.extractHttpError(error, 'Errore durante il salvataggio del trick.'), 'error');
          this.syncView();
        },
      });
  }

  protected deleteCurrentTrick(): void {
    if (!this.selectedTrickId) {
      this.setStatus('Seleziona un trick da eliminare.', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Confermi eliminazione del trick "${this.formNome || this.selectedTrickId}"? Questa azione e irreversibile.`,
    );
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.setStatus(`Eliminazione trick "${this.selectedTrickId}" in corso...`, 'info');

    this.http
      .delete<DeleteTrickResponse>(this.buildUrl(`${this.tricksDeleteEndpoint}/${this.selectedTrickId}`), {
        headers: this.getToolHeaders(),
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isDeleting = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: (response) => {
          const deletedId = response?.deleted?.id ?? this.selectedTrickId ?? 'n/d';
          this.isModalOpen = false;
          this.selectedTrickId = null;
          this.setStatus(`Trick "${deletedId}" eliminato correttamente.`, 'success');
          this.syncView();
          this.loadTricks();
        },
        error: (error) => {
          this.setStatus(this.extractHttpError(error, 'Errore durante eliminazione trick.'), 'error');
          this.syncView();
        },
      });
  }

  protected get thumbnailPreviewUrl(): string | null {
    const value = this.formThumbnailUrl.trim();
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  protected get youtubeEmbedPreviewUrl(): SafeResourceUrl | null {
    const embedUrl = this.toYoutubeEmbedUrl(this.formVideoUrl);
    if (!embedUrl) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  protected get normalizedFormThumbnailUrl(): string | null {
    return this.safeHttpUrl(this.formThumbnailUrl);
  }

  protected get normalizedFormVideoUrl(): string | null {
    return this.safeHttpUrl(this.formVideoUrl);
  }

  protected get draftQuality(): TrickQuality {
    return this.computeQuality({
      nome: this.formNome,
      difficolta: this.formDifficolta,
      video_url: this.normalizeNullableUrlForQuality(this.formVideoUrl),
      thumbnail_url: this.normalizeNullableUrlForQuality(this.formThumbnailUrl),
    });
  }

  protected issueLabel(issue: TrickIssueCode): string {
    switch (issue) {
      case 'missing_name':
        return 'Nome mancante';
      case 'unknown_difficulty':
        return 'Difficolta non valida';
      case 'missing_video':
        return 'Video mancante';
      case 'video_not_previewable':
        return 'Video non previewabile';
      case 'missing_thumbnail':
        return 'Thumbnail mancante';
      case 'thumbnail_invalid_url':
        return 'Thumbnail URL non valida';
      case 'thumbnail_unreachable':
        return 'Thumbnail non raggiungibile';
      default:
        return issue;
    }
  }

  protected refreshTricks(): void {
    this.loadTricks(this.selectedTrickId ?? undefined);
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
    if (query.length > 0) {
      params.set('q', query);
    }

    this.http
      .get<unknown>(this.buildSpotsUrl(`${this.spotsListEndpoint}?${params.toString()}`), {
        headers: this.getToolHeaders(),
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isSpotsLoading = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: (response) => {
          const normalized = this.normalizeSpotsResponse(response);
          this.spots = normalized.data;
          this.spotsTotal = normalized.total;
          this.spotsTotalPages = normalized.totalPages;
          this.spotsPage = normalized.page;
          this.syncView();
        },
        error: (error) => {
          this.setStatus(this.extractHttpError(error, 'Errore durante il caricamento degli spot.'), 'error');
          this.syncView();
        },
      });
  }

  private normalizeSpotsResponse(response: unknown): {
    data: Spot[];
    total: number;
    page: number;
    totalPages: number;
  } {
    if (!response || typeof response !== 'object') {
      return { data: [], total: 0, page: 1, totalPages: 1 };
    }

    const parsed = response as SpotsResponse;
    const rows = parsed.data;
    if (!Array.isArray(rows)) {
      return { data: [], total: 0, page: 1, totalPages: 1 };
    }

    const pagination = parsed.pagination ?? {};
    const page = typeof pagination.page === 'number' ? pagination.page : this.spotsPage;
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const totalPages =
      typeof pagination.totalPages === 'number'
        ? pagination.totalPages
        : Math.max(1, Math.ceil(total / this.spotsPageSize));

    return {
      data: rows.map((row) => this.normalizeSpot(row)),
      total,
      page,
      totalPages,
    };
  }

  private normalizeSpot(row: unknown): Spot {
    const raw = (row as Record<string, unknown>) ?? {};

    const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
    const asNullableString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
    const asNumberOrNull = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    const asStatus = (value: unknown): SpotStatus => {
      if (value === 'approved' || value === 'rejected') {
        return value;
      }
      return 'pending';
    };

    const pos = (raw['posizione'] as Record<string, unknown> | undefined) ?? {};
    const addedBy = (raw['aggiunto_da'] as Record<string, unknown> | undefined) ?? null;
    const numberOrZero = (value: unknown): number =>
      typeof value === 'number' && Number.isFinite(value) ? value : 0;

    return {
      id: typeof raw['id'] === 'number' ? raw['id'] : Number(raw['id'] ?? 0),
      nome: asString(raw['nome']),
      descrizione: asNullableString(raw['descrizione']),
      posizione: {
        lat: asNumberOrNull(pos['lat']),
        lon: asNumberOrNull(pos['lon']),
      },
      tipo: asNullableString(raw['tipo']),
      status: asStatus(raw['status']),
      created_at: asNullableString(raw['created_at']),
      aggiunto_da:
        addedBy && typeof addedBy === 'object'
          ? {
              user_id: asString(addedBy['user_id']),
              nome: asNullableString(addedBy['nome']),
              username: asNullableString(addedBy['username']),
            }
          : null,
      features: Array.isArray(raw['features'])
        ? raw['features'].filter((entry): entry is string => typeof entry === 'string')
        : [],
      photos_count: numberOrZero(raw['photos_count']),
      photo_cover_url: asNullableString(raw['photo_cover_url']),
      reviews_count: numberOrZero(raw['reviews_count']),
      reports_count: numberOrZero(raw['reports_count']),
      visitors_count: numberOrZero(raw['visitors_count']),
    };
  }

  private loadSpotDetail(spotId: number): void {
    this.isSpotDetailLoading = true;
    this.http
      .get<unknown>(this.buildSpotsUrl(`${this.spotsDetailEndpoint}/${spotId}`), {
        headers: this.getToolHeaders(),
      })
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isSpotDetailLoading = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: (response) => {
          this.selectedSpotDetail = this.normalizeSpotDetail(response);
          this.syncView();
        },
        error: (error) => {
          this.setStatus(this.extractHttpError(error, 'Errore nel caricamento dettaglio spot.'), 'error');
          this.syncView();
        },
      });
  }

  private normalizeSpotDetail(response: unknown): SpotDetail | null {
    if (!response || typeof response !== 'object') {
      return null;
    }

    const raw = response as Record<string, unknown>;
    const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
    const asNullableString = (value: unknown): string | null => (typeof value === 'string' ? value : null);
    const asNumberOrNull = (value: unknown): number | null =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    const asStatus = (value: unknown): SpotStatus => {
      if (value === 'approved' || value === 'rejected') {
        return value;
      }
      return 'pending';
    };

    const pos = (raw['posizione'] as Record<string, unknown> | undefined) ?? {};
    const maps = (raw['maps'] as Record<string, unknown> | undefined) ?? {};
    const counters = (raw['counters'] as Record<string, unknown> | undefined) ?? {};
    const rating = (raw['rating'] as Record<string, unknown> | null | undefined) ?? null;
    const addedBy = (raw['aggiunto_da'] as Record<string, unknown> | null | undefined) ?? null;

    const photosRaw = Array.isArray(raw['photos']) ? raw['photos'] : [];
    const reviewsRaw = Array.isArray(raw['reviews']) ? raw['reviews'] : [];
    const reportsRaw = Array.isArray(raw['reports']) ? raw['reports'] : [];

    return {
      id: typeof raw['id'] === 'number' ? raw['id'] : Number(raw['id'] ?? 0),
      nome: asString(raw['nome']),
      descrizione: asNullableString(raw['descrizione']),
      posizione: {
        lat: asNumberOrNull(pos['lat']),
        lon: asNumberOrNull(pos['lon']),
      },
      tipo: asNullableString(raw['tipo']),
      status: asStatus(raw['status']),
      created_at: asNullableString(raw['created_at']),
      features: Array.isArray(raw['features'])
        ? raw['features'].filter((entry): entry is string => typeof entry === 'string')
        : [],
      aggiunto_da:
        addedBy && typeof addedBy === 'object'
          ? {
              user_id: asString(addedBy['user_id']),
              nome: asNullableString(addedBy['nome']),
              username: asNullableString(addedBy['username']),
              avatar_url: asNullableString(addedBy['avatar_url']),
            }
          : null,
      photos: photosRaw.map((photo) => {
        const p = (photo as Record<string, unknown>) ?? {};
        return {
          id: typeof p['id'] === 'number' ? p['id'] : Number(p['id'] ?? 0),
          url: asString(p['url']),
          descrizione: asNullableString(p['descrizione']),
          uploaded_by_user_id: asNullableString(p['uploaded_by_user_id']),
          created_at: asNullableString(p['created_at']),
        };
      }),
      reviews: reviewsRaw.map((review) => {
        const r = (review as Record<string, unknown>) ?? {};
        const user = (r['user'] as Record<string, unknown> | undefined) ?? null;
        return {
          id: typeof r['id'] === 'number' ? r['id'] : Number(r['id'] ?? 0),
          created_at: asNullableString(r['created_at']),
          status: asStatus(r['status']),
          user:
            user && typeof user === 'object'
              ? {
                  user_id: asString(user['user_id']),
                  nome: asNullableString(user['nome']),
                  username: asNullableString(user['username']),
                }
              : null,
          qualita: asNumberOrNull(r['qualita']),
          sicurezza: asNumberOrNull(r['sicurezza']),
          commento: asNullableString(r['commento']),
        };
      }),
      reports: reportsRaw.map((report) => {
        const r = (report as Record<string, unknown>) ?? {};
        const user = (r['user'] as Record<string, unknown> | undefined) ?? null;
        return {
          id: typeof r['id'] === 'number' ? r['id'] : Number(r['id'] ?? 0),
          created_at: asNullableString(r['created_at']),
          status: asStatus(r['status']),
          user:
            user && typeof user === 'object'
              ? {
                  user_id: asString(user['user_id']),
                  nome: asNullableString(user['nome']),
                  username: asNullableString(user['username']),
                }
              : null,
          motivo: asNullableString(r['motivo']),
          descrizione: asNullableString(r['descrizione']),
        };
      }),
      counters: {
        photos: typeof counters['photos'] === 'number' ? counters['photos'] : photosRaw.length,
        reviews: typeof counters['reviews'] === 'number' ? counters['reviews'] : reviewsRaw.length,
        reports: typeof counters['reports'] === 'number' ? counters['reports'] : reportsRaw.length,
        visitors: typeof counters['visitors'] === 'number' ? counters['visitors'] : 0,
      },
      rating:
        rating && typeof rating === 'object'
          ? {
              qualita_avg: asNumberOrNull(rating['qualita_avg']),
              sicurezza_avg: asNumberOrNull(rating['sicurezza_avg']),
            }
          : null,
      maps: {
        googleMapsUrl: asNullableString(maps['googleMapsUrl']),
        googleMapsSatelliteUrl: asNullableString(maps['googleMapsSatelliteUrl']),
        googleEarthWebUrl: asNullableString(maps['googleEarthWebUrl']),
        googleMapsStreetViewUrl: asNullableString(maps['googleMapsStreetViewUrl']),
      },
    };
  }

  private loadTricks(selectId?: string): void {
    this.isLoading = true;
    this.http
      .get<unknown>(this.buildUrl('/tricks?limit=250&offset=0'))
      .pipe(
        timeout(15000),
        finalize(() => {
          this.isLoading = false;
          this.syncView();
        }),
      )
      .subscribe({
        next: (response) => {
          this.hasLoadedTricks = true;
          this.isSaving = false;
          this.isDeleting = false;
          this.tricks = this.normalizeTricksResponse(response).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
          this.applyFilters();
          this.queueThumbnailProbes(this.tricks);

          const wantedId = selectId ?? this.selectedTrickId;
          if (wantedId) {
            const trick = this.tricks.find((item) => item.id === wantedId);
            if (trick) {
              this.selectTrick(trick);
            }
          }
          this.syncView();
        },
        error: (error) => {
          this.isSaving = false;
          this.isDeleting = false;
          this.setStatus(this.extractHttpError(error, 'Errore durante il caricamento dei tricks.'), 'error');
          this.syncView();
        },
      });
  }

  private normalizeTricksResponse(response: unknown): Trick[] {
    if (!response || typeof response !== 'object') {
      return [];
    }

    const rows = (response as { data?: unknown }).data;
    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((row) => this.normalizeTrick(row));
  }

  private normalizeTrick(row: unknown): Trick {
    const raw = (row as Record<string, unknown>) ?? {};
    const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
    const asNullableString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
    const asStringArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)
        : [];

    const trick = {
      id: asString(raw['id']),
      nome: asString(raw['nome']),
      difficolta: asString(raw['difficolta'], 'base'),
      video_url: asNullableString(raw['video_url']),
      thumbnail_url: asNullableString(raw['thumbnail_url']),
      tags: asStringArray(raw['tags']),
      required: asStringArray(raw['required']),
    };

    return {
      ...trick,
      quality: this.computeQuality(trick),
    };
  }

  private parseDelimitedList(rawValue: string): string[] {
    return rawValue
      .split(/[\n,]/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  private normalizeOptionalUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = new URL(trimmed);
      return parsed.toString();
    } catch {
      throw new Error(`URL non valido: ${trimmed}`);
    }
  }

  private normalizeNullableUrlForQuality(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private safeHttpUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private computeQuality(input: Pick<Trick, 'nome' | 'difficolta' | 'video_url' | 'thumbnail_url'>): TrickQuality {
    const issues: TrickIssueCode[] = [];
    const name = input.nome.trim();
    const difficulty = input.difficolta.trim().toLowerCase();
    const video = (input.video_url ?? '').trim();
    const thumbnail = (input.thumbnail_url ?? '').trim();

    if (!name) {
      issues.push('missing_name');
    }

    if (!this.difficultyOptions.includes(difficulty)) {
      issues.push('unknown_difficulty');
    }

    if (!video) {
      issues.push('missing_video');
    } else if (!this.toYoutubeEmbedUrl(video)) {
      issues.push('video_not_previewable');
    }

    if (!thumbnail) {
      issues.push('missing_thumbnail');
    } else if (!this.safeHttpUrl(thumbnail)) {
      issues.push('thumbnail_invalid_url');
    } else if (this.thumbnailReachability.get(thumbnail) === false) {
      issues.push('thumbnail_unreachable');
    }

    const level: TrickQuality['level'] =
      issues.includes('missing_name') || issues.includes('unknown_difficulty')
        ? 'critical'
        : issues.length > 0
          ? 'warn'
          : 'ok';

    return {
      level,
      issues,
    };
  }

  private buildUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = this.apiBaseUrl.replace(/\/+$/, '');
    const path = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  private buildSpotsUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }
    const base = this.spotsApiBaseUrl.replace(/\/+$/, '');
    const path = pathOrUrl.replace(/^\/+/, '');
    return `${base}/${path}`;
  }

  private getToolHeaders(): Record<string, string> {
    if (!this.localToolSecret) {
      return {};
    }
    return {
      'x-local-tool-secret': this.localToolSecret,
    };
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
  }

  private extractHttpError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const errName = (error as { name?: string }).name;
      if (errName === 'TimeoutError') {
        return 'Timeout richiesta: il backend non ha risposto in tempo.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: { error?: string; details?: unknown } }).error;
      if (body?.error) {
        if (body.error.includes('status è richiesta autenticazione')) {
          return 'Moderazione spot richiede endpoint manager con secret. Configura PKOUR_SPOTS_API_BASE_URL nel .env.';
        }
        return body.error;
      }
    }
    return fallback;
  }

  private toYoutubeEmbedUrl(rawUrl: string): string | null {
    const value = rawUrl.trim();
    if (!value) {
      return null;
    }

    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
      let videoId: string | null = null;

      if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        if (parsed.pathname === '/watch') {
          videoId = parsed.searchParams.get('v');
        } else if (parsed.pathname.startsWith('/shorts/')) {
          videoId = parsed.pathname.split('/')[2] ?? null;
        } else if (parsed.pathname.startsWith('/embed/')) {
          videoId = parsed.pathname.split('/')[2] ?? null;
        }
      }

      if (hostname === 'youtu.be') {
        videoId = parsed.pathname.replace('/', '').trim();
      }

      if (!videoId) {
        return null;
      }

      return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    } catch {
      return null;
    }
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }

  private queueThumbnailProbes(tricks: Trick[]): void {
    for (const trick of tricks) {
      const thumbnailUrl = (trick.thumbnail_url ?? '').trim();
      if (!thumbnailUrl) {
        continue;
      }

      if (!this.safeHttpUrl(thumbnailUrl)) {
        continue;
      }

      if (this.thumbnailReachability.has(thumbnailUrl) || this.thumbnailProbeInFlight.has(thumbnailUrl)) {
        continue;
      }

      this.probeThumbnailReachability(thumbnailUrl);
    }
  }

  private probeThumbnailReachability(url: string): void {
    this.thumbnailProbeInFlight.add(url);

    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => complete(false), this.thumbnailProbeTimeoutMs);

    const complete = (isReachable: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      this.thumbnailProbeInFlight.delete(url);
      this.thumbnailReachability.set(url, isReachable);
      this.refreshQualityAfterProbe();
    };

    img.onload = () => complete(true);
    img.onerror = () => complete(false);
    // Keep the original URL: some CDN/image providers may reject probe query params.
    img.src = url;
  }

  private refreshQualityAfterProbe(): void {
    this.tricks = this.tricks.map((trick) => ({
      ...trick,
      quality: this.computeQuality(trick),
    }));
    this.applyFilters();
    this.syncView();
  }
}
