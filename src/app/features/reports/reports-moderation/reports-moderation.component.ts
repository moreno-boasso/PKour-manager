import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ManagerReport } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

type Tab = 'pending' | 'resolved';

@Component({
  selector: 'app-reports-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900" i18n="@@reports.title">Moderazione Segnalazioni</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} segnalazioni trovate</p>
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
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900">{{ report.user_username ?? report.user_nome ?? report.reported_by_user_id }}</span>
                    <span class="text-gray-300">·</span>
                    <span class="text-xs text-gray-500">{{ report.spot_nome }}</span>
                    <span [class]="report.status === 'pending' ? 'badge-pending' : 'badge-approved'">{{ report.status }}</span>
                  </div>
                  <p class="text-xs font-medium text-gray-700 mt-1">Motivo: {{ report.motivo }}</p>
                  @if (report.descrizione) {
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2">{{ report.descrizione }}</p>
                  }
                  <p class="text-xs text-gray-400 mt-1">{{ report.created_at | date:'dd/MM/yyyy HH:mm' }}</p>
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                  @if (report.status === 'pending') {
                    <button (click)="resolve(report)" class="btn-primary py-1 px-3 text-xs justify-center" i18n="@@reports.resolve">Risolvi</button>
                  }
                  <button (click)="deleteReport(report)" class="btn-ghost py-1 px-3 text-xs text-red-500 justify-center" i18n="@@reports.delete">Elimina</button>
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

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'resolved', label: 'Risolte' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getReports(this.activeTab(), this.pageSize, this.offset()).subscribe({
      next: (res) => { this.reports.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: Tab): void { this.activeTab.set(tab); this.offset.set(0); this.load(); }
  prevPage(): void { this.offset.update(v => Math.max(0, v - this.pageSize)); this.load(); }
  nextPage(): void { this.offset.update(v => v + this.pageSize); this.load(); }

  resolve(r: ManagerReport): void {
    this.loadingSvc.show();
    this.api.patchReportStatus(r.id, 'resolved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success('Segnalazione risolta'); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante la risoluzione'); },
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
}
