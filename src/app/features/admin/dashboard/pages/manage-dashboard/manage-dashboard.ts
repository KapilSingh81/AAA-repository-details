import { CommonModule } from '@angular/common';
import { Component, signal, computed, inject, ChangeDetectorRef } from '@angular/core';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { AddDocment } from '../../components/add-docment/add-docment';
import { DocumentService } from '../../services/document-service';
import { CommonService } from '../../../../shared/services/common-services/common-service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { CookieService } from 'ngx-cookie-service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface Document {
  id: string;
  name: string;
  client_name: string;
  audit_type: string;
  report_download_url: string;
  certificate_download_url: string;
  created_at: string;
}

@Component({
  selector: 'app-manage-dashboard',
  imports: [CommonModule],
  templateUrl: './manage-dashboard.html',
  styleUrl: './manage-dashboard.scss',
})
export class ManageDashboard {
  private modalService = inject(BsModalService);
  private documentService = inject(DocumentService);
  private commonService = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private cookieService = inject(CookieService);
  private http = inject(HttpClient);

  viewMode = signal<'table' | 'card'>('table');
  currentPage = signal(1);
  pageSize = signal(10);
  bsModalRef!: BsModalRef;
  isLoading = signal(false);
  isDownloading = signal<string | null>(null);

  // Filter properties
  searchName = signal('');
  selectedType = signal('');
  documentTypeList: any;
  private searchSubject = new Subject<string>();

  // Icon mapping for audit types
  private auditIconMap: { [key: string]: string } = {
    'web': '🌐',
    'vapt': '🛡️',
    'comprehensive': '📊',
    'mobile': '📱',
    'source_code': '💻',
    'web_api': '🔌',
    'audit': '📋',
    'compliance': '✅',
    'security': '🔒',
    'penetration': '🎯',
    'vulnerability': '⚠️',
    'project': '📁',
    'report': '📊',
    'certificate': '📜',
    'default': '📄'
  };

  private auditColorMap: { [key: string]: string } = {
    'web': 'bg-blue-100',
    'vapt': 'bg-purple-100',
    'comprehensive': 'bg-indigo-100',
    'mobile': 'bg-green-100',
    'source_code': 'bg-cyan-100',
    'web_api': 'bg-teal-100',
    'audit': 'bg-blue-100',
    'compliance': 'bg-green-100',
    'security': 'bg-red-100',
    'penetration': 'bg-orange-100',
    'vulnerability': 'bg-yellow-100',
    'project': 'bg-indigo-100',
    'report': 'bg-amber-100',
    'certificate': 'bg-emerald-100',
    'default': 'bg-gray-100'
  };

  private auditBadgeMap: { [key: string]: string } = {
    'web': 'bg-blue-100 text-blue-800',
    'vapt': 'bg-purple-100 text-purple-800',
    'comprehensive': 'bg-indigo-100 text-indigo-800',
    'mobile': 'bg-green-100 text-green-800',
    'source_code': 'bg-cyan-100 text-cyan-800',
    'web_api': 'bg-teal-100 text-teal-800',
    'audit': 'bg-blue-100 text-blue-800',
    'compliance': 'bg-green-100 text-green-800',
    'security': 'bg-red-100 text-red-800',
    'penetration': 'bg-orange-100 text-orange-800',
    'vulnerability': 'bg-yellow-100 text-yellow-800',
    'project': 'bg-indigo-100 text-indigo-800',
    'report': 'bg-amber-100 text-amber-800',
    'certificate': 'bg-emerald-100 text-emerald-800',
    'default': 'bg-gray-100 text-gray-800'
  };

  private allDocuments = signal<Document[]>([]);

