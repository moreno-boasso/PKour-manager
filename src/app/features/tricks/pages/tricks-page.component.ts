import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

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

interface UpsertTrickResponse {
  trick: Trick;
}

interface DeleteTrickResponse {
  deleted: { id: string; nome: string };
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
  selector: 'app-tricks-page',
  imports: [FormsModule],
  templateUrl: './tricks-page.component.html',
})
export class TricksPageComponent implements OnInit {
  protected readonly difficultyOptions = ['base', 'intermedio', 'avanzato'];
  protected readonly trickTagOptions = [
    'vault',
    'precision',
    'cat',
    'wall',
    'rail',
    'flow',
    'speed',
    'balance',
    'roll',
    'flip',
    'tricking',
    'ground',
  ];
  protected readonly requiredFeatureOptions = [
    'muretto',
    'muro',
    'sbarra',
    'doppio muretto',
    'trampolino',
    'asfalto piano',
    'prato piano',
    'rampa',
    'piattaforma rialzata',
    'scale',
    'pietre',
    'sabbia',
    'acqua',
    'panchina',
  ];
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected isLoading = false;
  protected isSaving = false;
  protected isDeleting = false;
  protected isModalOpen = false;
  protected isCreateMode = false;
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

  constructor(
    private readonly http: HttpClient,
    private readonly sanitizer: DomSanitizer,
    private readonly utils: ManagerUtilsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTricks();
  }

  protected refreshTricks(): void {
    this.loadTricks(this.selectedTrickId ?? undefined);
  }

