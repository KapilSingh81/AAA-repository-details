import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, computed, ElementRef, HostListener, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { FinalizeDocumentPopup } from '../../../dashboard/pages/finalize-document-popup/finalize-document-popup';
import { ReuploadDocument } from '../../../dashboard/pages/reupload-document/reupload-document';
import { SigningAssetsPopup } from '../../../dashboard/pages/signing-assets-popup/signing-assets-popup';
import { AuditReviewService } from '../../service/audit-review';

interface PersonInfo {
  id?: string;
  username?: string;
  email?: string;
}

interface AuditReport {
  report_id: string;
  project_id: string;
  client: { name: string } | null;
  project: { name: string } | null;
  report: {
    filename: string;
    origin: string;
    audit_type: string;
    is_generated: boolean;
    processing_status: string;
    stage: string;
    upload_version: number;
    uploaded_at: string | null;
    created_at: string | null;
    generated_at: string | null;
    uploaded_by?: PersonInfo;
    created_by?: PersonInfo;
  } | null;
  certificate: {
    generated: boolean;
    certificate_id: string | null;
    certificate_no: string | null;
    generated_at: string | null;
  } | null;
  barcode: { uploaded: boolean; uploaded_at: string | null } | null;
  signature: { uploaded: boolean; uploaded_at: string | null } | null;
  completion_status: string;
  pending_admin_actions: string[] | null;
}

interface ReportFilters {
  period: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
}

interface PendingApproval {
  project_id: string;
  project_name: string;
  client_name: string;
}

interface ApprovalOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manage-audit-review',
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-audit-review.html',
})
export class ManageAuditReview implements OnInit {
  @ViewChild('actionDropdown') actionDropdown?: ElementRef<HTMLElement>;

  private auditReviewService = inject(AuditReviewService);
  private modalService = inject(BsModalService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private activeTriggerEl: HTMLElement | null = null;
  private scrollRafId: number | null = null;

  bsModalRef!: BsModalRef;
  openActionMenuId: string | null = null;
  activeItem: AuditReport | null = null;
  menuPosition = { top: 0, left: 0 };
  menuOpensUp = false;
  menuReady = false;

  periodOptions = [
    { label: 'Today', value: 'today' },
    { label: 'This Month', value: 'month' },
    { label: 'Custom', value: 'custom' },
    { label: 'All', value: 'all' },
  ];

  pendingLimitOptions: number[] = [50, 100, 250, 500];

  approvalDecisions: ApprovalOption[] = [
    { label: 'Approve', value: 'approve' },
    { label: 'Reject', value: 'reject' },
  ];

  isLoading = signal(false);
  downloadingKey = signal<string | null>(null);
  actionAlert = signal('');
  selectedPeriod = signal('today');
  startDate = signal('');
  endDate = signal('');
  searchText = signal('');
  appliedFilters = signal<ReportFilters | null>(null);
  totalFromApi = signal(0);
  reports = signal<AuditReport[]>([]);

  showPendingPopup = signal(false);
  isPendingLoading = signal(false);
  pendingApprovals = signal<PendingApproval[]>([]);
  pendingTotal = signal(0);
  pendingLimit = signal(100);
  pendingError = signal('');

  approvalItem = signal<PendingApproval | null>(null);
  approvalDecision = signal('approve');
  approvalComment = signal('');
  isSubmittingApproval = signal(false);
  approvalError = signal('');

  filteredReports = computed(() => {
    const query = this.searchText().toLowerCase().trim();
    const list = this.reports();
    if (!query) return list;
    return list.filter((item) =>
      [
        item.client?.name,
        item.project?.name,
        item.report?.filename,
        item.report?.uploaded_by?.username,
      ].some((value) => value?.toLowerCase().includes(query)),
    );
  });

  completedCount = computed(
    () => this.reports().filter((item) => item.completion_status?.toLowerCase() === 'completed').length,
  );

  pendingCount = computed(
    () => this.reports().filter((item) => item.completion_status?.toLowerCase() !== 'completed').length,
  );

  ngOnInit() {
    this.getReports();
  }

  getReports() {
    if (this.selectedPeriod() === 'custom' && (!this.startDate() || !this.endDate())) {
      this.notification.error('Please select start date and end date');
      return;
    }

    if (
      this.selectedPeriod() === 'custom' &&
      this.startDate() &&
      this.endDate() &&
      this.startDate() > this.endDate()
    ) {
      this.notification.error('Start date cannot be after end date');
      return;
    }

    const params: any = { period: this.selectedPeriod() };
    if (this.selectedPeriod() === 'custom') {
      params.start_date = this.startDate();
      params.end_date = this.endDate();
    }

    this.isLoading.set(true);
    this.auditReviewService.getAdminReportStatus(params).subscribe({
      next: (res: any) => {
        const data = res?.body || res;
        this.isLoading.set(false);
        this.reports.set(data?.reports || []);
        this.totalFromApi.set(data?.total || 0);
        this.appliedFilters.set(data?.filters || null);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.reports.set([]);
        this.totalFromApi.set(0);
        this.appliedFilters.set(null);
        this.notification.error(err?.error?.detail || 'Unable to load reports');
      },
    });
  }

  openPendingPopup() {
    this.showPendingPopup.set(true);
    this.getPendingApprovals();
  }

  closePendingPopup() {
    if (this.isSubmittingApproval()) return;
    this.showPendingPopup.set(false);
    this.approvalItem.set(null);
    this.pendingError.set('');
  }

  getPendingApprovals() {
    this.isPendingLoading.set(true);
    this.pendingError.set('');
    this.auditReviewService.getPendingApprovals(this.pendingLimit()).subscribe({
      next: (res: any) => {
        const data = res?.body || res;
        this.isPendingLoading.set(false);
        this.pendingApprovals.set(data?.reports || []);
        this.pendingTotal.set(data?.total || 0);
      },
      error: (err: any) => {
        this.isPendingLoading.set(false);
        this.pendingApprovals.set([]);
        this.pendingTotal.set(0);
        const message = this.extractMessage(err);
        this.pendingError.set(message);
        if (message) this.notification.error(message);
      },
    });
  }

  onPendingLimitChange(event: Event) {
    this.pendingLimit.set(Number((event.target as HTMLSelectElement).value));
    this.getPendingApprovals();
  }

  openApprovalPopup(item: PendingApproval) {
    this.approvalItem.set(item);
    this.approvalDecision.set(this.approvalDecisions[0]?.value || '');
    this.approvalComment.set('');
    this.approvalError.set('');
  }

  closeApprovalPopup() {
    if (this.isSubmittingApproval()) return;
    this.approvalItem.set(null);
    this.approvalComment.set('');
    this.approvalError.set('');
  }

  onDecisionChange(value: string) {
    this.approvalDecision.set(value);
  }

  onCommentInput(event: Event) {
    this.approvalComment.set((event.target as HTMLTextAreaElement).value);
  }

  submitApproval() {
    const item = this.approvalItem();
    if (!item || this.isSubmittingApproval()) return;

    const payload = {
      decision: this.approvalDecision(),
      comment: this.approvalComment().trim(),
    };

    this.isSubmittingApproval.set(true);
    this.approvalError.set('');

    this.auditReviewService.submitApproval(item.project_id, payload).subscribe({
      next: (res: any) => {
        const data = res?.body || res;
        this.isSubmittingApproval.set(false);
        this.approvalItem.set(null);
        this.approvalComment.set('');
        const message = this.extractMessage(data);
        if (message) this.notification.success(message);
        this.getPendingApprovals();
        this.getReports();
      },
      error: (err: any) => {
        this.isSubmittingApproval.set(false);
        const message = this.extractMessage(err);
        this.approvalError.set(message);
        if (message) this.notification.error(message);
      },
    });
  }

  extractMessage(source: any): string {
    const body = source?.error ?? source;
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      return detail.map((entry: any) => entry?.msg || entry?.message || '').filter(Boolean).join(', ');
    }
    if (typeof detail === 'string') return detail;
    return body?.message || '';
  }

