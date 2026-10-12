import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { AdminEvent, CommunityItemStatus } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

type Tab = CommunityItemStatus;

@Component({
  selector: 'app-events-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Moderazione Eventi</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} eventi trovati</p>
      </div>

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
      } @else if (events().length === 0) {
        <div class="card p-8 text-center text-sm text-gray-500">
          Nessun evento in questa categoria
        </div>
      } @else {
        <div class="space-y-3">
          @for (event of events(); track event.id) {
            <div class="card p-4 cursor-pointer hover:bg-gray-50" (click)="openDetail(event)">
              <div class="flex items-start gap-4">
                <div class="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                  @if (event.banner_url) {
                    <img [src]="event.banner_url" [alt]="event.nome" class="w-full h-full object-cover" />
                  } @else {
                    <div class="w-full h-full flex items-center justify-center text-xl">📅</div>
                  }
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-sm text-gray-900 truncate">{{ event.nome }}</span>
                    <span [class]="statusBadge(event.status)">{{ statusLabel(event.status) }}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ event.creator.username ?? event.creator.nome ?? event.creator.id }}
                    · {{ event.starts_at | date:'dd/MM/yyyy HH:mm' }}
                    · {{ event.interested_count }} interessati
                  </p>
                  @if (event.location_primary?.nome) {
                    <p class="text-xs text-gray-400 mt-0.5 truncate">{{ event.location_primary?.nome }}</p>
                  }
                </div>
                <div class="flex flex-col gap-1.5 shrink-0" (click)="$event.stopPropagation()">
                  @if (event.status === 'pending') {
                    <button (click)="approve(event)" class="btn-primary py-1 px-3 text-xs justify-center">Approva</button>
                    <button (click)="reject(event)" class="btn-danger py-1 px-3 text-xs justify-center">Rifiuta</button>
                  } @else {
                    <button (click)="reject(event)" class="btn-danger py-1 px-3 text-xs justify-center">Elimina</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + events().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }

      @if (selected(); as e) {
        <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" (click)="closeDetail()">
          <div class="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="p-6 space-y-4">
              <div class="flex items-start justify-between">
                <div>
                  <h2 class="text-lg font-bold text-gray-900">{{ e.nome }}</h2>
                  <p class="text-sm text-gray-500">{{ statusLabel(e.status) }}</p>
                </div>
                <button (click)="closeDetail()" class="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>

              @if (e.banner_url) {
                <img [src]="e.banner_url" [alt]="e.nome" class="w-full max-h-48 object-cover rounded-lg" />
              }

              <div class="space-y-2 text-sm">
                <p><span class="font-medium">Creator:</span> {{ e.creator.username ?? e.creator.nome ?? e.creator.id }}</p>
                <p><span class="font-medium">Inizio:</span> {{ e.starts_at | date:'dd/MM/yyyy HH:mm' }}</p>
                <p><span class="font-medium">Fine:</span> {{ e.ends_at | date:'dd/MM/yyyy HH:mm' }}</p>
                <p><span class="font-medium">Interessati:</span> {{ e.interested_count }}</p>
                @if (e.contatto) {
                  <p><span class="font-medium">Contatto:</span> {{ e.contatto }}</p>
                }
                @if (e.link_evento) {
                  <p><span class="font-medium">Link:</span> {{ e.link_evento }}</p>
                }
                @if (e.costo_label || e.costo_amount != null) {
                  <p>
                    <span class="font-medium">Costo:</span>
                    {{ e.costo_label || (e.costo_amount + ' ' + (e.costo_currency || 'EUR')) }}
                  </p>
                }
                @if (e.note) {
                  <div class="bg-gray-50 rounded-lg p-3">
                    <p class="font-medium mb-1">Note</p>
                    <p class="whitespace-pre-wrap text-gray-800">{{ e.note }}</p>
                  </div>
                }
                @if (e.locations && e.locations.length > 0) {
                  <div>
                    <p class="font-medium mb-1">Luoghi</p>
                    <ul class="list-disc pl-5 text-gray-700 space-y-1">
                      @for (loc of e.locations; track loc.id) {
                        <li>
                          {{ loc.nome || (loc.lat | number:'1.4-4') + ', ' + (loc.lon | number:'1.4-4') }}
                          @if (loc.is_primary) { <span class="text-xs text-gray-400">(primary)</span> }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>

              <div class="flex gap-2 pt-2">
                @if (e.status === 'pending') {
                  <button (click)="approveDetail()" class="btn-primary flex-1">Approva</button>
                  <button (click)="rejectDetail()" class="btn-danger flex-1">Rifiuta</button>
                } @else {
                  <button (click)="rejectDetail()" class="btn-danger flex-1">Elimina</button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class EventsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly events = signal<AdminEvent[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly search = signal('');
  readonly selected = signal<AdminEvent | null>(null);
  readonly pageSize = 20;

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvati' },
    { value: 'ended', label: 'Terminati' },
  ];

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  statusLabel(status: CommunityItemStatus): string {
    switch (status) {
      case 'pending':
        return 'In attesa';
      case 'approved':
        return 'Approvato';
      case 'ended':
        return 'Terminato';
    }
  }

  statusBadge(status: CommunityItemStatus): string {
    if (status === 'pending') return 'badge-pending';
    if (status === 'approved') return 'badge-approved';
    return 'text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600';
  }

  load(): void {
    this.loading.set(true);
    const q = this.search().trim() || undefined;
    this.api.getEvents(this.activeTab(), this.pageSize, this.offset(), q).subscribe({
      next: (res) => {
        this.events.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Errore nel caricamento eventi');
      },
    });
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
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

  openDetail(event: AdminEvent): void {
    this.loadingSvc.show();
    this.api.getEventDetail(event.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.loadingSvc.hide();
      },
      error: () => {
        this.selected.set(event);
        this.loadingSvc.hide();
      },
    });
  }

  closeDetail(): void {
    this.selected.set(null);
  }

  approve(event: AdminEvent): void {
    this.loadingSvc.show();
    this.api.approveEvent(event.id).subscribe({
      next: () => {
        this.toast.success('Evento approvato');
        this.loadingSvc.hide();
        this.load();
      },
      error: () => {
        this.toast.error('Errore approvazione');
        this.loadingSvc.hide();
      },
    });
  }

  reject(event: AdminEvent): void {
    const label = event.status === 'pending' ? 'rifiutare' : 'eliminare';
    if (!confirm(`Confermi di ${label} "${event.nome}"?`)) return;
    this.loadingSvc.show();
    this.api.deleteEvent(event.id).subscribe({
      next: () => {
        this.toast.success(event.status === 'pending' ? 'Evento rifiutato' : 'Evento eliminato');
        this.loadingSvc.hide();
        this.load();
      },
      error: () => {
        this.toast.error('Errore eliminazione');
        this.loadingSvc.hide();
      },
    });
  }

  approveDetail(): void {
    const e = this.selected();
    if (!e) return;
    this.approve(e);
    this.closeDetail();
  }

  rejectDetail(): void {
    const e = this.selected();
    if (!e) return;
    this.reject(e);
    this.closeDetail();
  }
}
