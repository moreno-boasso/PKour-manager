import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _count = 0;
  readonly active = signal(false);

  show(): void {
    this._count++;
    this.active.set(true);
  }

  hide(): void {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) this.active.set(false);
  }
}
