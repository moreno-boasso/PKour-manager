import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      @for (toast of svc.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-[240px] max-w-xs animate-slide-up"
          [class]="toastClass(toast.type)"
        >
          <span class="text-base shrink-0">{{ icon(toast.type) }}</span>
          <span class="flex-1">{{ toast.message }}</span>
          <button (click)="svc.dismiss(toast.id)" class="opacity-60 hover:opacity-100 text-base leading-none">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slide-up 0.2s ease; }
  `],
})
export class ToastContainerComponent {
  readonly svc = inject(ToastService);

  toastClass(type: string): string {
    if (type === 'success') return 'bg-emerald-600 text-white';
    if (type === 'error')   return 'bg-red-600 text-white';
    return 'bg-gray-800 text-white';
  }

  icon(type: string): string {
    if (type === 'success') return '✓';
    if (type === 'error')   return '✕';
    return 'ℹ';
  }
}