  getDecisionClass(value: string, selected: boolean): string {
    if (!selected) return 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
    switch (value?.toLowerCase()) {
      case 'approve':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'reject':
        return 'bg-red-50 text-red-700 border-red-300';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-300';
    }
  }

  onPeriodChange(value: string) {
    this.selectedPeriod.set(value);
    if (value !== 'custom') {
      this.startDate.set('');
      this.endDate.set('');
      this.getReports();
    }
  }

  onStartDateChange(event: Event) {
    this.startDate.set((event.target as HTMLInputElement).value);
  }

  onEndDateChange(event: Event) {
    this.endDate.set((event.target as HTMLInputElement).value);
  }

  onSearch(event: Event) {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  clearFilters() {
    this.selectedPeriod.set('today');
    this.startDate.set('');
    this.endDate.set('');
    this.searchText.set('');
    this.getReports();
  }

  onDownloadReport(item: AuditReport) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    this.downloadingKey.set(`${item.report_id}-report`);
    this.actionAlert.set('');
    this.auditReviewService.downloadReportPdf(item.report_id).subscribe({
      next: (blob: Blob) => {
        this.downloadingKey.set(null);
        this.saveBlob(blob, item.report?.filename || 'report.pdf');
      },
      error: (err: any) => this.handleDownloadError(err),
    });
  }

  onDownloadCertificate(item: AuditReport) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    const certId = item.certificate?.certificate_id;
    if (!certId) {
      this.notification.error('Certificate is not generated yet');
      return;
    }

