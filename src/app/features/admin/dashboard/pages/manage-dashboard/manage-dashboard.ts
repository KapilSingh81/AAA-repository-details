import { CommonModule } from '@angular/common';
import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { AddDocment } from '../../components/add-docment/add-docment';
import { DocumentService } from '../../services/document-service';
import { CommonService } from '../../../../shared/services/common-services/common-service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { CookieService } from 'ngx-cookie-service';
import { FormsModule } from '@angular/forms';
import { GenerateProjectPopup } from '../../components/generate-project-popup/generate-project-popup';
import { DocumentEvidance } from '../../components/document-evidance/document-evidance';
import { GenerateCertificate } from '../../components/generate-certificate/generate-certificate';

interface Document {
  id: string;
  name: string;
  client_name: string;
  audit_type: string;
  report_download_url: string;
  certificate_download_url: string;
  created_at: string;
  is_generated: boolean;
  status: string;
}

@Component({
  selector: 'app-manage-dashboard',
  imports: [CommonModule, FormsModule],
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
  private eRef = inject(ElementRef);

  viewMode = signal<'table' | 'card'>('table');
  currentPage = signal(1);
  pageSize = signal(10);
  bsModalRef!: BsModalRef;
  isLoading = signal(false);
  isDownloading = signal<string | null>(null);
  searchName = signal('');
  selectedType = signal('');
  selectedStatus = signal('');
  documentTypeList: any;
  private searchSubject = new Subject<string>();

  private auditIconMap: { [key: string]: string } = {
    web: '🌐',
    vapt: '🛡️',
    comprehensive: '📊',
    mobile: '📱',
    source_code: '💻',
    web_api: '🔌',
    audit: '📋',
    compliance: '✅',
    security: '🔒',
    penetration: '🎯',
    vulnerability: '⚠️',
    project: '📁',
    report: '📊',
    certificate: '📜',
    default: '📄',
  };

  private auditColorMap: { [key: string]: string } = {
    web: 'bg-blue-100',
    vapt: 'bg-purple-100',
    comprehensive: 'bg-indigo-100',
    mobile: 'bg-green-100',
    source_code: 'bg-cyan-100',
    web_api: 'bg-teal-100',
    audit: 'bg-blue-100',
    compliance: 'bg-green-100',
    security: 'bg-red-100',
    penetration: 'bg-orange-100',
    vulnerability: 'bg-yellow-100',
    project: 'bg-indigo-100',
    report: 'bg-amber-100',
    certificate: 'bg-emerald-100',
    default: 'bg-gray-100',
  };

  private auditBadgeMap: { [key: string]: string } = {
    web: 'bg-blue-500 text-blue-800',
    vapt: 'bg-purple-500 text-purple-800',
    comprehensive: 'bg-indigo-500 text-indigo-800',
    mobile: 'bg-green-500 text-green-800',
    source_code: 'bg-cyan-500 text-cyan-800',
    web_api: 'bg-teal-500 text-teal-800',
    audit: 'bg-blue-500 text-blue-800',
    compliance: 'bg-green-500 text-green-800',
    security: 'bg-red-500 text-red-800',
    penetration: 'bg-orange-500 text-orange-800',
    vulnerability: 'bg-yellow-500 text-yellow-800',
    project: 'bg-indigo-500 text-indigo-800',
    report: 'bg-amber-500 text-amber-800',
    certificate: 'bg-emerald-500 text-emerald-800',
    default: 'bg-gray-500 text-gray-800',
  };

  private allDocuments = signal<Document[]>([]);
  totalCount = signal(0);

  documents = computed(() => this.allDocuments());

  totalItems = computed(() => this.totalCount());
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));
  Math = Math;

  ngOnInit() {
    this.getDocumentList();
    this.getDocumentTypeList();

    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(() => {
      this.getDocumentList();
    });
  }

  // Authorization Methods - Only checks for token
  isAuthorized(): boolean {
    const token = this.cookieService.get('aaa-token');
    return !!(token && token.length > 0);
  }

  showUnauthorizedMessage() {
    this.notification.error(
      'You are not authorized to download this document. Please login again.',
    );
  }

  // Handle download with token in URL (simplest approach)
  handleDownload(doc: Document, type: 'report' | 'certificate') {
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
    const separator = url.includes('?') ? '&' : '?';
    const downloadUrl = `${url}${separator}token=${encodeURIComponent(token)}`;
    const newWindow = window.open(downloadUrl, '_blank');
    setTimeout(() => {
      this.isDownloading.set(null);
    }, 2000);

    if (newWindow) {
      this.notification.success(`${type === 'report' ? 'Report' : 'Certificate'} download started`);
    } else {
      window.location.href = downloadUrl;
      this.notification.success(`${type === 'report' ? 'Report' : 'Certificate'} download started`);
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
      audit_type: this.selectedType() || null,
      page: this.currentPage(),
      limit: this.pageSize(),
      status: this.selectedStatus(),
    };

    this.documentService.dashboardList(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        this.allDocuments.set(res?.body?.projects || []);
        this.currentPage.set(res?.body?.pagination?.page || 1);
        this.pageSize.set(res?.body?.pagination?.limit || this.pageSize());
        this.totalCount.set(res?.body?.pagination?.total_count || 0);
        this.totalDocsStat.set(res?.body?.total_projects || 0);
        this.completedStat.set(res?.body?.total_completed || 0);
        this.processingStat.set(res?.body?.total_processing || 0);
        this.draftsStat.set(res?.body?.total_draft || 0);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Error fetching documents:', err);
        this.allDocuments.set([]);
        this.totalCount.set(0);
      },
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
    this.selectedStatus.set('');
    this.searchSubject.next('');
    this.currentPage.set(1);
    this.pageSize.set(10);
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
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.getDocumentList();
    }
  }

  onStatusCardClick(status: string) {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.getDocumentList();
  }

  onGenerateCertificate(value: any) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    const initialState: ModalOptions = {
      initialState: {
        editData: value ? value : '',
      },
    };
    this.bsModalRef = this.modalService.show(
      GenerateCertificate,
      Object.assign(initialState, {
        id: 'confirmation',
        class: 'modal-lg modal-dialog-centered alert-popup',
      }),
    );
    this.bsModalRef?.content.mapdata.subscribe((value: any) => {
      this.searchName.set('');
      this.selectedType.set('');
      this.searchSubject.next('');
      this.currentPage.set(1);
      this.pageSize.set(10);
      this.getDocumentList();
    });
  }

  onPageSizeChange(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(value);
    this.currentPage.set(1);
    this.getDocumentList();
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
        viewOnly: true,
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: 'view-document',
        class: 'modal-lg modal-dialog-centered',
      }),
    );
  }

  editDocument(doc: Document) {
    const initialState: ModalOptions = {
      initialState: {
        editData: doc,
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: 'edit-document',
        class: 'modal-lg modal-dialog-centered',
      }),
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
        editData: value ? value : null,
      },
    };
    this.bsModalRef = this.modalService.show(
      AddDocment,
      Object.assign(initialState, {
        id: 'confirmation',
        class: 'modal-lg modal-dialog-centered alert-popup',
      }),
    );
    this.bsModalRef?.content?.mapdata?.subscribe((value: any) => {
      this.getDocumentList();
    });
  }

  insertLineBreaks(text: string | null, interval: number = 200): string {
    if (!text) return '';
    return text.toString().replace(new RegExp(`(.{${interval}})`, 'g'), '$1<br>');
  }

  onShowProjectDetails(doc: any) {
    this.router.navigate(['/user/project-details', doc.id]);
  }

  @ViewChild('dropdownWrapper') dropdownWrapper!: ElementRef;

  isDropdownOpen: boolean = false;
  toggleDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  redirecTo(path: any, id: any) {
    if (id) {
      this.router.navigate([path, id]);
    } else {
      this.router.navigateByUrl(path);
    }
  }

  onGenerateDocument(value: any) {
    const initialState: ModalOptions = {
      initialState: {
        editData: value ? value : '',
      },
    };
    this.bsModalRef = this.modalService.show(
      GenerateProjectPopup,
      Object.assign(initialState, {
        id: 'confirmation',
        class: 'modal-lg modal-dialog-centered alert-popup',
      }),
    );
    this.bsModalRef?.content.mapdata.subscribe((value: any) => {
      this.searchName.set('');
      this.selectedType.set('');
      this.searchSubject.next('');
      this.currentPage.set(1);
      this.pageSize.set(10);
      this.getDocumentList();
    });
  }

  onAddEvidance(value: any) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    const initialState: ModalOptions = {
      initialState: {
        editData: value ? value : '',
      },
    };
    this.bsModalRef = this.modalService.show(
      DocumentEvidance,
      Object.assign(initialState, {
        id: 'confirmation',
        class: 'modal-lg modal-dialog-centered alert-popup',
      }),
    );
    this.bsModalRef?.content.mapdata.subscribe((value: any) => {
      this.searchName.set('');
      this.selectedType.set('');
      this.searchSubject.next('');
      this.currentPage.set(1);
      this.pageSize.set(10);
      this.getDocumentList();
    });
  }

  getAuditStautsClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'processing':
        return 'bg-warning text-dark';
      case 'draft':
        return 'bg-secondary text-white';
      case 'completed':
        return 'bg-success text-white';
      default:
        return 'bg-light text-dark';
    }
  }

  totalDocsStat = signal(0);
  completedStat = signal(0);
  processingStat = signal(0);
  draftsStat = signal(0);

  private fileIconMap: { [key: string]: { icon: string; color: string } } = {
    pdf: { icon: '📄', color: 'text-red-500 bg-red-50' },
    xls: { icon: '📊', color: 'text-green-600 bg-green-50' },
    xlsx: { icon: '📊', color: 'text-green-600 bg-green-50' },
    doc: { icon: '📝', color: 'text-blue-600 bg-blue-50' },
    docx: { icon: '📝', color: 'text-blue-600 bg-blue-50' },
    ppt: { icon: '📽️', color: 'text-orange-500 bg-orange-50' },
    default: { icon: '📄', color: 'text-slate-500 bg-slate-50' },
  };

  getFileIconDetails(doc: Document) {
    const name = doc.name.toLowerCase();
    if (name.endsWith('.pdf')) return this.fileIconMap['pdf'];
    if (name.endsWith('.xls') || name.endsWith('.xlsx')) return this.fileIconMap['xls'];
    if (name.endsWith('.doc') || name.endsWith('.docx')) return this.fileIconMap['doc'];
    if (name.endsWith('.ppt') || name.endsWith('.pptx')) return this.fileIconMap['ppt'];
    return this.fileIconMap['default'];
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'processing':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-500';
      case 'processing':
        return 'bg-amber-500';
      case 'draft':
        return 'bg-slate-400';
      default:
        return 'bg-slate-300';
    }
  }

  openActionMenuId: string | null = null;
  activeDoc: Document | null = null;
  menuPosition = { top: 0, left: 0 };
  menuOpensUp = false;
  menuReady = false;
  private activeTriggerEl: HTMLElement | null = null;
  private scrollRafId: number | null = null;

  @ViewChild('actionDropdown') actionDropdownRef?: ElementRef<HTMLElement>;

  toggleActionMenu(doc: Document, event: MouseEvent) {
    event.stopPropagation();
    if (this.openActionMenuId === doc.id) {
      this.closeActionMenu();
      return;
    }

    const btn = event.currentTarget as HTMLElement;
    this.activeTriggerEl = btn;
    this.activeDoc = doc;
    this.openActionMenuId = doc.id;
    this.menuReady = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.positionMenu(btn);
      this.menuReady = true;
      this.cdr.detectChanges();
    }, 0);
  }

  private positionMenu(btn: HTMLElement) {
    const rect = btn.getBoundingClientRect();
    const menuWidth = 200;
    const menuEl = this.actionDropdownRef?.nativeElement;
    const menuHeight = menuEl?.getBoundingClientRect().height || 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    this.menuOpensUp = spaceBelow < menuHeight && spaceAbove > spaceBelow;

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    let top: number;
    if (this.menuOpensUp) {
      top = rect.top - menuHeight - 4;
      if (top < 8) top = 8;
    } else {
      top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight - 8) {
        top = window.innerHeight - menuHeight - 8;
      }
    }

    this.menuPosition = { top, left };
  }

  private closeActionMenu() {
    this.openActionMenuId = null;
    this.activeDoc = null;
    this.activeTriggerEl = null;
    this.menuReady = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (this.isDropdownOpen && !target.closest('.add-docs-wrapper')) {
      this.isDropdownOpen = false;
    }

    if (!target.closest('.action-menu-wrapper') && !target.closest('.action-dropdown-menu')) {
      this.closeActionMenu();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event) {
    if (!this.openActionMenuId || !this.activeTriggerEl) return;

    if (this.scrollRafId !== null) {
      cancelAnimationFrame(this.scrollRafId);
    }
    this.scrollRafId = requestAnimationFrame(() => {
      const el = this.activeTriggerEl;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const outOfView = rect.bottom < 0 || rect.top > window.innerHeight;
      if (outOfView) {
        this.closeActionMenu();
      } else {
        this.positionMenu(el);
      }
      this.cdr.detectChanges();
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.openActionMenuId && this.activeTriggerEl) {
      this.positionMenu(this.activeTriggerEl);
      this.cdr.detectChanges();
    } else {
      this.closeActionMenu();
    }
  }

  onFinalizeDocument(doc: any): void {
  this.closeActionMenu();

  const payload = {};

  this.documentService.finlizeDocument(payload, doc.id).subscribe({
    next: (res: any) => {
      if (res?.body?.code === 200) {
        this.notification.success(
          res?.body?.message || 'Document finalized successfully.'
        );

        this.getDocumentList();
      } else {
        this.notification.error(
          res?.error?.message || 'Failed to finalize document.'
        );
      }
    },

    error: (error: any) => {
      this.notification.error(
        error?.error?.message || 'Failed to finalize document.'
      );
    },
  });
}
}
