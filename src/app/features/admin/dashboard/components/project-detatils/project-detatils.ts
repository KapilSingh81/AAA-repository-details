import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentService } from '../../services/document-service';
import { ProjectViewDetails } from '../project-view-details/project-view-details';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';

interface Finding {
  sequence: number;
  affected_asset: string;
  vulnerability_title: string;
  cve_cwe: string;
  severity: string;
  detailed_observation: string;
  recommendation: string;
  reference: string;
  observation_type: string;
}

@Component({
  selector: 'app-project-detatils',
  imports: [CommonModule],
  templateUrl: './project-detatils.html',
  styleUrl: './project-detatils.scss',
})
export class ProjectDetails implements OnInit {
  private documentService = inject(DocumentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(BsModalService);
  private cookieService = inject(CookieService);
  private http = inject(HttpClient);
  private notification = inject(NotificationService);

  // Pagination signals
  currentPage = signal(1);
  pageSize = signal(25);
  pageSizeOptions = [10, 25, 50, 100];

  documentData = signal<any>(null);
  isLoading = signal(false);
  allFindings = signal<Finding[]>([]);
  metadata = signal<any>(null);
  auditors = signal<any[]>([]);
  tools = signal<any[]>([]);
  certificates = signal<any[]>([]);
  documentId = signal<string>('');
  isDownloading = signal<string | null>(null);

  // Filter signals
  selectedSeverityFilter = signal<string | null>(null);
  searchQuery = signal<string>('');

  // Finding detail modal signals
  showFindingModal = signal(false);
  selectedFinding = signal<Finding | null>(null);
  bsModalRef!: BsModalRef;

  // Computed filtered findings based on severity and search
  filteredFindings = computed(() => {
    let findings = this.allFindings();
    
    const severity = this.selectedSeverityFilter();
    if (severity) {
      findings = findings.filter(f => f.severity === severity);
    }
    
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      findings = findings.filter(f => 
        f.vulnerability_title?.toLowerCase().includes(query) ||
        f.affected_asset?.toLowerCase().includes(query) ||
        f.cve_cwe?.toLowerCase().includes(query) ||
        f.severity?.toLowerCase().includes(query) ||
        f.observation_type?.toLowerCase().includes(query) ||
        f.reference?.toLowerCase().includes(query)
      );
    }
    
    return findings;
  });

