import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminApiService } from '../../core/api/admin-api.service';
import { ManagerStats } from '../../shared/models/admin.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6 space-y-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900" i18n="@@dashboard.title">Dashboard</h1>
        <p class="text-sm text-gray-500 mt-1" i18n="@@dashboard.subtitle">Panoramica moderazione contenuti PKour</p>
      </div>

      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (i of [1,2,3,4]; track i) {
            <div class="card p-5 animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
              <div class="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          }
        </div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          @for (card of statCards(); track card.label) {
            <a [routerLink]="card.route" class="card p-5 hover:shadow-card-hover transition-shadow cursor-pointer block">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">{{ card.label }}</p>
                  <p class="text-3xl font-bold mt-1" [class]="card.count > 0 ? 'text-amber-600' : 'text-gray-900'">
                    {{ card.count }}
                  </p>
                </div>
                <span class="text-2xl">{{ card.icon }}</span>
              </div>
              @if (card.count > 0) {
                <p class="text-xs text-amber-600 mt-2 font-medium" i18n="@@dashboard.pending_action">Richiede azione</p>
              } @else {
                <p class="text-xs text-emerald-600 mt-2 font-medium" i18n="@@dashboard.all_clear">Tutto in ordine</p>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(AdminApiService);

  readonly loading = signal(true);
  readonly stats = signal<ManagerStats | null>(null);

  readonly statCards = () => {
    const s = this.stats();
    return [
      { label: 'Spot', count: s?.pending_spots ?? 0, icon: '📍', route: '/spots' },
      { label: 'Recensioni', count: s?.pending_reviews ?? 0, icon: '⭐', route: '/reviews' },
      { label: 'Foto', count: s?.pending_photos ?? 0, icon: '📷', route: '/photos' },
      { label: 'Segnalazioni', count: s?.pending_reports ?? 0, icon: '🚩', route: '/reports' },
    ];
  };

  ngOnInit(): void {
    this.api.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
