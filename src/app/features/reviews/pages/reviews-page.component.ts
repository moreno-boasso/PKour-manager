import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

type SpotStatus = 'pending' | 'approved' | 'rejected';

interface ModerationReview {
  id: number;
  spot_id: number;
  spot_nome: string | null;
  user_id: string | null;
  user_nome: string | null;
  user_username: string | null;
  qualita: number | null;
  sicurezza: number | null;
  commento: string;
  status: SpotStatus;
  created_at: string | null;
}

interface ReviewsResponse {
  pagination?: { total?: number; page?: number; totalPages?: number };
  data: ModerationReview[];
}

@Component({
  selector: 'app-reviews-page',
  imports: [FormsModule],
  templateUrl: './reviews-page.component.html',
})
export class ReviewsPageComponent implements OnInit {
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected reviewSearchText = '';
  protected selectedReviewStatus: SpotStatus = 'pending';
  protected reviewsPage = 1;
  protected reviewsPageSize = 12;
  protected reviewsTotal = 0;
  protected reviewsTotalPages = 1;
  protected reviews: ModerationReview[] = [];
  protected isReviewsLoading = false;
  protected isReviewActionLoading = false;
  protected reviewActionTargetId: number | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly utils: ManagerUtilsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  protected get reviewStatusLabel(): string {
    if (this.selectedReviewStatus === 'approved') return 'Approvate';
    if (this.selectedReviewStatus === 'rejected') return 'Rifiutate';
    return 'In attesa';
  }

  protected formatDateTime(value: string | null): string {
    return this.utils.formatDateTime(value);
  }

  protected refreshReviews(): void {
    this.loadReviews();
  }

  protected searchReviews(): void {
    this.reviewsPage = 1;
    this.loadReviews();
  }

  protected goToReviewsPage(page: number): void {
    if (page < 1 || page > this.reviewsTotalPages || page === this.reviewsPage) return;
    this.reviewsPage = page;
    this.loadReviews();
  }

  protected reviewAuthorLabel(review: ModerationReview): string {
    return review.user_username?.trim() ? `@${review.user_username.trim()}` : (review.user_nome?.trim() || review.user_id?.trim() || 'utente sconosciuto');
  }

  protected reviewSpotLabel(review: ModerationReview): string {
    return review.spot_nome?.trim() || `Spot #${review.spot_id}`;
  }

  protected reviewCommentPreview(commento: string): string {
    const compact = commento.replace(/\s+/g, ' ').trim();
    return compact.length <= 240 ? compact : `${compact.slice(0, 240)}...`;
  }

  protected moderateReview(review: ModerationReview, status: Extract<SpotStatus, 'approved' | 'rejected'>): void {
    if (this.isReviewActionLoading || this.reviewActionTargetId !== null) return;
    this.isReviewActionLoading = true;
    this.reviewActionTargetId = review.id;
    this.setStatus(status === 'approved' ? `Approvo recensione #${review.id}...` : `Rifiuto recensione #${review.id}...`, 'info');
    this.http.patch(
      this.utils.buildSpotsUrl(`${this.utils.reviewsModerateEndpoint}/${review.id}/decision`),
      { decision: status },
      { headers: this.utils.getToolHeaders() },
    ).pipe(
      timeout(15000),
      finalize(() => {
        this.isReviewActionLoading = false;
        this.reviewActionTargetId = null;
        this.syncView();
      }),
    ).subscribe({
      next: () => {
        this.setStatus(status === 'approved' ? `Recensione #${review.id} approvata correttamente.` : `Recensione #${review.id} rifiutata correttamente.`, 'success');
        this.loadReviews();
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nella moderazione della recensione.'), 'error'),
    });
  }

  private loadReviews(): void {
    this.isReviewsLoading = true;
    const params = new URLSearchParams({
      status: this.selectedReviewStatus,
      page: String(this.reviewsPage),
      pageSize: String(this.reviewsPageSize),
      sortBy: 'created_at',
      order: 'desc',
    });
    const query = this.reviewSearchText.trim();
    if (query) params.set('q', query);
    this.http.get<unknown>(this.utils.buildSpotsUrl(`${this.utils.reviewsListEndpoint}?${params.toString()}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isReviewsLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        const normalized = this.normalizeReviewsResponse(response);
        this.reviews = normalized.data;
        this.reviewsTotal = normalized.total;
        this.reviewsTotalPages = normalized.totalPages;
        this.reviewsPage = normalized.page;
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento delle recensioni.'), 'error'),
    });
  }

  private normalizeReviewsResponse(response: unknown): { data: ModerationReview[]; total: number; page: number; totalPages: number } {
    if (!response || typeof response !== 'object') return { data: [], total: 0, page: 1, totalPages: 1 };
    const parsed = response as ReviewsResponse;
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const pagination = parsed.pagination ?? {};
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const page = typeof pagination.page === 'number' ? pagination.page : this.reviewsPage;
    const totalPages = typeof pagination.totalPages === 'number' ? pagination.totalPages : Math.max(1, Math.ceil(total / this.reviewsPageSize));
    return { data: rows.filter((row) => (row.commento ?? '').trim().length > 0), total, page, totalPages };
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
