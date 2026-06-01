import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, RouterLinkActive],
  template: `
    <div class="flex h-screen overflow-hidden bg-surface">

      <!-- Sidebar desktop -->
      <aside
        class="hidden md:flex flex-col w-60 shrink-0 bg-white border-r border-surface-border"
      >
        <!-- Logo -->
        <div class="flex items-center gap-3 px-5 py-5 border-b border-surface-border">
          <div class="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">PK</div>
          <div>
            <div class="text-sm font-bold text-gray-900">PKour</div>
            <div class="text-xs text-gray-400" i18n="@@shell.manager">Manager</div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-primary-50 text-primary font-semibold"
              [routerLinkActiveOptions]="{ exact: item.path === 'dashboard' }"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span class="text-base leading-none">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- User -->
        <div class="px-3 py-4 border-t border-surface-border">
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold text-xs">
              {{ userInitial() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-gray-900 truncate">{{ auth.currentUser()?.email }}</div>
            </div>
            <button (click)="logout()" class="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Mobile header -->
        <header class="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-surface-border">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">PK</div>
            <span class="font-semibold text-sm">Manager</span>
          </div>
          <button (click)="logout()" class="text-gray-400 hover:text-red-500 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </header>

        <!-- Page content -->
        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>

        <!-- Mobile bottom nav -->
        <nav class="md:hidden flex bg-white border-t border-surface-border safe-bottom">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="text-primary"
              class="flex-1 flex flex-col items-center gap-1 py-2.5 text-gray-400 text-xs hover:text-gray-600 transition-colors"
            >
              <span class="text-lg leading-none">{{ item.icon }}</span>
              <span class="text-[10px]">{{ item.shortLabel }}</span>
            </a>
          }
        </nav>
      </div>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);

  readonly navItems: (NavItem & { shortLabel: string })[] = [
    { path: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: '🏠' },
    { path: 'spots', label: 'Spot', shortLabel: 'Spot', icon: '📍' },
    { path: 'reviews', label: 'Recensioni', shortLabel: 'Review', icon: '⭐' },
    { path: 'reports', label: 'Segnalazioni', shortLabel: 'Report', icon: '🚩' },
    { path: 'photos', label: 'Foto', shortLabel: 'Foto', icon: '📷' },
    { path: 'tricks', label: 'Tricks', shortLabel: 'Tricks', icon: '🛹' },
  ];

  readonly userInitial = () => {
    const email = this.auth.currentUser()?.email ?? '';
    return email.charAt(0).toUpperCase();
  };

  logout(): void {
    this.auth.logout().subscribe();
  }
}
