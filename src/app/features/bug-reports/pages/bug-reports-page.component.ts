import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { ManagerUtilsService } from '../../../core/services/manager-utils.service';

type BugStatus = 'open' | 'resolved';
type BugStatusFilter = 'open' | 'resolved' | 'all';

interface BugReportItem {
  id: number;
  message: string;
  area: string | null;
  device_info: string;
  app_version: string | null;
  reporter_name: string | null;
  reporter_user_id: string | null;
  status: BugStatus;
  created_at: string | null;
}

interface BugReportsResponse {
  pagination?: { total?: number; page?: number; totalPages?: number };
  data: BugReportItem[];
}

@Component({
  selector: 'app-bug-reports-page',
  imports: [FormsModule],
  templateUrl: './bug-reports-page.component.html',
})
export class BugReportsPageComponent implements OnInit {
  protected statusMessage = '';
  protected statusType: 'success' | 'error' | 'info' = 'info';
  protected reportSearchText = '';
  protected selectedReportStatus: BugStatusFilter = 'open';
  protected reportsPage = 1;
  protected reportsPageSize = 12;
  protected reportsTotal = 0;
  protected reportsTotalPages = 1;
  protected reports: BugReportItem[] = [];
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
    if (this.selectedReportStatus === 'resolved') return 'Risolte';
    if (this.selectedReportStatus === 'all') return 'Tutte';
    return 'Aperte';
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

  protected reportAuthorLabel(report: BugReportItem): string {
    return report.reporter_name?.trim() || report.reporter_user_id?.trim() || 'utente sconosciuto';
  }

  protected reportAreaLabel(report: BugReportItem): string {
    const area = (report.area ?? '').trim();
    switch (area) {
      case 'add_spot':
        return 'Add Spot';
      case 'auth':
        return 'Auth';
      case 'home':
        return 'Home';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      case 'spots':
        return 'Spots';
      case 'spot_detail':
        return 'Spot Detail';
      case 'trick_attempts':
        return 'Trick Attempts';
      case 'trick_detail':
        return 'Trick Detail';
      case 'tricks':
        return 'Tricks';
      case 'generic':
        return 'Generico';
      default:
        return area || 'Generico';
    }
  }

  protected reportMessagePreview(message: string): string {
    const compact = message.replace(/\s+/g, ' ').trim();
    return compact.length <= 260 ? compact : `${compact.slice(0, 260)}...`;
  }

  protected reportDeviceInfoPreview(info: string): string {
    const compact = info.replace(/\s+/g, ' ').trim();
    return compact.length <= 200 ? compact : `${compact.slice(0, 200)}...`;
  }

  protected moderateReport(report: BugReportItem, status: BugStatus): void {
    if (this.isReportActionLoading || this.reportActionTargetId !== null) return;
    this.isReportActionLoading = true;
    this.reportActionTargetId = report.id;
    this.setStatus(
      status === 'resolved'
        ? `Segno come risolto #${report.id}...`
        : `Riapro segnalazione #${report.id}...`,
      'info',
    );

    this.http.patch(
      this.utils.buildSpotsUrl(`${this.utils.bugReportsModerateEndpoint}/${report.id}/decision`),
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
        this.setStatus(
          status === 'resolved'
            ? `Segnalazione #${report.id} risolta correttamente.`
            : `Segnalazione #${report.id} riaperta correttamente.`,
          'success',
        );
        this.loadReports();
      },
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore nella moderazione del bug.'), 'error'),
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

    this.http.get<unknown>(this.utils.buildSpotsUrl(`${this.utils.bugReportsListEndpoint}?${params.toString()}`), {
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
      error: (error) => this.setStatus(this.utils.extractHttpError(error, 'Errore durante il caricamento dei bug.'), 'error'),
    });
  }

  private normalizeReportsResponse(response: unknown): { data: BugReportItem[]; total: number; page: number; totalPages: number } {
    if (!response || typeof response !== 'object') return { data: [], total: 0, page: 1, totalPages: 1 };
    const parsed = response as BugReportsResponse;
    const rows = Array.isArray(parsed.data) ? parsed.data : [];
    const pagination = parsed.pagination ?? {};
    const total = typeof pagination.total === 'number' ? pagination.total : rows.length;
    const page = typeof pagination.page === 'number' ? pagination.page : this.reportsPage;
    const totalPages = typeof pagination.totalPages === 'number' ? pagination.totalPages : Math.max(1, Math.ceil(total / this.reportsPageSize));
    return { data: rows, total, page, totalPages };
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