  protected applyFilters(): void {
    const search = this.searchText.trim().toLowerCase();
    const selectedDiff = this.selectedDifficulty.trim().toLowerCase();
    this.filteredTricks = this.tricks.filter((trick) => {
      const byDifficulty = !selectedDiff || trick.difficolta.toLowerCase() === selectedDiff;
      const bySearch = !search || trick.id.toLowerCase().includes(search) || trick.nome.toLowerCase().includes(search);
      const byIssues = !this.filterOnlyIssues || trick.quality.issues.length > 0;
      const byMissingThumbnail = !this.filterMissingThumbnail || trick.quality.issues.some((i) => i.includes('thumbnail'));
      const byMissingVideo = !this.filterMissingVideo || trick.quality.issues.includes('missing_video');
      const byVideoNotPreviewable = !this.filterVideoNotPreviewable || trick.quality.issues.includes('video_not_previewable');
      const byBrokenThumbnail = !this.filterBrokenThumbnail || trick.quality.issues.includes('thumbnail_invalid_url') || trick.quality.issues.includes('thumbnail_unreachable');
      return byDifficulty && bySearch && byIssues && byMissingThumbnail && byMissingVideo && byVideoNotPreviewable && byBrokenThumbnail;
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
    this.isSaving = false;
    this.isDeleting = false;
    this.isModalOpen = false;
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
    this.http.post<UpsertTrickResponse>(this.utils.buildApiUrl(this.utils.tricksWriteEndpoint), payload, {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isSaving = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        this.isModalOpen = false;
        this.setStatus(`Trick "${response?.trick?.id ?? id}" salvato correttamente.`, 'success');
        this.loadTricks(response?.trick?.id ?? id);
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il salvataggio del trick.'), 'error'),
    });
  }

  protected deleteCurrentTrick(): void {
    if (!this.selectedTrickId) return;
    if (!window.confirm(`Confermi eliminazione del trick "${this.formNome || this.selectedTrickId}"? Questa azione e irreversibile.`)) return;
    this.isDeleting = true;
    this.setStatus(`Eliminazione trick "${this.selectedTrickId}" in corso...`, 'info');
    this.http.delete<DeleteTrickResponse>(this.utils.buildApiUrl(`${this.utils.tricksDeleteEndpoint}/${this.selectedTrickId}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isDeleting = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        this.isModalOpen = false;
        this.selectedTrickId = null;
        this.setStatus(`Trick "${response?.deleted?.id ?? 'n/d'}" eliminato correttamente.`, 'success');
        this.loadTricks();
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante eliminazione trick.'), 'error'),
    });
  }

  protected get thumbnailPreviewUrl(): string | null {
    return this.safeHttpUrl(this.formThumbnailUrl);
  }

  protected get youtubeEmbedPreviewUrl(): SafeResourceUrl | null {
    const embedUrl = this.toYoutubeEmbedUrl(this.formVideoUrl);
    return embedUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl) : null;
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
      video_url: this.formVideoUrl.trim() || null,
      thumbnail_url: this.formThumbnailUrl.trim() || null,
    });
  }

  protected issueLabel(issue: TrickIssueCode): string {
    const map: Record<TrickIssueCode, string> = {
      missing_name: 'Nome mancante',
      unknown_difficulty: 'Difficolta non valida',
      missing_video: 'Video mancante',
      video_not_previewable: 'Video non previewabile',
      missing_thumbnail: 'Thumbnail mancante',
      thumbnail_invalid_url: 'Thumbnail URL non valida',
      thumbnail_unreachable: 'Thumbnail non raggiungibile',
    };
    return map[issue];
  }

  protected isPresetTagSelected(tag: string): boolean {
    return this.parseDelimitedList(this.formTags).includes(tag);
  }

  protected togglePresetTag(tag: string): void {
    const current = this.parseDelimitedList(this.formTags);
    const exists = current.includes(tag);
    const next = exists ? current.filter((entry) => entry !== tag) : [...current, tag];
    this.formTags = next.join(', ');
  }

  protected isRequiredFeatureSelected(feature: string): boolean {
    return this.parseDelimitedList(this.formRequired).includes(feature);
  }

  protected toggleRequiredFeature(feature: string): void {
    const current = this.parseDelimitedList(this.formRequired);
    const exists = current.includes(feature);
    const next = exists ? current.filter((entry) => entry !== feature) : [...current, feature];
    this.formRequired = next.join(', ');
  }

  private loadTricks(selectId?: string): void {
    this.isLoading = true;
    this.http.get<{ data?: unknown[] }>(this.utils.buildApiUrl('/tricks?limit=250&offset=0')).pipe(
      timeout(15000),
      finalize(() => {
        this.isLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.tricks = rows.map((row) => this.normalizeTrick(row)).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
        this.applyFilters();
        this.queueThumbnailProbes(this.tricks);
        const wantedId = selectId ?? this.selectedTrickId;
        if (wantedId) {
          const found = this.tricks.find((t) => t.id === wantedId);
          if (found) this.selectTrick(found);
        }
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento dei tricks.'), 'error'),
    });
  }

  private normalizeTrick(row: unknown): Trick {
    const raw = (row as Record<string, unknown>) ?? {};
    const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
    const asNullableString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null);
    const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').map((e) => e.trim()).filter(Boolean) : [];
    const trick = {
      id: asString(raw['id']),
      nome: asString(raw['nome']),
      difficolta: asString(raw['difficolta'], 'base'),
      video_url: asNullableString(raw['video_url']),
      thumbnail_url: asNullableString(raw['thumbnail_url']),
      tags: asStringArray(raw['tags']),
      required: asStringArray(raw['required']),
    };
    return { ...trick, quality: this.computeQuality(trick) };
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

  private parseDelimitedList(rawValue: string): string[] {
    return rawValue.split(/[\n,]/g).map((entry) => entry.trim()).filter(Boolean);
  }

  private normalizeOptionalUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return new URL(trimmed).toString();
    } catch {
      throw new Error(`URL non valido: ${trimmed}`);
    }
  }

  private safeHttpUrl(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }

  private computeQuality(input: Pick<Trick, 'nome' | 'difficolta' | 'video_url' | 'thumbnail_url'>): TrickQuality {
    const issues: TrickIssueCode[] = [];
    if (!input.nome.trim()) issues.push('missing_name');
    if (!this.difficultyOptions.includes(input.difficolta.trim().toLowerCase())) issues.push('unknown_difficulty');
    const video = (input.video_url ?? '').trim();
    if (!video) issues.push('missing_video');
    else if (!this.toYoutubeEmbedUrl(video)) issues.push('video_not_previewable');
    const thumbnail = (input.thumbnail_url ?? '').trim();
    if (!thumbnail) issues.push('missing_thumbnail');
    else if (!this.safeHttpUrl(thumbnail)) issues.push('thumbnail_invalid_url');
    else if (this.thumbnailReachability.get(thumbnail) === false) issues.push('thumbnail_unreachable');
    const level: TrickQuality['level'] = issues.includes('missing_name') || issues.includes('unknown_difficulty') ? 'critical' : issues.length > 0 ? 'warn' : 'ok';
    return { level, issues };
  }

  private toYoutubeEmbedUrl(rawUrl: string): string | null {
    const value = rawUrl.trim();
    if (!value) return null;
    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
      let videoId: string | null = null;
      if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
        if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v');
        else if (parsed.pathname.startsWith('/shorts/') || parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/')[2] ?? null;
      }
      if (hostname === 'youtu.be') videoId = parsed.pathname.replace('/', '').trim();
      return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : null;
    } catch {
      return null;
    }
  }

  private queueThumbnailProbes(tricks: Trick[]): void {
    for (const trick of tricks) {
      const thumbnailUrl = (trick.thumbnail_url ?? '').trim();
      if (!thumbnailUrl || !this.safeHttpUrl(thumbnailUrl)) continue;
      if (this.thumbnailReachability.has(thumbnailUrl) || this.thumbnailProbeInFlight.has(thumbnailUrl)) continue;
      this.probeThumbnailReachability(thumbnailUrl);
    }
  }

  private probeThumbnailReachability(url: string): void {
    this.thumbnailProbeInFlight.add(url);
    const img = new Image();
    let settled = false;
    const timer = window.setTimeout(() => complete(false), 5000);
    const complete = (isReachable: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      this.thumbnailProbeInFlight.delete(url);
      this.thumbnailReachability.set(url, isReachable);
      this.tricks = this.tricks.map((trick) => ({ ...trick, quality: this.computeQuality(trick) }));
      this.applyFilters();
      this.syncView();
    };
    img.onload = () => complete(true);
    img.onerror = () => complete(false);
    img.src = url;
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
