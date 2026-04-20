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
  protected readonly menuItems = [
    'Approvazione Spot',
    'Approvazione Foto',
    'Approvazione Recensioni',
    'Approvazione Segnalazioni',
    'Gestione Tricks',
    'Gestione Account',
  ];

  protected readonly difficultyOptions = ['base', 'intermedio', 'avanzato', 'esperto', 'maestro'];

  protected apiBaseUrl = '';
  protected tricksWriteEndpoint = '';
  protected tricksDeleteEndpoint = '';
  protected localToolSecret = '';

  protected isSidebarOpen = false;
  protected isLoading = false;
  protected isSaving = false;
  protected isDeleting = false;
  protected isModalOpen = false;
  protected isCreateMode = false;
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';

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
    this.tricksWriteEndpoint = runtimeEnv.tricksWriteEndpoint;
    this.tricksDeleteEndpoint = runtimeEnv.tricksDeleteEndpoint;
    this.localToolSecret = runtimeEnv.localToolSecret;
    this.loadTricks();
  }

  protected toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  protected closeSidebarOnMobile(): void {
    this.isSidebarOpen = false;
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
