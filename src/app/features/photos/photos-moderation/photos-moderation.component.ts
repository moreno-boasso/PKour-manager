import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SortField, SortOrder } from '../../../core/api/admin-api.service';
import { ManagerPhoto, ModerationStatus } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

type Tab = 'pending' | 'approved';

@Component({
  selector: 'app-photos-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900" i18n="@@photos.title">Moderazione Foto</h1>
          <p class="text-sm text-gray-500 mt-1">{{ total() }} foto trovate</p>
        </div>
        @if (selected().size > 0) {
          <div class="flex gap-2 shrink-0">
            <button (click)="bulkApprove()" class="btn-primary py-1.5 px-3 text-sm">
              Approva ({{ selected().size }})
            </button>
            <button (click)="bulkDelete()" class="btn-danger py-1.5 px-3 text-sm">
              Elimina ({{ selected().size }})
            </button>
          </div>
        }
      </div>

      <!-- Tabs + Sort -->
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

      @if (loading()) {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          @for (i of [1,2,3,4,5,6,7,8,9,10]; track i) {
            <div class="aspect-square rounded-xl animate-pulse" style="background:rgba(18,104,105,0.15)"></div>
          }
        </div>
      } @else if (photos().length === 0) {
        <app-empty-state type="photos" message="Nessuna foto in questa categoria" />
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          @for (photo of photos(); track photo.id) {
            <div
              class="relative group aspect-square rounded-xl overflow-hidden cursor-pointer" style="background:var(--bg3)"
              [class.ring-2]="selected().has(photo.id)"
              [class.ring-primary]="selected().has(photo.id)"
              (click)="!selected().has(photo.id) ? openPhoto(photo) : toggleSelect(photo.id)"
            >
              <img [src]="photo.url" [alt]="photo.spot_nome" class="w-full h-full object-cover" loading="lazy" />
              <!-- Overlay info -->
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100">
                <p class="text-white text-xs font-medium truncate">{{ photo.spot_nome }}</p>
                <p class="text-white/70 text-xs truncate">{{ photo.user_username ?? photo.user_nome ?? '—' }}</p>
              </div>
              <!-- Checkbox -->
              <div class="absolute top-2 left-2">
                <div [class]="selected().has(photo.id)
                  ? 'w-5 h-5 rounded-full bg-primary border-2 border-white flex items-center justify-center'
                  : 'w-5 h-5 rounded-full bg-white/80 border-2 border-white group-hover:opacity-100 opacity-0'">
                  @if (selected().has(photo.id)) {
                    <span class="text-white text-xs">✓</span>
                  }
                </div>
              </div>
              <!-- Quick actions -->
              @if (!selected().has(photo.id) && photo.status === 'pending') {
                <div class="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" (click)="$event.stopPropagation()">
                  <button (click)="approve(photo); $event.stopPropagation()" class="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center" title="Approva">✓</button>
                  <button (click)="deletePhoto(photo); $event.stopPropagation()" class="w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" title="Elimina">✕</button>
                </div>
              }
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + photos().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.prev">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.next">Successivo →</button>
          </div>
        </div>
      }

      <!-- Lightbox Full Screen -->
      @if (selectedPhoto(); as photo) {
        <!-- Backdrop chiude -->
        <div class="fixed inset-0 z-50" style="background:rgba(0,0,0,0.96)" (click)="closePhoto()">
          <!-- Panel — click non propaga -->
          <div class="flex flex-col h-full" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="flex items-center justify-between px-4 py-3 shrink-0" style="background:rgba(0,0,0,0.5)">
              <div class="text-sm" style="color:rgba(255,255,255,0.9)">
                <span class="font-medium">{{ photo.spot_nome }}</span>
                <span class="mx-2" style="color:rgba(255,255,255,0.4)">•</span>
                <span style="color:rgba(255,255,255,0.7)">{{ photo.user_username ?? photo.user_nome ?? '—' }}</span>
              </div>
              <button
                (click)="closePhoto()"
                class="text-2xl px-2 transition-colors"
                style="color:rgba(255,255,255,0.6)"
                onmouseenter="this.style.color='white'"
                onmouseleave="this.style.color='rgba(255,255,255,0.6)'"
              >×</button>
            </div>

            <!-- Image -->
            <div class="flex-1 flex items-center justify-center p-4 min-h-0">
              <img
                [src]="photo.url"
                class="max-h-full max-w-full object-contain rounded-lg"
                style="max-height:calc(100vh - 120px)"
              />
            </div>

            <!-- Actions Footer -->
            <div class="px-4 flex items-center justify-center gap-3 shrink-0" style="background:rgba(0,0,0,0.5);padding-top:1rem;padding-bottom:max(1rem, env(safe-area-inset-bottom))">
              @if (photo.status === 'pending') {
                <button (click)="approveFromLightbox(photo)" class="btn-primary px-6 py-2">Approva</button>
              }
              <button (click)="deleteFromLightbox(photo)" class="btn-danger px-6 py-2">Elimina</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PhotosModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly photos = signal<ManagerPhoto[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly selected = signal<Set<number>>(new Set());
  readonly selectedPhoto = signal<ManagerPhoto | null>(null);
  readonly pageSize = 20;
  readonly sortBy = signal<SortField>('created_at');
  readonly sortOrder = signal<SortOrder>('desc');

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvate' },
  ];

  readonly sortOptions: { value: SortField; label: string }[] = [
    { value: 'created_at', label: 'Data creazione' },
    { value: 'updated_at', label: 'Data aggiornamento' },
    { value: 'id', label: 'ID' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.selected.set(new Set());
    this.api.getPhotos(this.activeTab(), this.pageSize, this.offset(), this.sortBy(), this.sortOrder()).subscribe({
      next: (res) => { this.photos.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); this.offset.set(0); this.load(); }
  prevPage(): void { this.offset.update(v => Math.max(0, v - this.pageSize)); this.load(); }
  nextPage(): void { this.offset.update(v => v + this.pageSize); this.load(); }

  setSortBy(value: SortField): void {
    this.sortBy.set(value);
    this.offset.set(0);
    this.load();
  }

  toggleSortOrder(): void {
    this.sortOrder.update(o => o === 'asc' ? 'desc' : 'asc');
    this.load();
  }

  toggleSelect(id: number): void {
    const s = new Set(this.selected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selected.set(s);
  }

  openPhoto(photo: ManagerPhoto): void {
    this.selectedPhoto.set(photo);
  }

  closePhoto(): void {
    this.selectedPhoto.set(null);
  }

  approveFromLightbox(photo: ManagerPhoto): void {
    this.loadingSvc.show();
    this.api.patchPhotoStatus(photo.id, 'approved').subscribe({
      next: () => {
        this.loadingSvc.hide();
        this.toast.success('Foto approvata');
        this.selectedPhoto.set(null);
        this.load();
      },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }

  deleteFromLightbox(photo: ManagerPhoto): void {
    if (!confirm('Eliminare definitivamente questa foto?\n\nQuesta azione non può essere annullata.')) return;
    this.loadingSvc.show();
    this.api.deletePhoto(photo.id).subscribe({
      next: () => {
        this.loadingSvc.hide();
        this.toast.success('Foto eliminata');
        this.selectedPhoto.set(null);
        this.load();
      },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }

  approve(p: ManagerPhoto): void {
    this.loadingSvc.show();
    this.api.patchPhotoStatus(p.id, 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Foto approvata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }
  deletePhoto(p: ManagerPhoto): void {
    if (!confirm('Eliminare definitivamente questa foto?\n\nQuesta azione non può essere annullata.')) return;
    this.loadingSvc.show();
    this.api.deletePhoto(p.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Foto eliminata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }
  bulkApprove(): void {
    const count = this.selected().size;
    this.loadingSvc.show();
    this.api.bulkPatchPhotoStatus([...this.selected()], 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`${count} foto approvate`); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione bulk'); },
    });
  }
  bulkDelete(): void {
    if (!confirm(`Eliminare definitivamente ${this.selected().size} foto?\n\nQuesta azione non può essere annullata.`)) return;
    const count = this.selected().size;
    this.loadingSvc.show();
    // Eliminiamo una per una per sicurezza
    const ids = [...this.selected()];
    let completed = 0;
    let errors = 0;
    ids.forEach(id => {
      this.api.deletePhoto(id).subscribe({
        next: () => { completed++; if (completed + errors === count) { this.loadingSvc.hide(); this.toast.success(`${completed} foto eliminate`); this.load(); } },
        error: () => { errors++; if (completed + errors === count) { this.loadingSvc.hide(); this.toast.success(`${completed} foto eliminate`); this.load(); } },
      });
    });
  }

  badgeClass(status: ModerationStatus): string {
    if (status === 'pending') return 'badge-pending';
    return 'badge-approved';
  }
}