  paginatedFindings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredFindings().slice(start, end);
  });

  totalFindings = computed(() => this.allFindings().length);
  totalFilteredFindings = computed(() => this.filteredFindings().length);
  totalPages = computed(() => Math.ceil(this.totalFilteredFindings() / this.pageSize()));

  Math = Math;

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.documentId.set(params['id']);
      if (this.documentId()) {
        this.getProjectDetailsData();
      }
    });

    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras.state as { documentData: any };
    if (state?.documentData) {
      this.documentData.set(state.documentData);
      this.extractData(state.documentData);
    }
  }

  // Authorization Methods - Only checks for token
  isAuthorized(): boolean {
    const token = this.cookieService.get('aaa-token');
    return !!(token && token.length > 0);
  }

  showUnauthorizedMessage() {
    this.notification.error('You are not authorized to download this certificate. Please login again.');
  }

  // Handle certificate download with token check
  handleCertificateDownload(cert: any) {
    // Check if user has token
    if (!this.isAuthorized()) {
      this.showUnauthorizedMessage();
      this.router.navigate(['/login']);
      return;
    }

    const token = this.cookieService.get('aaa-token');
    if (!token) {
      this.notification.error('Session expired. Please login again.');
      this.router.navigate(['/login']);
      return;
    }

    const url = cert?.download_url;
    if (!url) {
      this.notification.error('Download URL not available');
      return;
    }

    this.isDownloading.set(cert.id);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/octet-stream, application/json'
    });

    this.http.get(url, { headers, responseType: 'blob', observe: 'response' }).subscribe({
      next: (response: any) => {
        this.isDownloading.set(null);
        let fileName = this.getFileNameFromResponse(response, url, 'certificate');
        const blob = new Blob([response.body], {
          type: response.body.type || 'application/octet-stream'
        });
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);

        this.notification.success('Certificate downloaded successfully');
      },
      error: (err) => {
        this.isDownloading.set(null);
        console.error('Download error:', err);
        if (err.status === 401) {
          this.notification.error('Session expired. Please login again.');
          this.router.navigate(['/login']);
        } else if (err.status === 403) {
          this.notification.error('You do not have permission to download this certificate.');
        } else {
          this.notification.error('Failed to download certificate. Please try again.');
        }
      }
    });
  }

  getFileNameFromResponse(response: any, url: string, type: string): string {
    const contentDisposition = response.headers.get('content-disposition');
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches && matches[1]) {
        return matches[1].replace(/['"]/g, '');
      }
    }
    return this.getFileNameFromUrl(url, type);
  }

  getFileNameFromUrl(url: string, type: string): string {
    try {
      const parts = url.split('/');
      let fileName = parts[parts.length - 1] || `${type}.pdf`;
      fileName = fileName.split('?')[0];
      if (!fileName.includes('.')) {
        fileName = `${fileName}.pdf`;
      }
      return fileName;
    } catch {
      return `${type}_${new Date().getTime()}.pdf`;
    }
  }

  getProjectDetailsData() {
    this.isLoading.set(true);
    this.documentService.documentDetailsdata(this.documentId()).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.documentData.set(res?.body);
        this.extractData(res?.body);
        this.currentPage.set(1);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching document details:', err);
      }
    });
  }

  extractData(data: any) {
    if (!data) return;

    if (data?.reports && data.reports.length > 0) {
      const report = data.reports[0];
      if (report?.extracted_data?.findings) {
        this.allFindings.set(report.extracted_data.findings);
      }
      if (report?.extracted_data?.metadata) {
        this.metadata.set(report.extracted_data.metadata);
      }
      if (report?.extracted_data?.auditors) {
        this.auditors.set(report.extracted_data.auditors);
      }
      if (report?.extracted_data?.tools) {
        this.tools.set(report.extracted_data.tools);
      }
    }

    if (data?.certificates) {
      this.certificates.set(data.certificates);
    }
  }

  // Filter methods
  filterBySeverity(severity: string | null) {
    this.selectedSeverityFilter.set(severity);
    this.currentPage.set(1);
  }

  clearFilter() {
    this.selectedSeverityFilter.set(null);
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  // Finding detail modal methods
  openFindingDetails(finding: Finding) {
    const initialState: ModalOptions = {
      initialState: {
        findingData: finding
      },
    };
    this.bsModalRef = this.modalService.show(
      ProjectViewDetails,
      Object.assign(initialState, {
        id: "finding-details",
        class: 'modal-lg modal-dialog-centered',
      })
    );
  }

  closeFindingDetails() {
    this.showFindingModal.set(false);
    this.selectedFinding.set(null);
  }

  // Pagination methods
  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changePageSize(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(parseInt(select.value, 10));
    this.currentPage.set(1);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage() * this.pageSize(), this.totalFilteredFindings());
  }

  goBack() {
    this.router.navigate(['/user/workspace']);
  }

  getTotalFindings(): number {
    return this.allFindings().length;
  }

  getSeverityCount(severity: string): number {
    return this.allFindings().filter(f => f.severity === severity).length;
  }

  getSeverityClass(severity: string): string {
    const classes: { [key: string]: string } = {
      'Critical': 'bg-red-100 text-red-700',
      'High': 'bg-orange-100 text-orange-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-blue-100 text-blue-700',
      'default': 'bg-gray-100 text-gray-700'
    };
    return classes[severity] || classes['default'];
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'completed': 'bg-green-100 text-green-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'failed': 'bg-red-100 text-red-700',
      'default': 'bg-gray-100 text-gray-700'
    };
    return colors[status?.toLowerCase()] || colors['default'];
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  viewFinding(finding: Finding) {
    const initialState: ModalOptions = {
      initialState: {
        findingData: finding
      },
    };
    this.bsModalRef = this.modalService.show(
      ProjectViewDetails,
      Object.assign(initialState, {
        id: "finding-details",
        class: 'modal-lg modal-dialog-centered',
      })
    );
  }

  goToPage(event: Event) {
    const input = event.target as HTMLInputElement;
    const page = parseInt(input.value, 10);
    if (page >= 1 && page <= this.totalPages()) {
      this.changePage(page);
    }
    input.value = '';
  }
}