import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AdminApiService, SortField, SortOrder } from '../../../core/api/admin-api.service';
import { AdminSpot, AdminSpotDetail, ModerationStatus } from '../../../shared/models/admin.model';
import { SwipeActionDirective } from '../../../shared/directives/swipe-action.directive';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';

type Tab = 'pending' | 'approved';
type MapView = 'satellite' | 'streetview';

@Component({
  selector: 'app-spots-moderation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DecimalPipe, SwipeActionDirective, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Moderazione Spot</h1>
        <p class="text-sm text-gray-500 mt-1">{{ total() }} spot trovati</p>
      </div>

      <!-- Tabs + Search + Sort -->
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
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          (keyup.enter)="search()"
          placeholder="Cerca per nome..."
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none w-48"
        />
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
        >{{ sortOrder() === 'asc' ? '↑' : '↓' }}</button>
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="card animate-pulse">
              <div class="h-36 bg-gray-200 rounded-t-xl"></div>
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
        @if (activeTab() === 'pending') {
          <p class="text-xs text-gray-400 text-center sm:hidden">← Elimina &nbsp;|&nbsp; Approva →</p>
        }
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (spot of spots(); track spot.id) {
            <div
              class="card overflow-hidden relative transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              appSwipeAction
              (swipeRight)="activeTab() === 'pending' && onSwipeRight(spot)"
              (swipeLeft)="activeTab() === 'pending' && onSwipeLeft(spot)"
              (click)="openDetail(spot)"
            >
              @if (swipingId() === spot.id && swipeDir() === 'right') {
                <div class="absolute inset-0 z-10 bg-emerald-500/20 flex items-center justify-start pl-6 rounded-xl">
                  <span class="text-emerald-600 font-bold text-lg">✓ Approva</span>
                </div>
              }
              @if (swipingId() === spot.id && swipeDir() === 'left') {
                <div class="absolute inset-0 z-10 bg-red-500/20 flex items-center justify-end pr-6 rounded-xl">
                  <span class="text-red-600 font-bold text-lg">✕ Elimina</span>
                </div>
              }
              <div class="h-36 bg-gray-100 relative">
                @if (spot.foto_principale_url) {
                  <img [src]="spot.foto_principale_url" [alt]="spot.nome" class="w-full h-full object-cover" />
                } @else {
                  <div class="w-full h-full flex items-center justify-center text-4xl text-gray-300">📍</div>
                }
                <span [class]="badgeClass(spot.status)" class="absolute top-2 right-2">{{ spot.status }}</span>
              </div>
              <div class="p-4">
                <p class="font-semibold text-gray-900 truncate">{{ spot.nome }}</p>
                <p class="text-xs text-gray-500 mt-0.5">{{ spot.tipo ?? '—' }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ spot.posizione.lat | number:'1.4-4' }}, {{ spot.posizione.lon | number:'1.4-4' }}</p>
              </div>
            </div>
          }
        </div>
        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">{{ offset() + 1 }}–{{ offset() + spots().length }} di {{ total() }}</p>
          <div class="flex gap-2">
            <button [disabled]="offset() === 0" (click)="prevPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">← Precedente</button>
            <button [disabled]="offset() + pageSize >= total()" (click)="nextPage()" class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40">Successivo →</button>
          </div>
        </div>
      }
    </div>

    <!-- Drawer dettaglio fullscreen -->
    @if (selectedDetail(); as d) {
      <div class="fixed inset-0 z-50 flex" (click)="closeDetail()">
        <div class="flex-1 bg-black/50 hidden sm:block"></div>
        <div class="w-full sm:max-w-2xl shadow-2xl flex flex-col overflow-hidden" style="background:var(--bg2);border-left:1px solid var(--border)" (click)="$event.stopPropagation()">

          <!-- Header sticky -->
          <div class="sticky top-0 px-5 py-4 flex items-center justify-between z-10 shrink-0" style="background:var(--bg2);border-bottom:1px solid var(--border)">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h2 class="font-bold text-lg text-gray-900 truncate">{{ d.nome }}</h2>
                <span [class]="badgeClass(d.status)">{{ d.status }}</span>
              </div>
              <p class="text-xs text-gray-500 mt-0.5">{{ d.tipo ?? '—' }} · {{ d.posizione.lat | number:'1.5-5' }}, {{ d.posizione.lon | number:'1.5-5' }}</p>
            </div>
            <button (click)="closeDetail()" class="text-2xl ml-3 shrink-0 transition-colors" style="color:var(--text-muted)" onmouseenter="this.style.color='var(--text)'" onmouseleave="this.style.color='var(--text-muted)'">✕</button>
          </div>

          <!-- Body scrollabile -->
          <div class="flex-1 overflow-y-auto">

            <!-- Map tabs -->
            <div class="flex border-b border-gray-100 bg-gray-50 shrink-0">
              <button
                (click)="mapView.set('satellite')"
                [class]="mapView() === 'satellite'
                  ? 'flex-1 py-2 text-xs font-semibold text-primary border-b-2 border-primary bg-white'
                  : 'flex-1 py-2 text-xs text-gray-500 hover:bg-gray-100'"
              >� Mappa</button>
              <button
                (click)="mapView.set('streetview')"
                [class]="mapView() === 'streetview'
                  ? 'flex-1 py-2 text-xs font-semibold text-primary border-b-2 border-primary bg-white'
                  : 'flex-1 py-2 text-xs text-gray-500 hover:bg-gray-100'"
              >🚶 Street View</button>
            </div>

            <!-- Map embed -->
            <div class="w-full h-72 relative" style="background:var(--bg3)">
              @if (mapView() === 'satellite') {
                <iframe
                  [src]="mapsUrl()"
                  class="w-full h-full border-0"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  allowfullscreen
                ></iframe>
              } @else {
                <iframe
                  [src]="streetViewUrl()"
                  class="w-full h-full border-0"
                  loading="lazy"
                  referrerpolicy="no-referrer-when-downgrade"
                  allowfullscreen
                ></iframe>
              }
              <!-- Link apri in Maps -->
              <a
                [href]="mapView() === 'satellite'
                  ? 'https://www.openstreetmap.org/?mlat=' + d.posizione.lat + '&mlon=' + d.posizione.lon + '#map=18/' + d.posizione.lat + '/' + d.posizione.lon
                  : 'https://maps.google.com/?q=' + d.posizione.lat + ',' + d.posizione.lon + '&layer=c'"
                target="_blank"
                class="absolute bottom-2 right-2 bg-white text-xs px-2 py-1 rounded shadow text-blue-600 hover:underline"
                (click)="$event.stopPropagation()"
              >Apri ↗</a>
            </div>

            <div class="p-5 space-y-5">

              <!-- Foto -->
              @if (d.foto.length > 0) {
                <div>
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Foto ({{ d.foto.length }})</p>
                  <div class="flex gap-2 overflow-x-auto pb-1">
                    @for (foto of d.foto; track foto.id) {
                      <img [src]="foto.url" class="h-28 w-40 object-cover rounded-lg shrink-0 cursor-pointer hover:opacity-90" (click)="openPhotoFullscreen(foto.url)" />
                    }
                  </div>
                </div>
              }

              <!-- Info generali -->
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="rounded-lg p-3" style="background:var(--bg3);border:1px solid var(--border)">
                  <p class="text-xs mb-1" style="color:var(--text-muted)">Tipo</p>
                  <p class="font-medium" style="color:var(--text)">{{ d.tipo ?? '—' }}</p>
                </div>
                <div class="rounded-lg p-3" style="background:var(--bg3);border:1px solid var(--border)">
                  <p class="text-xs mb-1" style="color:var(--text-muted)">Visitatori</p>
                  <p class="font-medium" style="color:var(--text)">{{ d.visitatori_count }}</p>
                </div>
                @if (d.rating?.qualita_avg != null) {
                  <div class="rounded-lg p-3" style="background:var(--bg3);border:1px solid var(--border)">
                    <p class="text-xs mb-1" style="color:var(--text-muted)">Qualità media</p>
                    <p class="font-medium" style="color:var(--text)">{{ d.rating!.qualita_avg! | number:'1.1-1' }} / 5</p>
                  </div>
                }
                @if (d.rating?.sicurezza_avg != null) {
                  <div class="rounded-lg p-3" style="background:var(--bg3);border:1px solid var(--border)">
                    <p class="text-xs mb-1" style="color:var(--text-muted)">Sicurezza media</p>
                    <p class="font-medium" style="color:var(--text)">{{ d.rating!.sicurezza_avg! | number:'1.1-1' }} / 5</p>
                  </div>
                }
              </div>

              <!-- Features -->
              @if (d.features.length > 0) {
                <div>
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Features</p>
                  <div class="flex flex-wrap gap-1.5">
                    @for (f of d.features; track f) {
                      <span class="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">{{ f }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Aggiunto da -->
              @if (d.aggiunto_da) {
                <div class="flex items-center gap-3 rounded-lg p-3" style="background:var(--bg3);border:1px solid var(--border)">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm" style="background:rgba(18,104,105,0.2)">👤</div>
                  <div>
                    <p class="text-xs" style="color:var(--text-muted)">Aggiunto da</p>
                    <p class="text-sm font-medium" style="color:var(--text)">{{ d.aggiunto_da.username ?? d.aggiunto_da.nome ?? d.aggiunto_da.user_id }}</p>
                  </div>
                </div>
              }

              <!-- Recensioni recenti -->
              @if (d.recensioni.length > 0) {
                <div>
                  <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recensioni recenti</p>
                  <div class="space-y-2">
                    @for (r of d.recensioni; track r.user.user_id) {
                      <div class="rounded-lg p-3 text-sm" style="background:var(--bg3);border:1px solid var(--border)">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-medium" style="color:var(--text)">{{ r.user.username ?? r.user.nome ?? r.user.user_id }}</span>
                          <span class="text-xs" style="color:var(--text-muted)">Q:{{ r.qualita }} S:{{ r.sicurezza }}</span>
                        </div>
                        @if (r.commento) {
                          <p class="text-xs line-clamp-2" style="color:var(--text-dim)">{{ r.commento }}</p>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Segnalazioni -->
              @if (d.segnalazioni.length > 0) {
                <div>
                  <p class="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">⚠ Segnalazioni ({{ d.segnalazioni.length }})</p>
                  <div class="space-y-2">
                    @for (s of d.segnalazioni; track s.user.user_id) {
                      <div class="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                        <p class="font-medium text-red-800">{{ s.motivo }}</p>
                        @if (s.descrizione) {
                          <p class="text-red-600 text-xs mt-0.5">{{ s.descrizione }}</p>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

            </div>
          </div>

          <!-- Footer azioni sticky -->
          <div class="sticky bottom-0 px-5 py-4 flex gap-3 shrink-0" style="background:var(--bg2);border-top:1px solid var(--border)">
            @if (d.status === 'pending') {
              <button (click)="approveDetail()" class="btn-primary flex-1 py-3 text-sm font-semibold">✓ Approva</button>
            } @else {
              <div class="flex-1 flex items-center justify-center">
                <span class="badge-approved text-sm px-4 py-2">✓ Approvato</span>
              </div>
            }
            <button (click)="rejectDetail()" class="btn-danger flex-1 py-3 text-sm font-semibold">✕ Elimina</button>
          </div>
        </div>
      </div>
    }

    <!-- Foto fullscreen viewer -->
    @if (fullscreenPhoto()) {
      <div class="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" (click)="fullscreenPhoto.set(null)">
        <img [src]="fullscreenPhoto()!" class="max-h-full max-w-full object-contain" />
        <button class="absolute top-4 right-4 text-white text-3xl" (click)="fullscreenPhoto.set(null)">✕</button>
      </div>
    }
  `,
})
export class SpotsModerationComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal(true);
  readonly spots = signal<AdminSpot[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly activeTab = signal<Tab>('pending');
  readonly selectedDetail = signal<AdminSpotDetail | null>(null);
  readonly swipingId = signal<number | null>(null);
  readonly swipeDir = signal<'left' | 'right' | null>(null);
  readonly mapView = signal<MapView>('satellite');
  readonly fullscreenPhoto = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly pageSize = 24;
  readonly sortBy = signal<SortField>('created_at');
  readonly sortOrder = signal<SortOrder>('desc');

  readonly mapsUrl = computed<SafeResourceUrl>(() => {
    const d = this.selectedDetail();
    if (!d) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const { lat, lon } = d.posizione;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.002},${lat - 0.002},${lon + 0.002},${lat + 0.002}&layer=mapnik&marker=${lat},${lon}`
    );
  });

  readonly streetViewUrl = computed<SafeResourceUrl>(() => {
    const d = this.selectedDetail();
    if (!d) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    const { lat, lon } = d.posizione;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${lat},${lon}&layer=c&cbll=${lat},${lon}&cbp=12,0,0,0,0&output=svembed`
    );
  });

  readonly sortOptions: { value: SortField; label: string }[] = [
    { value: 'created_at', label: 'Data creazione' },
    { value: 'updated_at', label: 'Data aggiornamento' },
    { value: 'nome', label: 'Nome' },
  ];

  readonly tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'In attesa' },
    { value: 'approved', label: 'Approvati' },
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.getSpots(
      this.activeTab(), this.pageSize, this.offset(),
      this.searchQuery() || undefined, this.sortBy(), this.sortOrder()
    ).subscribe({
      next: (res) => { this.spots.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setSortBy(value: SortField): void { this.sortBy.set(value); this.offset.set(0); this.load(); }
  toggleSortOrder(): void { this.sortOrder.update(o => o === 'asc' ? 'desc' : 'asc'); this.load(); }
  setTab(tab: Tab): void { this.activeTab.set(tab); this.offset.set(0); this.load(); }
  prevPage(): void { this.offset.update(v => Math.max(0, v - this.pageSize)); this.load(); }
  nextPage(): void { this.offset.update(v => v + this.pageSize); this.load(); }

  search(): void {
    this.offset.set(0);
    this.api['cache'].invalidate('spots-');
    this.load();
  }

  openDetail(spot: AdminSpot): void {
    this.mapView.set('satellite');
    this.api.getSpotDetail(spot.id).subscribe({ next: (d) => this.selectedDetail.set(d) });
  }

  closeDetail(): void { this.selectedDetail.set(null); }

  openPhotoFullscreen(url: string): void { this.fullscreenPhoto.set(url); }

  approve(spot: AdminSpot): void {
    this.loadingSvc.show();
    this.api.patchSpotStatus(spot.id, 'approved').subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${spot.nome}" approvato`); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore approvazione'); },
    });
  }

  approveDetail(): void {
    const d = this.selectedDetail();
    if (!d) return;
    this.loadingSvc.show();
    this.api.patchSpotStatus(d.id, 'approved').subscribe({
      next: (updated) => { this.loadingSvc.hide(); this.toast.success(`"${d.nome}" approvato`); this.selectedDetail.set(updated); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore approvazione'); },
    });
  }

  rejectDetail(): void {
    const d = this.selectedDetail();
    if (!d || !confirm(`Eliminare definitivamente "${d.nome}"?\n\nQuesta azione non può essere annullata.`)) return;
    this.loadingSvc.show();
    this.api.deleteSpot(d.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${d.nome}" eliminato`); this.selectedDetail.set(null); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore eliminazione'); },
    });
  }

  onSwipeRight(spot: AdminSpot): void {
    this.swipingId.set(spot.id); this.swipeDir.set('right');
    setTimeout(() => {
      this.swipingId.set(null); this.swipeDir.set(null);
      this.api.patchSpotStatus(spot.id, 'approved').subscribe({
        next: () => { this.toast.success(`"${spot.nome}" approvato`); this.load(); },
        error: () => this.toast.error('Errore approvazione'),
      });
    }, 350);
  }

  onSwipeLeft(spot: AdminSpot): void {
    this.swipingId.set(spot.id); this.swipeDir.set('left');
    setTimeout(() => {
      this.swipingId.set(null); this.swipeDir.set(null);
      this.api.deleteSpot(spot.id).subscribe({
        next: () => { this.toast.success(`"${spot.nome}" eliminato`); this.load(); },
        error: () => this.toast.error('Errore eliminazione'),
      });
    }, 350);
  }

  badgeClass(status: ModerationStatus): string {
    const base = 'text-xs font-semibold px-2 py-0.5 rounded-full';
    if (status === 'pending') return `${base} badge-pending`;
    return `${base} badge-approved`;
  }
}
