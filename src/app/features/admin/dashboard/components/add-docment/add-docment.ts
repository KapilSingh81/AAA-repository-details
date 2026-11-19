import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { finalize } from 'rxjs';
import { CommonService } from '../../../../shared/services/common-services/common-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

@Component({
  selector: 'app-add-docment',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-docment.html',
  styleUrl: './add-docment.scss',
})
export class AddDocment implements OnInit {
  @Output() mapdata = new EventEmitter();

  private fb = inject(FormBuilder);
  private modalService = inject(BsModalService);
  private commonService = inject(CommonService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  isLoading = signal(false);
  isDragging = signal(false);
  documentFileLoading = signal(false);
  selectedDocument = signal<File | null>(null);
  documentTypeList: any;

  documentForm: FormGroup = this.fb.group({
    project_name: ['', [Validators.required, Validators.minLength(3)]],
    client_name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['', Validators.required],
    document: ['', Validators.required],
  });

  ngOnInit() {
    this.getDocumentList();
  }

  getDocumentList() {
    this.commonService.documentTypeList().subscribe((res: any) => {
      this.documentTypeList = res?.body?.options || [];
      this.cdr.detectChanges();
    });
  }

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

    Object.keys(this.documentForm.controls).forEach((key) => {
      this.documentForm.get(key)?.markAsTouched();
    });

    if (!this.selectedDocument()) {
      this.documentForm.get('document')?.setErrors({ required: true });
    }

    if (this.documentForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    formData.append('project_name', this.documentForm.get('project_name')?.value);
    formData.append('client_name', this.documentForm.get('client_name')?.value);
    formData.append('type', this.documentForm.get('type')?.value);
    formData.append('document', this.selectedDocument()!);

    this.documentService
      .addUploadDoumnet(formData)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          if (res?.body?.code === 200) {
            this.notificationService.success(res?.body?.message || 'Upload successful');
            this.modalService.hide();
            this.mapdata.emit();
          } else {
            this.notificationService.error(res?.body?.message || 'Upload failed');
          }
        },
        error: (err) => {
          console.error('Upload error:', err);
          this.notificationService.error('Upload failed. Please try again.');
        },
      });
  }
}