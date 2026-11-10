import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { BugReport, BugReportArea } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

@Component({
  selector: 'app-bugs-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Bug segnalati</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} bug aperti</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <select
          [ngModel]="area()"
          (ngModelChange)="setArea($event)"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
        >
          <option value="">Tutte le aree</option>
          @for (opt of areaOptions; track opt.value) {
            <option [value]="opt.value">{{ opt.label }}</option>
          }
        </select>
        <input
          type="search"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none min-w-[180px]"
          placeholder="Cerca messaggio, utente…"
          [ngModel]="search()"
          (ngModelChange)="onSearch($event)"
        />
      </div>

      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="card p-4 animate-pulse space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/3"></div>
              <div class="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          }
        </div>
      } @else if (reports().length === 0) {
        <div class="card p-8 text-center text-sm text-gray-500">
          Nessun bug segnalato
        </div>
      } @else {
        <div class="space-y-3">
          @for (report of reports(); track report.id) {
            <div class="card p-4">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0 space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                      {{ areaLabel(report.area) }}
                    </span>
                    <span class="badge-pending">Aperto</span>
                  </div>
                  <p class="text-sm text-gray-900 whitespace-pre-wrap">{{ report.message }}</p>
                  <p class="text-xs text-gray-500">
                    Reporter:
                    {{
                      report.reporter.username ??
                        report.reporter.nome ??
                        report.reporter_name
                    }}
                    · v{{ report.app_version }}
                  </p>
                  <p class="text-xs text-gray-400 line-clamp-2" [title]="report.device_info">
                    {{ report.device_info }}
                  </p>
                  <p class="text-xs text-gray-400">
                    {{ report.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </p>
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                  <button
                    (click)="resolve(report)"
                    class="btn-primary py-1 px-3 text-xs justify-center"
                  >
                    Risolto
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">
            {{ offset() + 1 }}–{{ offset() + reports().length }} di {{ total() }}
          </p>
          <div class="flex gap-2">
            <button
              [disabled]="offset() === 0"
              (click)="prevPage()"
              class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40"
            >
              ← Precedente
            </button>
            <button
              [disabled]="offset() + pageSize >= total()"
              (click)="nextPage()"
              class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40"
            >
              Successivo →
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class BugsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly reports = signal<BugReport[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly area = signal<BugReportArea | ''>('');
  readonly search = signal('');
  readonly pageSize = 20;

  readonly areaOptions: { value: BugReportArea; label: string }[] = [
    { value: 'add_spot', label: 'Aggiungi spot' },
    { value: 'auth', label: 'Auth' },
    { value: 'home', label: 'Home' },
    { value: 'profile', label: 'Profilo' },
    { value: 'settings', label: 'Impostazioni' },
    { value: 'spots', label: 'Spot' },
    { value: 'spot_detail', label: 'Dettaglio spot' },
    { value: 'trick_attempts', label: 'Tentativi trick' },
    { value: 'trick_detail', label: 'Dettaglio trick' },
    { value: 'tricks', label: 'Tricks' },
    { value: 'generic', label: 'Generico' },
  ];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  areaLabel(area: string): string {
    return this.areaOptions.find((o) => o.value === area)?.label ?? area;
  }

  load(): void {
    this.loading.set(true);
    const q = this.search().trim() || undefined;
    const area = this.area();
    this.api.getBugReports(this.pageSize, this.offset(), area || undefined, q).subscribe({
      next: (res) => {
        this.reports.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Errore nel caricamento bug');
      },
    });
  }

  setArea(value: BugReportArea | ''): void {
    this.area.set(value);
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

  prevPage(): void {
    this.offset.update((v) => Math.max(0, v - this.pageSize));
    this.load();
  }

  nextPage(): void {
    this.offset.update((v) => v + this.pageSize);
    this.load();
  }

  resolve(report: BugReport): void {
    if (!confirm('Segnare questo bug come risolto? Verrà eliminato.')) return;
    this.loadingSvc.show();
    this.api.resolveBugReport(report.id).subscribe({
      next: () => {
        this.toast.success('Bug risolto');
        this.loadingSvc.hide();
        this.load();
      },
      error: () => {
        this.toast.error('Errore risoluzione bug');
        this.loadingSvc.hide();
      },
    });
  }
}
