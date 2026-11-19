import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { finalize } from 'rxjs';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

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
  private cdr = inject(ChangeDetectorRef);

  editData: any;

  isLoading = signal(false);
  isDragging = signal(false);
  documentFileLoading = signal(false);
  selectedDocument = signal<File | null>(null);

  documentForm: FormGroup = this.fb.group({
    document: ['', Validators.required],
  });

  close(e: Event) {
    e.preventDefault();
    this.modalService.hide();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
    input.value = '';
  }

  handleFileSelection(file: File) {
    this.documentFileLoading.set(true);

    const reader = new FileReader();

    reader.onload = () => {
      this.selectedDocument.set(file);
      this.documentForm.patchValue({ document: file.name });
      this.documentForm.get('document')?.markAsTouched();
      this.documentForm.get('document')?.setErrors(null);
      this.documentFileLoading.set(false);
      this.cdr.detectChanges();
    };

    reader.onerror = () => {
      this.documentFileLoading.set(false);
      this.notificationService.error('Failed to read file. Please try again.');
    };

    reader.readAsArrayBuffer(file);
  }

  removeFile(event: Event) {
    event.stopPropagation();
    this.selectedDocument.set(null);
    this.documentForm.patchValue({ document: '' });
    this.documentForm.get('document')?.markAsTouched();
    this.documentForm.get('document')?.setErrors({ required: true });
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(e: Event) {
    e.preventDefault();
    this.documentForm.get('document')?.markAsTouched();

    if (!this.selectedDocument()) {
      this.documentForm.get('document')?.setErrors({ required: true });
    }

    if (this.documentForm.invalid || !this.editData?.id) {
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    formData.append('document', this.selectedDocument()!);

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