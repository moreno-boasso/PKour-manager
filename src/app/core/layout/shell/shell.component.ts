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
  styles: [`
    :host { display: contents; }
    aside { background: var(--bg2); border-right: 1px solid var(--border); }
    .nav-link { color: var(--text-dim); transition: all 0.15s; }
    .nav-link:hover { background: rgba(18,104,105,0.08); color: var(--text); }
    .nav-link.active { background: rgba(18,104,105,0.15); color: var(--accent-light); border-left: 2px solid var(--accent); }
    .logo-box { background: var(--accent); box-shadow: 0 0 16px var(--glow); }
    .user-area { border-top: 1px solid var(--border); }
    header { background: var(--bg2); border-bottom: 1px solid var(--border); }
    nav.bottom-nav { background: var(--bg2); border-top: 1px solid var(--border); }
    .bottom-nav-link { color: var(--text-muted); }
    .bottom-nav-link:hover { color: var(--text-dim); }
    .bottom-nav-link.active-mobile { color: var(--accent-light); }
    main { background: var(--bg); }
    .eyebrow { font-family: 'Space Mono', monospace; font-size: 9px; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; }
  `],
  template: `
    <div class="flex h-screen overflow-hidden" style="background:var(--bg)">

      <!-- Sidebar desktop -->
      <aside class="hidden md:flex flex-col w-56 shrink-0">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-4" style="border-bottom:1px solid var(--border)">
          <img src="PKour Logo royal teal.png" alt="PKour" class="h-8 w-auto" />
          <div class="eyebrow" style="margin-top:2px">MANAGER</div>
        </div>

        <!-- Nav -->
        <nav class="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.path === 'dashboard' }"
              class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
            >
              <span class="text-base leading-none w-5 text-center">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>

        <!-- User -->
        <div class="user-area px-3 py-4">
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0"
                 style="background:rgba(18,104,105,0.2);color:var(--accent-light);border:1px solid rgba(18,104,105,0.3)">
              {{ userInitial() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium truncate" style="color:var(--text-dim)">{{ auth.currentUser()?.email }}</div>
            </div>
            <button (click)="logout()" class="transition-colors" style="color:var(--text-muted)"
                    onmouseenter="this.style.color='#f87171'" onmouseleave="this.style.color='var(--text-muted)'"
                    title="Logout">
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
        <header class="md:hidden flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-2">
            <img src="PKour Logo royal teal.png" alt="PKour" class="h-7 w-auto" />
            <div class="eyebrow">MANAGER</div>
          </div>
          <button (click)="logout()" style="color:var(--text-muted)">
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
        <nav class="bottom-nav md:hidden flex safe-bottom">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="active-mobile"
              class="bottom-nav-link flex-1 flex flex-col items-center gap-1 py-2.5 text-xs transition-colors"
            >
              <span class="text-lg leading-none">{{ item.icon }}</span>
              <span class="text-[10px] font-mono">{{ item.shortLabel }}</span>
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
