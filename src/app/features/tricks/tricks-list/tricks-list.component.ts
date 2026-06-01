import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TricksApiService } from '../../../core/api/tricks-api.service';
import { Trick } from '../../../shared/models/admin.model';
import { ToastService } from '../../../core/ui/toast.service';
import { LoadingService } from '../../../core/ui/loading.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

interface EditForm {
  nome: string;
  difficolta: string;
  video_url: string;
  thumbnail_url: string;
  tagsRaw: string;
  requiredRaw: string;
}

@Component({
  selector: 'app-tricks-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="p-6 space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900" i18n="@@tricks.title">Tricks</h1>
          <p class="text-sm text-gray-500 mt-1">{{ total() }} tricks totali</p>
        </div>
      </div>

      <!-- Filtri -->
      <div class="flex flex-wrap gap-3">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (keyup.enter)="search()"
          placeholder="Cerca trick..."
          i18n-placeholder="@@tricks.search"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none w-56"
        />
        <select
          [(ngModel)]="filterDifficolta"
          (change)="load()"
          class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none"
        >
          <option value="" i18n="@@tricks.all_levels">Tutti i livelli</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      <!-- Skeleton -->
      @if (loading()) {
        <div class="space-y-2">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="card p-4 animate-pulse flex gap-4">
              <div class="w-16 h-16 bg-gray-200 rounded-lg shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                <div class="h-3 bg-gray-200 rounded w-1/5"></div>
              </div>
            </div>
          }
        </div>
      } @else if (tricks().length === 0) {
        <app-empty-state type="tricks" message="Nessun trick trovato" />
      } @else {
        <div class="space-y-2">
          @for (trick of tricks(); track trick.id) {
            <div class="card overflow-hidden">
              <!-- Riga principale -->
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                @if (trick.thumbnail_url) {
                  <img [src]="trick.thumbnail_url" [alt]="trick.nome" class="w-16 h-16 rounded-lg object-cover shrink-0 bg-gray-100" />
                } @else {
                  <div class="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl shrink-0">🛹</div>
                }
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-gray-900 truncate">{{ trick.nome }}</p>
                  <p class="text-xs text-gray-500 mt-0.5">{{ trick.difficolta }}</p>
                  @if (trick.tags.length > 0) {
                    <div class="flex flex-wrap gap-1 mt-1.5">
                      @for (tag of trick.tags.slice(0, 3); track tag) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700">{{ tag }}</span>
                      }
                    </div>
                  }
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  @if (trick.video_url) {
                    <a [href]="trick.video_url" target="_blank" class="btn-ghost py-1.5 px-3 text-xs" i18n="@@tricks.video">Video</a>
                  }
                  <button
                    (click)="toggleEdit(trick)"
                    [class]="editingId() === trick.id
                      ? 'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-medium text-xs border border-gray-300'
                      : 'btn-ghost py-1.5 px-3 text-xs'"
                    i18n="@@tricks.edit"
                  >{{ editingId() === trick.id ? '✕ Chiudi' : '✏️ Modifica' }}</button>
                  <button (click)="deleteTrick(trick)" class="btn-danger py-1.5 px-3 text-xs" i18n="@@tricks.delete">Elimina</button>
                </div>
              </div>

              <!-- Form edit inline -->
              @if (editingId() === trick.id && editForm) {
                <div class="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Nome -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Nome</label>
                      <input type="text" [(ngModel)]="editForm.nome" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <!-- Difficoltà -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Difficoltà</label>
                      <select [(ngModel)]="editForm.difficolta" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary outline-none">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                        <option value="expert">Expert</option>
                      </select>
                    </div>
                    <!-- Video URL -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
                      <input type="url" [(ngModel)]="editForm.video_url" placeholder="https://..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <!-- Thumbnail URL -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Thumbnail URL</label>
                      <input type="url" [(ngModel)]="editForm.thumbnail_url" placeholder="https://..." class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <!-- Tags -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Tags <span class="text-gray-400">(virgola separati)</span></label>
                      <input type="text" [(ngModel)]="editForm.tagsRaw" placeholder="flip, grab, spin" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <!-- Required -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Required <span class="text-gray-400">(virgola separati)</span></label>
                      <input type="text" [(ngModel)]="editForm.requiredRaw" placeholder="ollie, kickflip" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                  </div>
                  <div class="flex gap-2 justify-end pt-1">
                    <button (click)="cancelEdit()" class="btn-ghost py-1.5 px-4 text-sm">Annulla</button>
                    <button (click)="saveEdit(trick)" [disabled]="saving()" class="btn-primary py-1.5 px-4 text-sm">
                      {{ saving() ? 'Salvataggio...' : 'Salva modifiche' }}
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Paginazione -->
        <div class="flex items-center justify-between pt-2">
          <p class="text-sm text-gray-500">
            {{ offset() + 1 }}–{{ offset() + tricks().length }} di {{ total() }}
          </p>
          <div class="flex gap-2">
            <button
              [disabled]="offset() === 0"
              (click)="prevPage()"
              class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40"
              i18n="@@common.prev"
            >← Precedente</button>
            <button
              [disabled]="offset() + pageSize >= total()"
              (click)="nextPage()"
              class="btn-ghost py-1.5 px-3 text-sm disabled:opacity-40"
              i18n="@@common.next"
            >Successivo →</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class TricksListComponent implements OnInit {
  private readonly api = inject(TricksApiService);
  private readonly toast = inject(ToastService);
  private readonly loadingSvc = inject(LoadingService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly tricks = signal<Trick[]>([]);
  readonly total = signal(0);
  readonly offset = signal(0);
  readonly editingId = signal<string | null>(null);
  readonly pageSize = 20;

  searchQuery = '';
  filterDifficolta = '';
  editForm: EditForm | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getTricks(this.pageSize, this.offset(), this.searchQuery || undefined, this.filterDifficolta || undefined).subscribe({
      next: (res) => {
        this.tricks.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  search(): void {
    this.offset.set(0);
    this.load();
  }

  prevPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.load();
  }

  nextPage(): void {
    this.offset.update(v => v + this.pageSize);
    this.load();
  }

  toggleEdit(trick: Trick): void {
    if (this.editingId() === trick.id) {
      this.cancelEdit();
      return;
    }
    this.editingId.set(trick.id);
    this.editForm = {
      nome: trick.nome,
      difficolta: trick.difficolta,
      video_url: trick.video_url ?? '',
      thumbnail_url: trick.thumbnail_url ?? '',
      tagsRaw: (trick.tags ?? []).join(', '),
      requiredRaw: (trick.required ?? []).join(', '),
    };
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editForm = null;
  }

  saveEdit(trick: Trick): void {
    if (!this.editForm) return;
    this.saving.set(true);
    this.loadingSvc.show();

    const payload: Partial<Trick> = {
      nome: this.editForm.nome.trim(),
      difficolta: this.editForm.difficolta,
      video_url: this.editForm.video_url.trim() || null,
      thumbnail_url: this.editForm.thumbnail_url.trim() || null,
      tags: this.editForm.tagsRaw.split(',').map(t => t.trim()).filter(Boolean),
      required: this.editForm.requiredRaw.split(',').map(t => t.trim()).filter(Boolean),
    };

    this.api.patchTrick(trick.id, payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadingSvc.hide();
        this.toast.success(`"${trick.nome}" aggiornato`);
        this.cancelEdit();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.loadingSvc.hide();
        this.toast.error('Errore durante il salvataggio');
      },
    });
  }

  deleteTrick(trick: Trick): void {
    if (!confirm(`Eliminare "${trick.nome}"?`)) return;
    this.loadingSvc.show();
    this.api.deleteTrick(trick.id).subscribe({
      next: () => { this.loadingSvc.hide(); this.toast.success(`"${trick.nome}" eliminato`); this.load(); },
      error: () => { this.loadingSvc.hide(); this.toast.error('Errore durante l\'eliminazione'); },
    });
  }
}
