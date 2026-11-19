import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

interface UploadField {
  key: 'document' | 'questionnaire' | 'exception_file' | 'email_approval';
  label: string;
  required: boolean;
  accept: string;
  hint: string;
}

@Component({
  selector: 'app-reupload-document',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reupload-document.html',
})
export class ReuploadDocument {
  @Output() mapdata = new EventEmitter();

  private fb = inject(FormBuilder);
  private modalService = inject(BsModalService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService);

  editData: any;

  isLoading = signal(false);
  showNoFileError = signal(false);
  draggingKey = signal<string | null>(null);
  selectedFiles = signal<Record<string, File | null>>({
    document: null,
    questionnaire: null,
    exception_file: null,
    email_approval: null,
  });

  uploadFields: UploadField[] = [
    {
      key: 'document',
      label: 'Document',
      required: false,
      accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg',
      hint: 'PDF, Word, Excel, PowerPoint, Images',
    },
    {
      key: 'questionnaire',
      label: 'Questionnaire',
      required: false,
      accept: '.xls,.xlsx',
      hint: 'Excel only (.xls, .xlsx)',
    },
    {
      key: 'exception_file',
      label: 'Exception File',
      required: false,
      accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg',
      hint: 'PDF, Word, Excel, Images',
    },
    {
      key: 'email_approval',
      label: 'Email Approval',
      required: false,
      accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg,.eml,.msg',
      hint: 'PDF, Word, Images, Email (.eml, .msg)',
    },
  ];

  documentForm: FormGroup = this.fb.group({
    document: [''],
    questionnaire: [''],
    exception_file: [''],
    email_approval: [''],
  });

  close(e: Event) {
    e.preventDefault();
    this.modalService.hide();
  }

  onDragOver(event: DragEvent, key: string) {
    event.preventDefault();
    event.stopPropagation();
    this.draggingKey.set(key);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.draggingKey.set(null);
  }

  onDrop(event: DragEvent, key: string) {
    event.preventDefault();
    event.stopPropagation();
    this.draggingKey.set(null);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(key, files[0]);
    }
  }

  onFileSelected(event: Event, key: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(key, input.files[0]);
    }
    input.value = '';
  }

  handleFileSelection(key: string, file: File) {
    const field = this.uploadFields.find((f) => f.key === key);
    const extension = '.' + (file.name.split('.').pop() || '').toLowerCase();

    if (field && !field.accept.split(',').includes(extension)) {
      this.notificationService.error(`${field.label}: only ${field.hint} allowed.`);
      return;
    }

    this.setFile(key, file);
  }

  removeFile(event: Event, key: string) {
    event.stopPropagation();
    this.setFile(key, null);
  }

  private setFile(key: string, file: File | null) {
    this.selectedFiles.update((files) => ({ ...files, [key]: file }));
    this.showNoFileError.set(false);
    const control = this.documentForm.get(key);
    control?.patchValue(file ? file.name : '');
    control?.markAsTouched();
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(e: Event) {
    e.preventDefault();

    if (!this.editData?.id) {
      return;
    }

    if (!this.uploadFields.some((field) => this.selectedFiles()[field.key])) {
      this.showNoFileError.set(true);
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    this.uploadFields.forEach((field) => {
      const file = this.selectedFiles()[field.key];
      if (file) {
        formData.append(field.key, file);
      }
    });

    this.documentService
      .reuploadDocument(formData, this.editData.id)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res?.body?.code === 200) {
            this.notificationService.success(res?.body?.message || 'Re-upload successful');
            this.modalService.hide();
            this.mapdata.emit();
          } else {
            this.notificationService.error(res?.body?.message || 'Re-upload failed');
          }
        },
        error: (err) => {
          console.error('Re-upload error:', err);
          this.notificationService.error(
            err?.error?.message || 'Re-upload failed. Please try again.',
          );
        },
      });
  }
}