import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import {
  CommunityBan,
  CommunityBanSeverity,
} from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

@Component({
  selector: 'app-community-bans',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Ban community</h1>
          <p class="text-sm text-gray-500 mt-1">{{ total() }} ban attivi</p>
        </div>
        <button (click)="openCreate()" class="btn-primary py-2 px-4 text-sm">
          Nuovo ban
        </button>
      </div>

      <input
        type="search"
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none min-w-[220px]"
        placeholder="Cerca utente / motivo"
        [ngModel]="search()"
        (ngModelChange)="onSearch($event)"
      />

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          }
        </div>
      } @else if (bans().length === 0) {
        <div class="card p-8 text-center text-sm text-gray-500">
          Nessun ban attivo
        </div>
      } @else {
        <div class="space-y-3">
          @for (ban of bans(); track ban.id) {
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 space-y-1">
                  <p class="font-semibold text-sm text-gray-900">
                    {{ ban.user.username ?? ban.user.nome ?? ban.user_id }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ severityLabel(ban.severity) }}
                    · dal {{ ban.starts_at | date:'dd/MM/yyyy HH:mm' }}
                    @if (ban.ends_at) {
                      · fino al {{ ban.ends_at | date:'dd/MM/yyyy HH:mm' }}
                    } @else {
                      · permanente
                    }
                  </p>
                  @if (ban.reason) {
                    <p class="text-sm text-gray-700">{{ ban.reason }}</p>
                  }
                </div>
                <button
                  (click)="unban(ban)"
                  class="btn-primary py-1 px-3 text-xs justify-center shrink-0"
                >Unban</button>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + bans().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }

      @if (showCreate()) {
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" (click)="closeCreate()">
          <div class="bg-white rounded-xl max-w-md w-full p-6 space-y-4" (click)="$event.stopPropagation()">
            <h2 class="text-lg font-bold text-gray-900">Nuovo ban</h2>
            <label class="block text-sm">
              <span class="text-gray-600">User ID</span>
              <input
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                [(ngModel)]="formUserId"
              />
            </label>
            <label class="block text-sm">
              <span class="text-gray-600">Severity</span>
              <select
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                [(ngModel)]="formSeverity"
              >
                <option value="light">Light (7 giorni)</option>
                <option value="medium">Medium (30 giorni)</option>
                <option value="permanent">Permanent</option>
              </select>
            </label>
            <label class="block text-sm">
              <span class="text-gray-600">Motivo (opz.)</span>
              <textarea
                rows="3"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary"
                [(ngModel)]="formReason"
              ></textarea>
            </label>
            <div class="flex gap-2 pt-2">
              <button (click)="submitCreate()" class="btn-primary flex-1">Ban</button>
              <button (click)="closeCreate()" class="btn-ghost flex-1 border border-gray-200">Annulla</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CommunityBansComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly bans = signal<CommunityBan[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly search = signal('');
  readonly showCreate = signal(false);
  readonly pageSize = 20;

  formUserId = '';
  formSeverity: CommunityBanSeverity = 'light';
  formReason = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  severityLabel(severity: CommunityBanSeverity): string {
    switch (severity) {
      case 'light':
        return 'Light (7g)';
      case 'medium':
        return 'Medium (30g)';
      case 'permanent':
        return 'Permanent';
    }
  }

  load(): void {
    this.loading.set(true);
    const q = this.search().trim() || undefined;
    this.api.getCommunityBans(this.pageSize, this.offset(), q).subscribe({
      next: (res) => {
        this.bans.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Errore caricamento ban');
      },
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.offset.set(0);
      this.load();
    }, 350);
  }

  prevPage(): void {
    this.offset.update((v) => Math.max(0, v - this.pageSize));
    this.load();
  }

  nextPage(): void {
    this.offset.update((v) => v + this.pageSize);
    this.load();
  }

  openCreate(userId?: string): void {
    this.formUserId = userId ?? '';
    this.formSeverity = 'light';
    this.formReason = '';
    this.showCreate.set(true);
  }

  closeCreate(): void {
    this.showCreate.set(false);
  }

  submitCreate(): void {
    const userId = this.formUserId.trim();
    if (!userId) {
      this.toast.error('User ID obbligatorio');
      return;
    }
    this.loadingSvc.show();
    this.api
      .createCommunityBan({
        user_id: userId,
        severity: this.formSeverity,
        reason: this.formReason.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Ban creato');
          this.loadingSvc.hide();
          this.closeCreate();
          this.load();
        },
        error: () => {
          this.toast.error('Errore creazione ban');
          this.loadingSvc.hide();
        },
      });
  }

  unban(ban: CommunityBan): void {
    if (!confirm(`Unban di ${ban.user.username ?? ban.user_id}?`)) return;
    this.loadingSvc.show();
    this.api.unbanCommunityBan(ban.id).subscribe({
      next: () => {
        this.toast.success('Utente sbannato');
        this.loadingSvc.hide();
        this.load();
      },
      error: () => {
        this.toast.error('Errore unban');
        this.loadingSvc.hide();
      },
    });
  }
}
