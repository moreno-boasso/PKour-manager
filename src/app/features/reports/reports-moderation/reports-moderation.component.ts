import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SortField, SortOrder } from '../../../core/api/admin-api.service';
import { ManagerReport } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

type Tab = 'pending' | 'approved';

@Component({
  selector: 'app-reports-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900" i18n="@@reports.title">Moderazione Segnalazioni</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} segnalazioni trovate</p>
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
        <div class="space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          }
        </div>
      } @else if (reports().length === 0) {
        <app-empty-state type="reports" message="Nessuna segnalazione in questa categoria" />
      } @else {
        <div class="space-y-3">
          @for (report of reports(); track report.id) {
            <div class="card p-4 cursor-pointer hover:bg-gray-50" (click)="openReport(report)">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900">{{ report.user_username ?? report.user_nome ?? report.reported_by_user_id }}</span>
                    <span class="text-gray-300">·</span>
                    <span class="text-xs text-gray-500">{{ report.spot_nome }}</span>
                    <span [class]="report.status === 'pending' ? 'badge-pending' : 'badge-approved'">{{ report.status === 'approved' ? 'Approvata' : 'In attesa' }}</span>
                  </div>
                  <p class="text-xs font-medium text-gray-700 mt-1">Motivo: {{ report.motivo }}</p>
                  @if (report.descrizione) {
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ report.descrizione }}</p>
                  }
                  <p class="text-xs text-gray-400 mt-1">{{ report.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                  @if (report.status === 'pending') {
                    <button (click)="approve(report); $event.stopPropagation()" class="btn-primary py-1 px-3 text-xs justify-center" i18n="@@reports.approve">Approva</button>
                  }
                  <button (click)="deleteReport(report); $event.stopPropagation()" class="btn-danger py-1 px-3 text-xs justify-center" i18n="@@reports.delete">Elimina</button>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + reports().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.prev">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40" i18n="@@common.next">Successivo →</button>
          </div>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedReport(); as r) {
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" (click)="closeReport()">
          <div class="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="p-6 space-y-4">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">Dettaglio Segnalazione</h2>
                  <p class="text-sm text-gray-500">{{ r.spot_nome }}</p>
                </div>
                <button (click)="closeReport()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">Segnalato da:</span>
                  <span class="text-sm text-gray-700">{{ r.user_username ?? r.user_nome ?? r.reported_by_user_id }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm">Motivo:</span>
                  <span class="text-sm text-gray-700">{{ r.motivo }}</span>
                </div>
                @if (r.descrizione) {
                  <div class="bg-gray-50 rounded-lg p-3">
                    <p class="text-sm font-medium text-gray-700 mb-1">Descrizione:</p>
                    <p class="text-sm text-gray-800 whitespace-pre-wrap">{{ r.descrizione }}</p>
                  </div>
                }
                <div class="text-xs text-gray-400">
                  Creata: {{ r.created_at | date:'dd/MM/yyyy HH:mm' }}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">Status:</span>
                  <span [class]="r.status === 'pending' ? 'badge-pending' : 'badge-approved'">{{ r.status === 'approved' ? 'Approvata' : 'In attesa' }}</span>
                </div>
              </div>

              <div class="flex gap-2 pt-2">
                @if (r.status === 'pending') {
                  <button (click)="approveDetail()" class="btn-primary flex-1">Approva</button>
                }
                <button (click)="deleteDetail()" class="btn-danger flex-1">Elimina</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly reports = signal<ManagerReport[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly pageSize = 20;
  readonly sortBy = signal<SortField>('created_at');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly selectedReport = signal<ManagerReport | null>(null);

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvate' },
  ];

  readonly sortOptions: { value: SortField; label: string }[] = [
    { value: 'created_at', label: 'Data creazione' },
    { value: 'updated_at', label: 'Data aggiornamento' },
    { value: 'motivo', label: 'Motivo' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getReports(this.activeTab(), this.pageSize, this.offset(), this.sortBy(), this.sortOrder()).subscribe({
      next: (res) => { this.reports.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
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

  approve(r: ManagerReport): void {
    this.loadingSvc.show();
    this.api.patchReportStatus(r.id, 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Segnalazione approvata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }
  deleteReport(r: ManagerReport): void {
    if (!confirm('Eliminare questa segnalazione?')) return;
    this.loadingSvc.show();
    this.api.deleteReport(r.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Segnalazione eliminata'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }

  openReport(report: ManagerReport): void {
    this.selectedReport.set(report);
  }

  closeReport(): void {
    this.selectedReport.set(null);
  }

  approveDetail(): void {
    const r = this.selectedReport();
    if (!r) return;
    this.loadingSvc.show();
    this.api.patchReportStatus(r.id, 'approved').subscribe({
      next: () => {
        this.loadingSvc.hide();
        this.toast.success('Segnalazione approvata');
        this.selectedReport.set(null);
        this.load();
      },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'approvazione'); },
    });
  }

  deleteDetail(): void {
    const r = this.selectedReport();
    if (!r) return;
    if (!confirm('Eliminare questa segnalazione?')) return;
    this.loadingSvc.show();
    this.api.deleteReport(r.id).subscribe({
      next: () => {
        this.loadingSvc.hide();
        this.toast.success('Segnalazione eliminata');
        this.selectedReport.set(null);
        this.load();
      },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }
}
