import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (svc.active()) {
      <div class="fixed inset-0 z-[9998] bg-black/30 flex items-center justify-center">
        <div class="bg-white rounded-2xl px-8 py-6 shadow-xl flex items-center gap-4">
          <div class="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm font-medium text-gray-700">Attendere...</span>
        </div>
      </div>
    }
  `,
})
export class LoadingOverlayComponent {
  readonly svc = inject(LoadingService);
}
