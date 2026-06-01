import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './core/ui/toast-container.component';
import { LoadingOverlayComponent } from './core/ui/loading-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, ToastContainerComponent, LoadingOverlayComponent],
  template: `
    <router-outlet />
    <app-toast-container />
    <app-loading-overlay />
  `,
})
export class App {}
