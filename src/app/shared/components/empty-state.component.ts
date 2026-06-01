import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EmptyStateType = 'spots' | 'tricks' | 'reviews' | 'reports' | 'photos';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 px-4 text-center select-none">
      <div class="w-40 h-40 mb-5 opacity-80">
        @switch (type()) {
          @case ('spots') { <ng-container *ngTemplateOutlet="spotsIllustration" /> }
          @case ('tricks') { <ng-container *ngTemplateOutlet="tricksIllustration" /> }
          @case ('reviews') { <ng-container *ngTemplateOutlet="reviewsIllustration" /> }
          @case ('reports') { <ng-container *ngTemplateOutlet="reportsIllustration" /> }
          @case ('photos') { <ng-container *ngTemplateOutlet="photosIllustration" /> }
        }
      </div>
      <p class="text-base font-medium text-gray-500">{{ message() }}</p>
      @if (sub()) {
        <p class="text-sm text-gray-400 mt-1">{{ sub() }}</p>
      }
    </div>

    <!-- SVG illustrations -->
    <ng-template #spotsIllustration>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="72" fill="#F3F4F6"/>
        <ellipse cx="80" cy="128" rx="32" ry="8" fill="#E5E7EB"/>
        <path d="M80 40C63.43 40 50 53.43 50 70c0 24 30 50 30 50s30-26 30-50c0-16.57-13.43-30-30-30z" fill="#D1D5DB"/>
        <path d="M80 44C65.64 44 54 55.64 54 70c0 22 26 46 26 46s26-24 26-46c0-14.36-11.64-26-26-26z" fill="#9CA3AF"/>
        <circle cx="80" cy="70" r="10" fill="#F9FAFB"/>
        <path d="M56 120 Q80 108 104 120" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </ng-template>

    <ng-template #tricksIllustration>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="72" fill="#F3F4F6"/>
        <rect x="30" y="88" width="100" height="14" rx="7" fill="#D1D5DB"/>
        <rect x="38" y="84" width="84" height="10" rx="5" fill="#E5E7EB"/>
        <circle cx="52" cy="102" r="10" fill="#9CA3AF"/>
        <circle cx="52" cy="102" r="5" fill="#D1D5DB"/>
        <circle cx="108" cy="102" r="10" fill="#9CA3AF"/>
        <circle cx="108" cy="102" r="5" fill="#D1D5DB"/>
        <path d="M65 70 Q80 42 95 70" stroke="#D1D5DB" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M70 62 Q80 50 90 62" stroke="#9CA3AF" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>
    </ng-template>

    <ng-template #reviewsIllustration>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="72" fill="#F3F4F6"/>
        <rect x="36" y="52" width="88" height="56" rx="10" fill="#E5E7EB"/>
        <rect x="44" y="62" width="48" height="6" rx="3" fill="#D1D5DB"/>
        <rect x="44" y="74" width="72" height="6" rx="3" fill="#D1D5DB"/>
        <rect x="44" y="86" width="60" height="6" rx="3" fill="#D1D5DB"/>
        <path d="M80 30 L83.5 40.6H95L85.8 47.1L89.3 57.7L80 51.2L70.7 57.7L74.2 47.1L65 40.6H76.5Z" fill="#D1D5DB"/>
      </svg>
    </ng-template>

    <ng-template #reportsIllustration>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="72" fill="#F3F4F6"/>
        <path d="M80 38L116 110H44L80 38Z" fill="#E5E7EB"/>
        <path d="M80 44L112 108H48L80 44Z" fill="#D1D5DB"/>
        <rect x="77" y="68" width="6" height="22" rx="3" fill="#9CA3AF"/>
        <circle cx="80" cy="98" r="4" fill="#9CA3AF"/>
        <path d="M60 116 Q80 108 100 116" stroke="#E5E7EB" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </ng-template>

    <ng-template #photosIllustration>
      <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="80" cy="80" r="72" fill="#F3F4F6"/>
        <rect x="30" y="50" width="100" height="72" rx="10" fill="#E5E7EB"/>
        <rect x="38" y="58" width="84" height="56" rx="6" fill="#D1D5DB"/>
        <circle cx="58" cy="74" r="8" fill="#9CA3AF"/>
        <path d="M38 96 L62 74 L82 90 L98 76 L122 96" stroke="#E5E7EB" stroke-width="4" stroke-linejoin="round" fill="none"/>
        <path d="M38 96 L62 74 L82 90 L98 76 L122 96 V108 H38Z" fill="#C4C4C4" opacity="0.5"/>
        <circle cx="58" cy="74" r="6" fill="#B0B3BB"/>
      </svg>
    </ng-template>
  `,
})
export class EmptyStateComponent {
  readonly type = input.required<EmptyStateType>();
  readonly message = input.required<string>();
  readonly sub = input<string>();
}