    this.downloadingKey.set(`${item.report_id}-certificate`);
    this.actionAlert.set('');
    this.auditReviewService.downloadCertificatePdf(certId).subscribe({
      next: (blob: Blob) => {
        this.downloadingKey.set(null);
        this.saveBlob(blob, `${item.certificate?.certificate_no || 'certificate'}.pdf`);
      },
      error: (err: any) => this.handleDownloadError(err),
    });
  }

  onUploadBarcode(item: AuditReport) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    this.openModal(SigningAssetsPopup, { editData: this.toPopupData(item) }, 'signing-assets');
  }

  onFinalize(item: AuditReport) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    this.openModal(
      FinalizeDocumentPopup,
      { editData: this.toPopupData(item), mode: 'finalize' },
      'finalize-document',
      'static',
    );
  }

  onReupload(item: AuditReport) {
    this.closeActionMenu();
    this.cdr.detectChanges();
    this.openModal(ReuploadDocument, { editData: this.toPopupData(item) }, 'reupload-document');
  }

  toggleActionMenu(item: AuditReport, event: Event) {
    event.stopPropagation();
    if (this.openActionMenuId === item.report_id) {
      this.closeActionMenu();
      return;
    }
    this.activeItem = item;
    this.openActionMenuId = item.report_id;
    this.menuReady = false;
    this.menuOpensUp = false;
    this.activeTriggerEl = event.currentTarget as HTMLElement;
    this.positionMenu(this.activeTriggerEl);
  }

  positionMenu(trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 220;
    const gap = 4;
    this.menuPosition = {
      top: rect.bottom + gap,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    };
    this.cdr.detectChanges();

    requestAnimationFrame(() => {
      const menuEl = this.actionDropdown?.nativeElement;
      if (!menuEl) return;
      const menuHeight = menuEl.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensUp = spaceBelow < menuHeight + gap && rect.top > menuHeight + gap;
      this.menuOpensUp = opensUp;
      this.menuPosition = {
        top: opensUp ? rect.top - menuHeight - gap : rect.bottom + gap,
        left: this.menuPosition.left,
      };
      this.menuReady = true;
      this.cdr.detectChanges();
    });
  }

  closeActionMenu() {
    this.openActionMenuId = null;
    this.activeItem = null;
    this.activeTriggerEl = null;
    this.menuReady = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (!this.openActionMenuId) return;
    const target = event.target as HTMLElement;
    if (target.closest('.action-menu-wrapper') || target.closest('.action-dropdown-menu')) return;
    this.closeActionMenu();
  }

  @HostListener('document:keydown.escape')
  onEscapePressed() {
    if (this.approvalItem()) {
      this.closeApprovalPopup();
      return;
    }
    if (this.showPendingPopup()) {
      this.closePendingPopup();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.refreshMenuPosition();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.refreshMenuPosition();
  }

  private refreshMenuPosition() {
    if (!this.openActionMenuId || !this.activeTriggerEl) return;
    if (this.scrollRafId !== null) return;
    this.scrollRafId = requestAnimationFrame(() => {
      this.scrollRafId = null;
      if (this.activeTriggerEl) {
        this.positionMenu(this.activeTriggerEl);
      }
    });
  }

  private openModal(component: any, initialState: any, id: string, backdrop: boolean | 'static' = true) {
    const options: ModalOptions = {
      initialState,
      id,
      class: 'modal-lg modal-dialog-centered alert-popup',
      backdrop,
    };
    this.bsModalRef = this.modalService.show(component, options);
    this.bsModalRef?.content?.mapdata?.subscribe(() => {
      this.getReports();
    });
  }

  private toPopupData(item: AuditReport) {
    return {
      id: item.project_id,
      project_id: item.project_id,
      report_id: item.report_id,
      name: item.project?.name,
      client_name: item.client?.name || '',
      filename: item.report?.filename,
      audit_type: item.report?.audit_type,
      is_generated: item.report?.is_generated,
      certificate_id: item.certificate?.certificate_id,
      certificate_download_url: '',
      report_download_url: '',
      created_at: item.report?.created_at,
      stage: item.report?.stage,
      status: item.report?.processing_status,
    };
  }

  private saveBlob(blob: Blob, fileName: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private async handleDownloadError(err: any) {
    const message = await this.getErrorMessage(err);
    this.downloadingKey.set(null);
    this.actionAlert.set(message);
    this.notification.error(message);
  }

  private async getErrorMessage(err: any): Promise<string> {
    const body = err?.error;
    if (body instanceof Blob) {
      try {
        const parsed = JSON.parse(await body.text());
        return parsed?.message || parsed?.detail || 'Download failed';
      } catch {
        return 'Download failed';
      }
    }
    return body?.message || body?.detail || 'Download failed';
  }

  getAuditTypeClass(type?: string | null): string {
    switch (type?.toLowerCase()) {
      case 'web':
        return 'bg-blue-500';
      case 'vapt':
        return 'bg-purple-500';
      case 'mobile':
        return 'bg-green-500';
      case 'source_code':
        return 'bg-cyan-500';
      case 'web_api':
        return 'bg-teal-500';
      case 'comprehensive':
        return 'bg-indigo-500';
      default:
        return 'bg-slate-500';
    }
  }

  getCompletionBadgeClass(status?: string | null): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getCompletionDotClass(status?: string | null): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400';
    }
  }

  getProcessingClass(status?: string | null): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'processing':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  getStageClass(stage?: string | null): string {
    switch (stage?.toLowerCase()) {
      case 'final':
      case 'finalized':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'draft':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  }

  getChecklistClass(done: boolean | undefined): string {
    return done
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-slate-50 text-slate-400 border-slate-200';
  }
}