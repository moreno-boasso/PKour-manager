import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

type SpotStatus = 'pending' | 'approved' | 'rejected';

interface ModerationReport {
  id: number;
  spot_id: number;
  spot_nome: string | null;
  user_id: string | null;
  user_nome: string | null;
  user_username: string | null;
  motivo: string | null;
  descrizione: string;
  status: SpotStatus;
  created_at: string | null;
}

interface ReportsResponse {
  pagination?: { total?: number; page?: number; totalPages?: number };
  data: ModerationReport[];
}

@Component({
  selector: 'app-reports-page',
  imports: [FormsModule],
  templateUrl: './reports-page.component.html',
})
export class ReportsPageComponent implements OnInit {
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected reportSearchText = '';
  protected selectedReportStatus: SpotStatus = 'pending';
  protected reportsPage = 1;
  protected reportsPageSize = 12;
  protected reportsTotal = 0;
  protected reportsTotalPages = 1;
  protected reports: ModerationReport[] = [];
  protected isReportsLoading = false;
  protected isReportActionLoading = false;
  protected reportActionTargetId: number | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly utils: ManagerUtilsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReports();
  }

  protected get reportStatusLabel(): string {
    if (this.selectedReportStatus === 'approved') return 'Approvate';
    if (this.selectedReportStatus === 'rejected') return 'Rifiutate';
    return 'In attesa';
  }

  protected formatDateTime(value: string | null): string {
    return this.utils.formatDateTime(value);
  }

  protected refreshReports(): void {
    this.loadReports();
  }

  protected searchReports(): void {
    this.reportsPage = 1;
    this.loadReports();
  }

  protected goToReportsPage(page: number): void {
    if (page < 1 || page > this.reportsTotalPages || page === this.reportsPage) return;
    this.reportsPage = page;
    this.loadReports();
  }

  protected reportAuthorLabel(report: ModerationReport): string {
    return report.user_username?.trim() ? `@${report.user_username.trim()}` : (report.user_nome?.trim() || report.user_id?.trim() || 'utente sconosciuto');
  }

  protected reportSpotLabel(report: ModerationReport): string {
    return report.spot_nome?.trim() || `Spot #${report.spot_id}`;
  }

  protected reportReasonLabel(report: ModerationReport): string {
    return report.motivo?.trim() || 'Motivo n/d';
  }

  protected reportDescriptionPreview(descrizione: string): string {
    const compact = descrizione.replace(/\s+/g, ' ').trim();
    return compact.length <= 240 ? compact : `${compact.slice(0, 240)}...`;
  }

  protected moderateReport(report: ModerationReport, status: Extract<SpotStatus, 'approved' | 'rejected'>): void {
    if (this.isReportActionLoading || this.reportActionTargetId !== null) return;
    this.isReportActionLoading = true;
    this.reportActionTargetId = report.id;
    this.setStatus(status === 'approved' ? `Approvo segnalazione #${report.id}...` : `Rifiuto segnalazione #${report.id}...`, 'info');

    this.http.patch(
      this.utils.buildSpotsUrl(`${this.utils.reportsModerateEndpoint}/${report.id}/decision`),
      { decision: status },
      { headers: this.utils.getToolHeaders() },
    ).pipe(
      timeout(15000),
      finalize(() => {
        this.isReportActionLoading = false;
        this.reportActionTargetId = null;
        this.syncView();
      }),
    ).subscribe({
      next: () => {
        this.setStatus(status === 'approved' ? `Segnalazione #${report.id} approvata correttamente.` : `Segnalazione #${report.id} rifiutata correttamente.`, 'success');
        this.loadReports();
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nella moderazione della segnalazione.'), 'error'),
    });
  }

  private loadReports(): void {
    this.isReportsLoading = true;
    const params = new URLSearchParams({
      status: this.selectedReportStatus,
      page: String(this.reportsPage),
      pageSize: String(this.reportsPageSize),
      sortBy: 'created_at',
      order: 'desc',
    });
    const query = this.reportSearchText.trim();
    if (query) params.set('q', query);

    this.http.get<unknown>(this.utils.buildSpotsUrl(`${this.utils.reportsListEndpoint}?${params.toString()}`), {
      headers: this.utils.getToolHeaders(),
    }).pipe(
      timeout(15000),
      finalize(() => {
        this.isReportsLoading = false;
        this.syncView();
      }),
    ).subscribe({
      next: (response) => {
        const normalized = this.normalizeReportsResponse(response);
        this.reports = normalized.data;
        this.reportsTotal = normalized.total;
        this.reportsTotalPages = normalized.totalPages;
        this.reportsPage = normalized.page;
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento delle segnalazioni.'), 'error'),
    });
  }

  private normalizeReportsResponse(response: unknown): { data: ModerationReport[]; total: number; page: number; totalPages: number } {
    if (!response || typeof response !== 'object') return { data: [], total: 0, page: 1, totalPages: 1 };
    const parsed = response as ReportsResponse;
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const pagination = parsed.pagination ?? {};
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const page = typeof pagination.page === 'number' ? pagination.page : this.reportsPage;
    const totalPages = typeof pagination.totalPages === 'number' ? pagination.totalPages : Math.max(1, Math.ceil(total / this.reportsPageSize));
    return { data: rows.filter((row) => (row.descrizione ?? '').trim().length > 0), total, page, totalPages };
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
    this.syncView();
  }

  private syncView(): void {
    this.cdr.detectChanges();
  }
}
