import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SortField, SortOrder } from '../../../core/api/admin-api.service';
import { AdminSpot, AdminSpotDetail, ModerationStatus } from '../../../shared/models/admin.model';
import { SwipeActionDirective } from '../../../shared/directives/swipe-action.directive';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

type Tab = 'pending' | 'approved';

@Component({
  selector: 'app-spots-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, SwipeActionDirective, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900" i18n="@@spots.title">Moderazione Spot</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} spot trovati</p>
      </div>

      <!-- Tabs + Search -->
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          @for (tab of tabs; track tab.value) {
            <button
              (click)="setTab(tab.value)"
              [class]="activeTab() === tab.value
                ? 'px-4 py-1.5 rounded-md bg-white shadow-sm text-sm font-medium text-gray-900'
                : 'px-4 py-1.5 rounded-md text-sm text-gray-500 hover:text-gray-700'"
            >{{ tab.label }}</button>
          }
        </div>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (keyup.enter)="search()"
          placeholder="Cerca spot..."
          i18n-placeholder="@@spots.search"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none w-56"
        />
        <!-- Sorting -->
        <select
          [ngModel]="sortBy()"
          (ngModelChange)="setSortBy($event)"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
        >
          @for (opt of sortOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <button
          (click)="toggleSortOrder()"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          [title]="sortOrder() === 'asc' ? 'Crescente' : 'Decrescente'"
        >
          {{ sortOrder() === 'asc' ? '↑' : '↓' }}
        </button>
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card animate-pulse">
              <div class="h-32 bg-gray-200 rounded-t-xl"></div>
              <div class="p-4 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-2/3"></div>
                <div class="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          }
        </div>
      } @else if (spots().length === 0) {
        <app-empty-state type="spots" message="Nessuno spot in questa categoria" />
      } @else {
        <!-- Hint swipe (solo mobile, solo pending) -->
        @if (activeTab() === 'pending') {
          <p class="text-xs text-gray-400 text-center sm:hidden">← Rifiuta &nbsp;|&nbsp; Approva →</p>
        }

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (spot of spots(); track spot.id) {
            <div
              class="card overflow-hidden relative transition-transform"
              [class.sm:hidden]="false"
              appSwipeAction
              (swipeRight)="activeTab() === 'pending' && onSwipeRight(spot)"
              (swipeLeft)="activeTab() === 'pending' && onSwipeLeft(spot)"
            >
              <!-- Indicatore swipe approve -->
              @if (swipingId() === spot.id && swipeDir() === 'right') {
                <div class="absolute inset-0 z-10 bg-emerald-500/20 flex items-center justify-start pl-6 rounded-xl">
                  <span class="text-emerald-600 font-bold text-lg">✓ Approva</span>
                </div>
              }
              <!-- Indicatore swipe reject -->
              @if (swipingId() === spot.id && swipeDir() === 'left') {
                <div class="absolute inset-0 z-10 bg-red-500/20 flex items-center justify-end pr-6 rounded-xl">
                  <span class="text-red-600 font-bold text-lg">✕ Rifiuta</span>
                </div>
              }
              <!-- Thumbnail -->
              <div class="h-32 bg-gray-100 relative">
                @if (spot.foto_principale_url) {
                  <img [src]="spot.foto_principale_url" [alt]="spot.nome" class="w-full h-full object-cover" />
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-4xl text-gray-300">📍</div>
                }
                <span [class]="badgeClass(spot.status)" class="absolute top-2 right-2">
                  {{ spot.status }}
                </span>
              </div>
              <!-- Content -->
              <div class="p-4">
                <p class="font-semibold text-gray-900 truncate">{{ spot.nome }}</p>
                <p class="text-xs text-gray-400 mt-0.5">{{ spot.tipo ?? '—' }}</p>
                <!-- Actions -->
                <div class="flex gap-2 mt-3">
                  @if (spot.status === 'pending') {
                    <button (click)="approve(spot)" class="btn-primary py-1.5 px-3 text-xs flex-1 justify-center" i18n="@@spots.approve">Approva</button>
                    <button (click)="reject(spot)" class="btn-danger py-1.5 px-3 text-xs flex-1 justify-center" i18n="@@spots.reject">Elimina</button>
                  }
                  <button (click)="openDetail(spot)" class="btn-ghost py-1.5 px-3 text-xs" i18n="@@spots.detail">Dettagli</button>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Paginazione -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">
            {{ offset() + 1 }}–{{ offset() + spots().length }} di {{ total() }}
          </p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.prev">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.next">Successivo →</button>
          </div>
        </div>
      }
    </div>

    <!-- Drawer dettaglio -->
    @if (selectedDetail()) {
      <div class="fixed inset-0 z-50 flex">
        <div class="flex-1 bg-black/40" (click)="closeDetail()"></div>
        <div class="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
          <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 class="font-bold text-lg">{{ selectedDetail()!.nome }}</h2>
            <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div class="p-6 space-y-4">
            <!-- Foto -->
            @if (selectedDetail()!.foto.length > 0) {
              <div class="flex gap-2 overflow-x-auto pb-1">
                @for (foto of selectedDetail()!.foto; track foto.id) {
                  <img [src]="foto.url" class="h-24 w-32 object-cover rounded-lg shrink-0" />
                }
              </div>
            }
            <!-- Info -->
            <div class="space-y-1 text-sm">
              <p><span class="font-medium" i18n="@@spots.tipo">Tipo:</span> {{ selectedDetail()!.tipo ?? '—' }}</p>
              <p><span class="font-medium" i18n="@@spots.features">Features:</span> {{ selectedDetail()!.features.join(', ') || '—' }}</p>
              <p><span class="font-medium" i18n="@@spots.visitors">Visitatori:</span> {{ selectedDetail()!.visitatori_count }}</p>
              @if (selectedDetail()!.aggiunto_da) {
                <p><span class="font-medium" i18n="@@spots.created_by">Creato da:</span> {{ selectedDetail()!.aggiunto_da!.username ?? selectedDetail()!.aggiunto_da!.nome ?? selectedDetail()!.aggiunto_da!.user_id }}</p>
              }
            </div>
            <!-- Actions -->
            <div class="flex gap-2 pt-2">
              @if (selectedDetail()!.status === 'pending') {
                <button (click)="approveDetail()" class="btn-primary py-2 px-4 flex-1 justify-center" i18n="@@spots.approve">Approva</button>
                <button (click)="rejectDetail()" class="btn-danger py-2 px-4 flex-1 justify-center" i18n="@@spots.reject">Elimina</button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class SpotsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly spots = signal<AdminSpot[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly selectedDetail = signal<AdminSpotDetail | null>(null);
  readonly swipingId = signal<number | null>(null);
  readonly swipeDir = signal<'left' | 'right' | null>(null);
  readonly pageSize = 24;
  readonly sortBy = signal<SortField>('created_at');
  readonly sortOrder = signal<SortOrder>('desc');

  searchQuery = '';

  readonly sortOptions: { value: SortField; label: string }[] = [
    { value: 'created_at', label: 'Data creazione' },
    { value: 'updated_at', label: 'Data aggiornamento' },
    { value: 'nome', label: 'Nome' },
  ];

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvati' },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getSpots(
      this.activeTab(),
      this.pageSize,
      this.offset(),
      this.searchQuery || undefined,
      this.sortBy(),
      this.sortOrder()
    ).subscribe({
      next: (res) => {
        this.spots.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setSortBy(value: SortField): void {
    this.sortBy.set(value);
    this.offset.set(0);
    this.load();
  }

  toggleSortOrder(): void {
    this.sortOrder.update(o => o === 'asc' ? 'desc' : 'asc');
    this.load();
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
    this.offset.set(0);
    this.load();
  }

  search(): void {
    this.offset.set(0);
    this.load();
  }

  prevPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.load();
  }

  nextPage(): void {
    this.offset.update(v => v + this.pageSize);
    this.load();
  }

  approve(spot: AdminSpot): void {
    this.loadingSvc.show();
    this.api.patchSpotStatus(spot.id, 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${spot.nome}" approvato`); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }

  reject(spot: AdminSpot): void {
    if (!confirm(`Eliminare definitivamente "${spot.nome}"?\n\nQuesta azione non può essere annullata.`)) return;
    this.loadingSvc.show();
    this.api.deleteSpot(spot.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${spot.nome}" eliminato`); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }

  openDetail(spot: AdminSpot): void {
    this.api.getSpotDetail(spot.id).subscribe({ next: (d) => this.selectedDetail.set(d) });
  }

  closeDetail(): void {
    this.selectedDetail.set(null);
  }

  approveDetail(): void {
    const detail = this.selectedDetail();
    if (!detail) return;
    this.loadingSvc.show();
    this.api.patchSpotStatus(detail.id, 'approved').subscribe({
      next: (updated) => { this.loadingSvc.hide(); this.toast.success(`"${detail.nome}" approvato`); this.selectedDetail.set(updated); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }

  rejectDetail(): void {
    const detail = this.selectedDetail();
    if (!detail || !confirm(`Eliminare definitivamente "${detail.nome}"?\n\nQuesta azione non può essere annullata.`)) return;
    this.loadingSvc.show();
    this.api.deleteSpot(detail.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${detail.nome}" eliminato`); this.selectedDetail.set(null); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }

  onSwipeRight(spot: AdminSpot): void {
    this.swipingId.set(spot.id);
    this.swipeDir.set('right');
    setTimeout(() => {
      this.swipingId.set(null);
      this.swipeDir.set(null);
      this.api.patchSpotStatus(spot.id, 'approved').subscribe({
        next: () => { this.toast.success(`"${spot.nome}" approvato`); this.load(); },
        error: () => this.toast.error('Errore durante l\'approvazione'),
      });
    }, 350);
  }

  onSwipeLeft(spot: AdminSpot): void {
    this.swipingId.set(spot.id);
    this.swipeDir.set('left');
    setTimeout(() => {
      this.swipingId.set(null);
      this.swipeDir.set(null);
      this.api.deleteSpot(spot.id).subscribe({
        next: () => { this.toast.success(`"${spot.nome}" eliminato`); this.load(); },
        error: () => this.toast.error('Errore durante l\'eliminazione'),
      });
    }, 350);
  }

  badgeClass(status: ModerationStatus): string {
    const base = 'text-xs font-semibold px-2 py-0.5 rounded-full';
    if (status === 'pending') return `${base} badge-pending`;
    return `${base} badge-approved`;
  }
}
