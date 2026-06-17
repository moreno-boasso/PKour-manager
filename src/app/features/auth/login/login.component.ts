import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4" style="background:var(--bg)">
      <div class="w-full max-w-sm">
        <div class="card p-8 space-y-6">
          <!-- Logo -->
          <div class="text-center space-y-3">
            <img src="PKour Logo royal teal.png" alt="PKour" class="h-10 w-auto mx-auto" />
            <p class="text-xs font-mono tracking-widest" style="color:var(--text-muted)">MANAGER</p>
            <p class="text-sm" style="color:var(--text-muted)" i18n="@@login.subtitle">Accesso riservato agli amministratori</p>
          </div>

          <!-- Error -->
          @if (error()) {
            <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {{ error() }}
            </div>
          }

          <!-- Form -->
          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="space-y-1">
              <label class="block text-sm font-medium" style="color:var(--text-dim)" i18n="@@login.email">Email</label>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                required
                autocomplete="email"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                placeholder="admin@pkour.it"
              />
            </div>
            <div class="space-y-1">
              <label class="block text-sm font-medium" style="color:var(--text-dim)" i18n="@@login.password">Password</label>
              <input
                type="password"
                [(ngModel)]="password"
                name="password"
                required
                autocomplete="current-password"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading() || !email || !password"
              class="btn-primary w-full justify-center py-2.5"
            >
              @if (loading()) {
                <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              }
              <span i18n="@@login.submit">Accedi</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = this.auth.loading;
  email = '';
  password = '';
  error = signal<string | null>(null);

  onSubmit(): void {
    if (!this.email || !this.password) return;
    this.error.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        if (!this.auth.getAuthToken()) {
          this.auth.clearUser();
          this.error.set('Login riuscito ma il token di sessione non è disponibile. Aggiorna l\'app.');
          return;
        }

        this.auth.checkSession().subscribe({
          next: () => this.router.navigate(['/']),
          error: () => {
            this.auth.clearUser();
            this.error.set('Sessione non valida. Riprova ad accedere.');
          },
        });
      },
      error: (err) => {
        const msg = err?.error?.error ?? $localize`:@@login.error:Credenziali non valide`;
        this.error.set(msg);
      },
    });
  }
}
