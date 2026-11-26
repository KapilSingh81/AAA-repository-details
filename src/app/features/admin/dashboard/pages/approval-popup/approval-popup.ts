import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, signal } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

type ApprovalDecision = 'approve' | 'reject';

interface DecisionOption {
  value: ApprovalDecision;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-approval-popup',
  imports: [CommonModule],
  templateUrl: './approval-popup.html',
})
export class ApprovalPopup {
  private documentService = inject(DocumentService);
  private notification = inject(NotificationService);
  private bsModalRef = inject(BsModalRef);

  readonly maxCommentLength = 1000;

  readonly decisionOptions: DecisionOption[] = [
    {
      value: 'approve',
      label: 'Approve',
      hint: 'Report is correct. Barcode upload will be unlocked.',
    },
    {
      value: 'reject',
      label: 'Reject',
      hint: 'Report needs changes. Barcode upload stays locked.',
    },
  ];

  editData: any;
  mapdata = new EventEmitter<boolean>();

  decision = signal<ApprovalDecision | ''>('');
  comment = signal('');
  isSubmitting = signal(false);
  errorMessage = signal('');

  selectDecision(value: ApprovalDecision) {
    if (this.isSubmitting()) return;
    this.decision.set(value);
    this.errorMessage.set('');
  }

  onCommentInput(event: Event) {
    this.comment.set((event.target as HTMLTextAreaElement).value);
    this.errorMessage.set('');
  }

  onSubmit() {
    const projectId = this.editData?.id;
    const decision = this.decision();
    const comment = this.comment().trim();

    if (!projectId) {
      this.errorMessage.set('Project id not found');
      return;
    }

    if (!decision) {
      this.errorMessage.set('Please select Approve or Reject');
      return;
    }

    if (decision === 'reject' && !comment) {
      this.errorMessage.set('Please enter a comment explaining the rejection');
      return;
    }

    const payload: { decision: ApprovalDecision; comment?: string } = { decision };
    if (comment) {
      payload.comment = comment;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.documentService.reportApproval(payload, projectId).subscribe({
      next: (res: any) => {
        const body = res?.body ?? res;
        this.isSubmitting.set(false);

        if (body?.code === 200) {
          this.notification.success(
            body?.message || (decision === 'approve' ? 'Report approved' : 'Report rejected'),
          );
          this.mapdata.emit(true);
          this.bsModalRef.hide();
          return;
        }

        const message = this.getErrorMessage(body);
        this.errorMessage.set(message);
        this.notification.error(message);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        const message = this.getErrorMessage(err?.error ?? err);
        this.errorMessage.set(message);
        this.notification.error(message);
      },
    });
  }

  onClose() {
    this.bsModalRef.hide();
  }

  private getErrorMessage(body: any): string {
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      return detail.map((item: any) => item?.msg || 'Validation error').join(', ');
    }
    return (
      body?.message ||
      (typeof detail === 'string' ? detail : detail?.message) ||
      'Unable to submit the approval. Please try again.'
    );
  }
}