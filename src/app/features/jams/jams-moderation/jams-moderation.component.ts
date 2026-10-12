import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AdminJam } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

@Component({
  selector: 'app-jams-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Jam</h1>
          <p class="text-sm text-gray-500 mt-1">{{ total() }} jam live</p>
        </div>
        <input
          type="search"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none min-w-[180px]"
          placeholder="Cerca nome / utente"
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
      } @else if (jams().length === 0) {
        <div class="card p-8 text-center text-sm text-gray-500">
          Nessuna jam live
        </div>
      } @else {
        <div class="space-y-3">
          @for (jam of jams(); track jam.id) {
            <div class="card p-4 cursor-pointer hover:bg-gray-50" (click)="openDetail(jam)">
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-sm text-gray-900 truncate">{{ jam.nome }}</p>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ jam.creator.username ?? jam.creator.nome ?? jam.creator.id }}
                    · {{ jam.starts_at | date:'dd/MM/yyyy HH:mm' }}
                    · {{ jam.participants_count }} partecipanti
                  </p>
                  @if (jam.location_primary?.nome) {
                    <p class="text-xs text-gray-400 mt-0.5 truncate">{{ jam.location_primary?.nome }}</p>
                  }
                </div>
                <button
                  (click)="deleteJam(jam); $event.stopPropagation()"
                  class="btn-danger py-1 px-3 text-xs justify-center shrink-0"
                >Elimina</button>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + jams().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }

      @if (selected(); as jam) {
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" (click)="closeDetail()">
          <div class="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="p-6 space-y-4">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">{{ jam.nome }}</h2>
                  <p class="text-sm text-gray-500">Jam live</p>
                </div>
                <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              <div class="space-y-2 text-sm">
                <p><span class="font-medium">Creator:</span> {{ jam.creator.username ?? jam.creator.nome ?? jam.creator.id }}</p>
                <p><span class="font-medium">Inizio:</span> {{ jam.starts_at | date:'dd/MM/yyyy HH:mm' }}</p>
                <p><span class="font-medium">Fine:</span> {{ jam.ends_at | date:'dd/MM/yyyy HH:mm' }}</p>
                <p><span class="font-medium">Partecipanti:</span> {{ jam.participants_count }}</p>
                @if (jam.note) {
                  <div class="bg-gray-50 rounded-lg p-3">
                    <p class="font-medium mb-1">Note</p>
                    <p class="whitespace-pre-wrap text-gray-800">{{ jam.note }}</p>
                  </div>
                }
                @if (jam.locations && jam.locations.length > 0) {
                  <div>
                    <p class="font-medium mb-1">Luoghi</p>
                    <ul class="list-disc pl-5 text-gray-700 space-y-1">
                      @for (loc of jam.locations; track loc.id) {
                        <li>
                          {{ loc.nome || (loc.lat | number:'1.4-4') + ', ' + (loc.lon | number:'1.4-4') }}
                          @if (loc.is_primary) { <span class="text-xs text-gray-400">(primary)</span> }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>

              <button (click)="deleteDetail()" class="btn-danger w-full">Elimina jam</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class JamsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly jams = signal<AdminJam[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly search = signal('');
  readonly selected = signal<AdminJam | null>(null);
  readonly pageSize = 20;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const q = this.search().trim() || undefined;
    this.api.getJams(this.pageSize, this.offset(), q).subscribe({
      next: (res) => {
        this.jams.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Errore nel caricamento jam');
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

  openDetail(jam: AdminJam): void {
    this.loadingSvc.show();
    this.api.getJamDetail(jam.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.loadingSvc.hide();
      },
      error: () => {
        this.selected.set(jam);
        this.loadingSvc.hide();
      },
    });
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  deleteJam(jam: AdminJam): void {
    if (!confirm(`Eliminare la jam "${jam.nome}"?`)) return;
    this.loadingSvc.show();
    this.api.deleteJam(jam.id).subscribe({
      next: () => {
        this.toast.success('Jam eliminata');
        this.loadingSvc.hide();
        this.load();
      },
      error: () => {
        this.toast.error('Errore eliminazione');
        this.loadingSvc.hide();
      },
    });
  }

  deleteDetail(): void {
    const jam = this.selected();
    if (!jam) return;
    this.deleteJam(jam);
    this.closeDetail();
  }
}
