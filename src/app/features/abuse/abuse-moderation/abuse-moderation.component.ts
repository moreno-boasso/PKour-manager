import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../../core/api/admin-api.service';
import {
  AbuseReport,
  AbuseReportStatus,
  AbuseReportTargetType,
  CommunityBanSeverity,
  TopReportedUser,
} from '../../../shared/models/admin.model';
import { banReasonsFor } from '../../../shared/ban-reason-presets';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

@Component({
  selector: 'app-abuse-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Segnalazioni</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} segnalazioni abuso</p>
      </div>

      @if (topUsers().length > 0) {
        <div class="card p-4 space-y-3">
          <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            Utenti più segnalati
          </h2>
          <div class="flex flex-wrap gap-2">
            @for (user of topUsers(); track user.user_id) {
              <div class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm flex items-center gap-2">
                <button
                  type="button"
                  class="text-left hover:text-amber-700"
                  (click)="filterByUser(user)"
                >
                  <span class="font-medium text-gray-900">
                    {{ user.username ?? user.nome ?? user.user_id }}
                  </span>
                  <span class="text-xs text-gray-500 ml-2">
                    {{ user.report_count }} tot
                    @if (user.pending_count > 0) {
                      · {{ user.pending_count }} pending
                    }
                  </span>
                </button>
                <button
                  type="button"
                  class="text-xs text-red-600 font-medium hover:underline"
                  (click)="openBan(user.user_id, user.username ?? user.nome ?? user.user_id)"
                >Ban</button>
              </div>
            }
          </div>
        </div>
      }

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
        <select
          [ngModel]="targetType()"
          (ngModelChange)="setTargetType($event)"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
        >
          <option value="">Tutti i tipi</option>
          <option value="spot">Spot</option>
          <option value="event">Eventi</option>
          <option value="jam">Jam</option>
          <option value="user">Utenti</option>
        </select>
        <input
          type="search"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none min-w-[180px]"
          placeholder="Cerca"
          [ngModel]="search()"
          (ngModelChange)="onSearch($event)"
        />
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          }
        </div>
      } @else if (reports().length === 0) {
        <div class="card p-8 text-center text-sm text-gray-500">
          Nessuna segnalazione in questa categoria
        </div>
      } @else {
        <div class="space-y-3">
          @for (report of reports(); track report.id) {
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {{ typeLabel(report.target_type) }}
                    </span>
                    <span class="font-semibold text-sm text-gray-900 truncate">
                      {{ targetLabel(report) }}
                    </span>
                    <span [class]="report.status === 'pending' ? 'badge-pending' : 'badge-approved'">
                      {{ report.status === 'pending' ? 'In attesa' : 'Revisionata' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">
                    Motivo: {{ reasonLabel(report.reason) }}
                    · Reporter:
                    {{ report.reporter.username ?? report.reporter.nome ?? report.reporter_user_id }}
                  </p>
                  @if (creatorLabel(report); as creator) {
                    <p class="text-xs text-gray-500">Creator: {{ creator }}</p>
                  }
                  @if (report.description) {
                    <p class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{{ report.description }}</p>
                  }
                  <p class="text-xs text-gray-400">{{ report.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                  <div class="flex flex-wrap gap-2 pt-1">
                    @if (contentLink(report); as link) {
                      <a
                        [routerLink]="link"
                        [queryParams]="contentQuery(report)"
                        class="text-xs text-primary font-medium hover:underline"
                      >
                        Apri contenuto →
                      </a>
                    }
                  </div>
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                  @if (report.status === 'pending') {
                    <button
                      (click)="markReviewed(report)"
                      class="btn-primary py-1 px-3 text-xs justify-center"
                    >Revisionata</button>
                  } @else {
                    <button
                      (click)="reopen(report)"
                      class="btn-ghost py-1 px-3 text-xs justify-center border border-gray-200"
                    >Riapri</button>
                  }
                  @if (banTargetUserId(report); as banUserId) {
                    <button
                      (click)="openBan(banUserId, banTargetLabel(report))"
                      class="btn-danger py-1 px-3 text-xs justify-center"
                    >Ban</button>
                  }
                  <button
                    (click)="remove(report)"
                    class="btn-ghost py-1 px-3 text-xs justify-center border border-gray-200"
                  >Elimina</button>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + reports().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }

      @if (banDialog(); as dialog) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.65)" (click)="closeBan()">
          <div
            class="rounded-xl max-w-md w-full p-6 space-y-4"
            style="background:var(--bg2);border:1px solid var(--border)"
            (click)="$event.stopPropagation()"
          >
            <h2 class="text-lg font-bold" style="color:var(--text)">Ban {{ dialog.label }}</h2>
            <p class="text-xs break-all" style="color:var(--text-dim)">{{ dialog.userId }}</p>
            <label class="block text-sm">
              <span style="color:var(--text-dim)">Severity</span>
              <select
                class="mt-1 w-full rounded-lg px-3 py-2 text-sm outline-none"
                style="background:var(--bg3);border:1px solid var(--border);color:var(--text)"
                [ngModel]="banSeverity"
                (ngModelChange)="onBanSeverityChange($event)"
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
                [(ngModel)]="banReason"
              >
                <option value="" disabled>Seleziona un motivo</option>
                @for (reason of banReasonOptions(); track reason) {
                  <option [value]="reason">{{ reason }}</option>
                }
              </select>
            </label>
            <div class="flex gap-2 pt-2">
              <button (click)="submitBan()" class="btn-danger flex-1">Conferma ban</button>
              <button (click)="closeBan()" class="btn-ghost flex-1" style="border:1px solid var(--border)">Annulla</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AbuseModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly reports = signal<AbuseReport[]>([]);
  readonly topUsers = signal<TopReportedUser[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<AbuseReportStatus>('pending');
  readonly targetType = signal<AbuseReportTargetType | ''>('');
  readonly search = signal('');
  readonly banDialog = signal<{ userId: string; label: string } | null>(null);
  readonly pageSize = 20;

  banSeverity: CommunityBanSeverity = 'light';
  banReason = '';
  readonly banReasonOptions = signal<string[]>(banReasonsFor('light'));

  readonly tabs: { value: AbuseReportStatus; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'reviewed', label: 'Revisionate' },
  ];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadTopUsers();
    this.load();
  }

  typeLabel(type: AbuseReportTargetType): string {
    switch (type) {
      case 'spot':
        return 'Spot';
      case 'event':
        return 'Evento';
      case 'jam':
        return 'Jam';
      case 'user':
        return 'Utente';
    }
  }

  reasonLabel(reason: string): string {
    const map: Record<string, string> = {
      no_longer_exists: 'Non esiste più',
      profile_photo: 'Foto profilo',
      description: 'Descrizione',
      username: 'Username',
      impersonation: 'Impersonificazione',
      spam: 'Spam',
      misinformation: 'Info false',
      illegal_content: 'Contenuto illegale',
      harassment: 'Molestie',
      offensive_language: 'Linguaggio offensivo',
      hate_or_discrimination: 'Odio / discriminazione',
      sexual_content: 'Contenuto sessuale',
      violence: 'Violenza',
      other: 'Altro',
    };
    return map[reason] ?? reason;
  }

  targetLabel(report: AbuseReport): string {
    const snap = report.snapshot ?? {};
    if (report.target_type === 'user') {
      return String(snap['username'] ?? snap['nome'] ?? snap['label'] ?? report.target_id);
    }
    return String(snap['nome'] ?? snap['label'] ?? report.target_id);
  }

  creatorLabel(report: AbuseReport): string | null {
    if (report.target_type !== 'event' && report.target_type !== 'jam') {
      return null;
    }
    const creator = report.snapshot?.creator;
    if (!creator) return null;
    return creator.username ?? creator.nome ?? creator.id;
  }

  contentLink(report: AbuseReport): string[] | null {
    if (!this.contentQuery(report)) return null;
    switch (report.target_type) {
      case 'spot':
        return ['/spots'];
      case 'event':
        return ['/events'];
      case 'jam':
        return ['/jams'];
      case 'user':
        return null;
    }
  }

  contentQuery(report: AbuseReport): { id: string } | null {
    if (report.target_type === 'user') return null;
    const id = String(report.target_id ?? '').trim();
    if (!id) return null;
    return { id };
  }

  load(): void {
    this.loading.set(true);
    const q = this.search().trim() || undefined;
    const type = this.targetType();
    this.api
      .getAbuseReports(
        this.activeTab(),
        this.pageSize,
        this.offset(),
        type || undefined,
        q
      )
      .subscribe({
        next: (res) => {
          this.reports.set(res.data);
          this.total.set(res.pagination.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Errore nel caricamento segnalazioni');
        },
      });
  }

  loadTopUsers(): void {
    this.api.getTopReportedUsers(12).subscribe({
      next: (res) => this.topUsers.set(res.data ?? []),
      error: () => this.topUsers.set([]),
    });
  }

  setTab(tab: AbuseReportStatus): void {
    this.activeTab.set(tab);
    this.offset.set(0);
    this.load();
  }

  setTargetType(value: AbuseReportTargetType | ''): void {
    this.targetType.set(value);
    this.offset.set(0);
    this.load();
  }

  onSearch(value: string): void {
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.offset.set(0);
      this.load();
    }, 350);
  }

  filterByUser(user: TopReportedUser): void {
    this.targetType.set('user');
    this.search.set(user.username ?? user.user_id);
    this.offset.set(0);
    this.activeTab.set('pending');
    this.load();
  }

  prevPage(): void {
    this.offset.update((v) => Math.max(0, v - this.pageSize));
    this.load();
  }

  nextPage(): void {
    this.offset.update((v) => v + this.pageSize);
    this.load();
  }

  markReviewed(report: AbuseReport): void {
    this.loadingSvc.show();
    this.api.patchAbuseReportStatus(report.id, 'reviewed').subscribe({
      next: () => {
        this.toast.success('Segnalazione revisionata');
        this.loadingSvc.hide();
        this.load();
        this.loadTopUsers();
      },
      error: () => {
        this.toast.error('Errore aggiornamento');
        this.loadingSvc.hide();
      },
    });
  }

  reopen(report: AbuseReport): void {
    this.loadingSvc.show();
    this.api.patchAbuseReportStatus(report.id, 'pending').subscribe({
      next: () => {
        this.toast.success('Segnalazione riaperta');
        this.loadingSvc.hide();
        this.load();
        this.loadTopUsers();
      },
      error: () => {
        this.toast.error('Errore aggiornamento');
        this.loadingSvc.hide();
      },
    });
  }

  remove(report: AbuseReport): void {
    if (!confirm('Eliminare questa segnalazione?')) return;
    this.loadingSvc.show();
    this.api.deleteAbuseReport(report.id).subscribe({
      next: () => {
        this.toast.success('Segnalazione eliminata');
        this.loadingSvc.hide();
        this.load();
        this.loadTopUsers();
      },
      error: () => {
        this.toast.error('Errore eliminazione');
        this.loadingSvc.hide();
      },
    });
  }

  banTargetUserId(report: AbuseReport): string | null {
    if (report.target_type === 'user') {
      return report.target_id || null;
    }
    if (report.target_type === 'event' || report.target_type === 'jam') {
      return report.snapshot?.creator?.id ?? null;
    }
    return null;
  }

  banTargetLabel(report: AbuseReport): string {
    if (report.target_type === 'user') {
      return this.targetLabel(report);
    }
    return this.creatorLabel(report) ?? report.target_id;
  }

  openBan(userId: string, label: string): void {
    this.banSeverity = 'light';
    this.banReasonOptions.set(banReasonsFor('light'));
    this.banReason = '';
    this.banDialog.set({ userId, label });
  }

  onBanSeverityChange(value: CommunityBanSeverity): void {
    this.banSeverity = value;
    const options = banReasonsFor(value);
    this.banReasonOptions.set(options);
    if (!options.includes(this.banReason)) {
      this.banReason = '';
    }
  }

  closeBan(): void {
    this.banDialog.set(null);
  }

  submitBan(): void {
    const dialog = this.banDialog();
    if (!dialog) return;
    const reason = this.banReason.trim();
    if (!reason) {
      this.toast.error('Seleziona un motivo');
      return;
    }
    this.loadingSvc.show();
    this.api
      .createCommunityBan({
        user_id: dialog.userId,
        severity: this.banSeverity,
        reason,
      })
      .subscribe({
        next: () => {
          this.toast.success('Utente bannato');
          this.loadingSvc.hide();
          this.closeBan();
        },
        error: () => {
          this.toast.error('Errore ban');
          this.loadingSvc.hide();
        },
      });
  }
}
