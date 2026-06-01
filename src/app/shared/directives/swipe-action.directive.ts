import {
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

const THRESHOLD = 80;

@Directive({
  selector: '[appSwipeAction]',
  standalone: true,
})
export class SwipeActionDirective implements OnInit, OnDestroy {
  @Output() swipeRight = new EventEmitter<void>();
  @Output() swipeLeft = new EventEmitter<void>();

  private readonly el = inject(ElementRef<HTMLElement>);
  private startX = 0;
  private startY = 0;
  private readonly onTouchStart = (e: TouchEvent) => {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  };
  private readonly onTouchEnd = (e: TouchEvent) => {
    const dx = e.changedTouches[0].clientX - this.startX;
    const dy = e.changedTouches[0].clientY - this.startY;
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > THRESHOLD) this.swipeRight.emit();
    else if (dx < -THRESHOLD) this.swipeLeft.emit();
  };

  ngOnInit(): void {
    const el = this.el.nativeElement;
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  ngOnDestroy(): void {
    const el = this.el.nativeElement;
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchend', this.onTouchEnd);
  }
}
