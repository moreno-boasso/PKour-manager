import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService, SortField, SortOrder } from '../../../core/api/admin-api.service';
import { ManagerReview, ModerationStatus } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

type Tab = 'pending' | 'approved';

@Component({
  selector: 'app-reviews-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900" i18n="@@reviews.title">Moderazione Recensioni</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} recensioni trovate</p>
      </div>

      <!-- Tabs -->
      <div class="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 w-fit">
        @for (tab of tabs; track tab.value) {
          <button
            (click)="setTab(tab.value)"
            [class]="activeTab() === tab.value
              ? 'px-4 py-1.5 rounded-md bg-white shadow-sm text-sm font-medium text-gray-900'
              : 'px-4 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-700'"
          >{{ tab.label }}</button>
        }
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
              <div class="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          }
        </div>
      } @else if (reviews().length === 0) {
        <app-empty-state type="reviews" message="Nessuna recensione in questa categoria" />
      } @else {
        <div class="space-y-3">
          @for (review of reviews(); track review.user_id + '-' + review.spot_id) {
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Header -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900">
                      {{ review.user_username ?? review.user_nome ?? review.user_id }}
                    </span>
                    <span class="text-gray-300">·</span>
                    <span class="text-xs text-gray-500 truncate">{{ review.spot_nome }}</span>
                    <span [class]="badgeClass(review.status)">{{ review.status }}</span>
                  </div>
                  <!-- Ratings -->
                  <div class="flex gap-4 mt-1.5 text-xs text-gray-500">
                    <span>Qualità: <strong class="text-gray-800">{{ review.qualita }}/5</strong></span>
                    <span>Sicurezza: <strong class="text-gray-800">{{ review.sicurezza }}/5</strong></span>
                  </div>
                  <!-- Comment -->
                  @if (review.commento) {
                    <p class="text-sm text-gray-700 mt-1.5 line-clamp-3">{{ review.commento }}</p>
                  }
                  <p class="text-xs text-gray-400 mt-1">{{ review.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                </div>
                <!-- Actions -->
                <div class="flex flex-col gap-1.5 shrink-0">
                  @if (review.status === 'pending') {
                    <button (click)="approve(review)" class="btn-primary py-1 px-3 text-xs justify-center" i18n="@@reviews.approve">Approva</button>
                    <button (click)="reject(review)" class="btn-danger py-1 px-3 text-xs justify-center" i18n="@@reviews.reject">Elimina</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Paginazione -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + reviews().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.prev">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.next">Successivo →</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReviewsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly reviews = signal<ManagerReview[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly pageSize = 20;

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvate' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getReviews(this.activeTab(), this.pageSize, this.offset()).subscribe({
      next: (res) => { this.reviews.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); this.offset.set(0); this.load(); }
  prevPage(): void { this.offset.update(v => Math.max(0, v - this.pageSize)); this.load(); }
  nextPage(): void { this.offset.update(v => v + this.pageSize); this.load(); }

  approve(r: ManagerReview): void {
    this.loadingSvc.show();
    this.api.patchReviewStatus(r.user_id, r.spot_id, 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Recensione approvata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }
  reject(r: ManagerReview): void {
    if (!confirm('Eliminare definitivamente questa recensione?\n\nQuesta azione non può essere annullata.')) return;
    this.loadingSvc.show();
    this.api.deleteReview(r.user_id, r.spot_id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Recensione eliminata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }

  badgeClass(status: ModerationStatus): string {
    if (status === 'pending') return 'badge-pending';
    return 'badge-approved';
  }
}
