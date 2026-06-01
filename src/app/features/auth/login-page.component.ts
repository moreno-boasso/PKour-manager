import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ManagerUtilsService } from '../../core/services/manager-utils.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.component.html',
})
export class LoginPageComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private readonly http: HttpClient,
    private readonly utils: ManagerUtilsService,
    private readonly router: Router,
  ) {}

  protected onSubmit(): void {
    if (!this.username || !this.password) return;
    this.error = '';
    this.loading = true;

    this.http.post<{ token: string }>(
      this.utils.buildApiUrl('/api/auth/login'),
      { username: this.username, password: this.password },
    ).subscribe({
      next: (res) => {
        this.utils.saveToken(res.token);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error ?? 'Credenziali non valide';
      },
    });
  }
}
