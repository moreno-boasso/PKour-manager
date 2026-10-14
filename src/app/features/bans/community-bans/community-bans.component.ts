import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import {
  AdminUserSearchHit,
  CommunityBan,
  CommunityBanSeverity,
} from '../../../shared/models/admin.model';
import { banReasonsFor } from '../../../shared/ban-reason-presets';
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
          <h1 class="text-2xl font-bold" style="color:var(--text)">Ban community</h1>
          <p class="text-sm mt-1" style="color:var(--text-dim)">{{ total() }} ban attivi</p>
        </div>
        <button (click)="openCreate()" class="btn-primary py-2 px-4 text-sm">
          Nuovo ban
        </button>
      </div>

      <input
        type="search"
        class="rounded-lg px-3 py-2 text-sm outline-none min-w-[220px]"
        style="background:var(--bg3);border:1px solid var(--border);color:var(--text)"
        placeholder="Cerca utente / motivo"
        [ngModel]="search()"
        (ngModelChange)="onSearch($event)"
      />

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 rounded w-1/3" style="background:var(--bg3)"></div>
              <div class="h-3 rounded w-full" style="background:var(--bg3)"></div>
            </div>
          }
        </div>
      } @else if (bans().length === 0) {
        <div class="card p-8 text-center text-sm" style="color:var(--text-dim)">
          Nessun ban attivo
        </div>
      } @else {
        <div class="space-y-3">
          @for (ban of bans(); track ban.id) {
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 space-y-1">
                  <p class="font-semibold text-sm" style="color:var(--text)">
                    {{ ban.user.username ?? ban.user.nome ?? ban.user_id }}
                  </p>
                  <p class="text-xs" style="color:var(--text-dim)">
                    {{ severityLabel(ban.severity) }}
                    · dal {{ ban.starts_at | date:'dd/MM/yyyy HH:mm' }}
                    @if (ban.ends_at) {
                      · fino al {{ ban.ends_at | date:'dd/MM/yyyy HH:mm' }}
                    } @else {
                      · permanente
                    }
                  </p>
                  @if (ban.reason) {
                    <p class="text-sm" style="color:var(--text)">{{ ban.reason }}</p>
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
          <p class="text-sm" style="color:var(--text-dim)">{{ offset() + 1 }}–{{ offset() + bans().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }

      @if (showCreate()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.65)" (click)="closeCreate()">
          <div
            class="rounded-xl max-w-md w-full p-6 space-y-4"
            style="background:var(--bg2);border:1px solid var(--border)"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-lg font-bold" style="color:var(--text)">Nuovo ban</h2>

            <label class="block text-sm">
              <span style="color:var(--text-dim)">Utente</span>
              @if (selectedUser(); as user) {
                <div
                  class="mt-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                  style="background:var(--bg3);border:1px solid var(--border)"
                >
                  <div class="min-w-0">
                    <p class="text-sm font-medium truncate" style="color:var(--text)">
                      {{ user.username ?? user.nome ?? user.id }}
                    </p>
                    <p class="text-xs truncate" style="color:var(--text-muted)">{{ user.id }}</p>
                  </div>
                  <button type="button" class="btn-ghost text-xs shrink-0" (click)="clearSelectedUser()">Cambia</button>
                </div>
              } @else {
                <input
                  type="search"
                  class="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style="background:var(--bg3);border:1px solid var(--border);color:var(--text)"
                  placeholder="Cerca per nome, username o id…"
                  [ngModel]="userQuery()"
                  (ngModelChange)="onUserQuery($event)"
                />
                @if (userSearching()) {
                  <p class="text-xs mt-1" style="color:var(--text-muted)">Ricerca…</p>
                } @else if (userHits().length > 0) {
                  <ul
                    class="mt-1 max-h-48 overflow-auto rounded-lg"
                    style="background:var(--bg3);border:1px solid var(--border)"
                  >
                    @for (hit of userHits(); track hit.id) {
                      <li>
                        <button
                          type="button"
                          class="w-full text-left px-3 py-2 text-sm hover:opacity-90"
                          style="color:var(--text)"
                          (click)="selectUser(hit)"
                        >
                          <span class="font-medium">{{ hit.username ?? hit.nome ?? hit.id }}</span>
                          <span class="block text-xs" style="color:var(--text-muted)">{{ hit.id }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                } @else if (userQuery().trim().length > 0) {
                  <p class="text-xs mt-1" style="color:var(--text-muted)">Nessun utente</p>
                }
              }
            </label>

            <label class="block text-sm">
              <span style="color:var(--text-dim)">Severity</span>
              <select
                class="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style="background:var(--bg3);border:1px solid var(--border);color:var(--text)"
                [ngModel]="formSeverity"
                (ngModelChange)="onSeverityChange($event)"
              >
                <option value="light">Light (7 giorni)</option>
                <option value="medium">Medium (30 giorni)</option>
                <option value="permanent">Permanent</option>
              </select>
            </label>

            <label class="block text-sm">
              <span style="color:var(--text-dim)">Motivo</span>
              <select
                class="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style="background:var(--bg3);border:1px solid var(--border);color:var(--text)"
                [(ngModel)]="formReason"
              >
                <option value="" disabled>Seleziona un motivo</option>
                @for (reason of reasonOptions(); track reason) {
                  <option [value]="reason">{{ reason }}</option>
                }
              </select>
            </label>

            <div class="flex gap-2 pt-2">
              <button (click)="submitCreate()" class="btn-primary flex-1">Ban</button>
              <button (click)="closeCreate()" class="btn-ghost flex-1" style="border:1px solid var(--border)">Annulla</button>
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
  readonly selectedUser = signal<AdminUserSearchHit | null>(null);
  readonly userQuery = signal('');
  readonly userHits = signal<AdminUserSearchHit[]>([]);
  readonly userSearching = signal(false);
  readonly reasonOptions = signal<string[]>(banReasonsFor('light'));
  readonly pageSize = 20;

  formSeverity: CommunityBanSeverity = 'light';
  formReason = '';

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private userSearchTimer: ReturnType<typeof setTimeout> | null = null;

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

  openCreate(): void {
    this.selectedUser.set(null);
    this.userQuery.set('');
    this.userHits.set([]);
    this.formSeverity = 'light';
    this.reasonOptions.set(banReasonsFor('light'));
    this.formReason = '';
    this.showCreate.set(true);
  }

  closeCreate(): void {
    this.showCreate.set(false);
  }

  onSeverityChange(value: CommunityBanSeverity): void {
    this.formSeverity = value;
    const options = banReasonsFor(value);
    this.reasonOptions.set(options);
    if (!options.includes(this.formReason)) {
      this.formReason = '';
    }
  }

  onUserQuery(value: string): void {
    this.userQuery.set(value);
    if (this.userSearchTimer) clearTimeout(this.userSearchTimer);
    const q = value.trim();
    if (q.length < 1) {
      this.userHits.set([]);
      this.userSearching.set(false);
      return;
    }
    this.userSearching.set(true);
    this.userSearchTimer = setTimeout(() => {
      this.api.searchUsers(q).subscribe({
        next: (res) => {
          this.userHits.set(res.data);
          this.userSearching.set(false);
        },
        error: () => {
          this.userHits.set([]);
          this.userSearching.set(false);
          this.toast.error('Errore ricerca utenti');
        },
      });
    }, 300);
  }

  selectUser(hit: AdminUserSearchHit): void {
    this.selectedUser.set(hit);
    this.userHits.set([]);
    this.userQuery.set('');
  }

  clearSelectedUser(): void {
    this.selectedUser.set(null);
  }

  submitCreate(): void {
    const user = this.selectedUser();
    if (!user) {
      this.toast.error('Seleziona un utente');
      return;
    }
    const reason = this.formReason.trim();
    if (!reason) {
      this.toast.error('Seleziona un motivo');
      return;
    }
    this.loadingSvc.show();
    this.api
      .createCommunityBan({
        user_id: user.id,
        severity: this.formSeverity,
        reason,
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