  documents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.allDocuments().slice(start, end);
  });

  totalItems = computed(() => this.allDocuments().length);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  Math = Math;

  ngOnInit() {
    this.getDocumentList();
    this.getDocumentTypeList();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.getDocumentList();
    });
  }

  // Authorization Methods - Only checks for token
  isAuthorized(): boolean {
    const token = this.cookieService.get('aaa-token');
    return !!(token && token.length > 0);
  }

  showUnauthorizedMessage() {
    this.notification.error('You are not authorized to download this document. Please login again.');
  }

  // Handle download with token check
  handleDownload(doc: Document, type: 'report' | 'certificate') {
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

    const url = type === 'report' ? doc.report_download_url : doc.certificate_download_url;
    if (!url) {
      this.notification.error('Download URL not available');
      return;
    }

    this.isDownloading.set(`${doc.id}-${type}`);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/octet-stream, application/json'
    });

    this.http.get(url, { headers, responseType: 'blob', observe: 'response' }).subscribe({
      next: (response: any) => {
        this.isDownloading.set(null);
        let fileName = this.getFileNameFromResponse(response, url, type);
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

        this.notification.success(`${type === 'report' ? 'Report' : 'Certificate'} downloaded successfully`);
      },
      error: (err) => {
        this.isDownloading.set(null);
        console.error('Download error:', err);
        if (err.status === 401) {
          this.notification.error('Session expired. Please login again.');
          this.router.navigate(['/login']);
        } else if (err.status === 403) {
          this.notification.error('You do not have permission to download this document.');
        } else {
          this.notification.error('Failed to download document. Please try again.');
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

  getDocumentTypeList() {
    this.commonService.documentTypeList().subscribe((res: any) => {
      this.documentTypeList = res?.body?.types || [];
      this.cdr.detectChanges();
    });
  }

  getDocumentList() {
    this.isLoading.set(true);

    let payload: any = {
      uuid: null,
      name: this.searchName() || null,
      audit_type: this.selectedType() || null
    };

    this.documentService.dashboardList(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.allDocuments.set(res?.body?.projects || []);
        this.currentPage.set(1);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching documents:', err);
        this.allDocuments.set([]);
      }
    });
  }

  onSearchName(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchName.set(value);
    this.searchSubject.next(value);
  }

  onTypeChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedType.set(value);
    this.getDocumentList();
  }

  clearFilters() {
    this.searchName.set('');
    this.selectedType.set('');
    this.searchSubject.next('');
    this.getDocumentList();
  }

  getIcon(doc: Document): string {
    if (doc.audit_type) {
      const type = doc.audit_type.toLowerCase();
      if (this.auditIconMap[type]) {
        return this.auditIconMap[type];
      }
    }

    const name = doc.name.toLowerCase();
    if (name.includes('web')) return '🌐';
    if (name.includes('vapt') || name.includes('penetration')) return '🛡️';
    if (name.includes('mobile')) return '📱';
    if (name.includes('source') || name.includes('code')) return '💻';
    if (name.includes('api')) return '🔌';
    if (name.includes('comprehensive')) return '📊';
    if (name.includes('audit')) return '📋';
    if (name.includes('compliance')) return '✅';
    if (name.includes('security')) return '🔒';
    if (name.includes('vulnerability')) return '⚠️';
    if (name.includes('project')) return '📁';
    if (name.includes('report')) return '📊';
    if (name.includes('certificate')) return '📜';

    return this.auditIconMap['default'];
  }

  getIconColor(doc: Document): string {
    if (doc.audit_type) {
      const type = doc.audit_type.toLowerCase();
      if (this.auditColorMap[type]) {
        return this.auditColorMap[type];
      }
    }

    const name = doc.name.toLowerCase();
    if (name.includes('web')) return 'bg-blue-100';
    if (name.includes('vapt') || name.includes('penetration')) return 'bg-purple-100';
    if (name.includes('mobile')) return 'bg-green-100';
    if (name.includes('source') || name.includes('code')) return 'bg-cyan-100';
    if (name.includes('api')) return 'bg-teal-100';
    if (name.includes('comprehensive')) return 'bg-indigo-100';
    if (name.includes('audit')) return 'bg-blue-100';
    if (name.includes('compliance')) return 'bg-green-100';
    if (name.includes('security')) return 'bg-red-100';
    if (name.includes('vulnerability')) return 'bg-yellow-100';
    if (name.includes('project')) return 'bg-indigo-100';
    if (name.includes('report')) return 'bg-amber-100';
    if (name.includes('certificate')) return 'bg-emerald-100';

    return this.auditColorMap['default'];
  }

  getAuditTypeClass(auditType: string): string {
    if (auditType) {
      const type = auditType.toLowerCase();
      if (this.auditBadgeMap[type]) {
        return this.auditBadgeMap[type];
      }
    }
    return this.auditBadgeMap['default'];
  }

  setViewMode(mode: 'table' | 'card') {
    this.viewMode.set(mode);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 5) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 3; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  viewDocument(doc: Document) {
    const initialState: ModalOptions = {
      initialState: {
        editData: doc,
        viewOnly: true
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: "view-document",
        class: 'modal-lg modal-dialog-centered',
      })
    );
  }

  editDocument(doc: Document) {
    const initialState: ModalOptions = {
      initialState: {
        editData: doc
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: "edit-document",
        class: 'modal-lg modal-dialog-centered',
      })
    );
  }

  deleteDocument(doc: Document) {
    if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      console.log('Delete document:', doc);
    }
  }

  onAddDocs(value: any) {
    const initialState: ModalOptions = {
      initialState: {
        editData: value ? value : null
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: "confirmation",
        class: 'modal-lg modal-dialog-centered alert-popup',
      })
    );
    this.bsModalRef?.content?.mapdata?.subscribe(
      (value: any) => {
        this.getDocumentList();
      }
    );
  }

  insertLineBreaks(text: string | null, interval: number = 200): string {
    if (!text) return '';
    return text.toString().replace(new RegExp(`(.{${interval}})`, 'g'), '$1<br>');
  }

  onShowProjectDetails(doc: any) {
    this.router.navigate(['/user/project-details', doc.id]);
  }
}