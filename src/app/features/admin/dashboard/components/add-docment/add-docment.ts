import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { CommonService } from '../../../../shared/services/common-services/common-service';
import { DocumentService } from '../../services/document-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';

@Component({
  selector: 'app-add-docment',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-docment.html',
  styleUrl: './add-docment.scss',
})
export class AddDocment {
  @Output() mapdata = new EventEmitter();

  private fb = inject(FormBuilder);
  private modalService = inject(BsModalService);
  private commonService = inject(CommonService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService);
    private cdr = inject(ChangeDetectorRef); 
  
  isLoading = signal(false);
  isDragging = signal(false);
  selectedDocument = signal<File | null>(null);
  selectedCertificate = signal<File | null>(null);
  editData: any;
  documentTypeList : any;

  documentForm: FormGroup = this.fb.group({
    project_name: ['', [Validators.required, Validators.minLength(3)]],
    client_name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['', Validators.required],
    document: ['', Validators.required],
    certificate: ['', Validators.required]
  });

  ngOnInit() {
    this.getDocumentList();
  }

  getDocumentList() {
    this.commonService.documentTypeList().subscribe((res:any) => {
      this.documentTypeList = res?.body?.types || []  
      this.cdr.detectChanges();  
      console.log(this.documentTypeList);
    })
  }

  close(e: Event) {
    e.preventDefault();
    this.modalService.hide();
  }

  // Drag and Drop handlers
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

  onDrop(event: DragEvent, fileType: 'document' | 'certificate') {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0], fileType);
    }
  }

  onFileSelected(event: Event, fileType: 'document' | 'certificate') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0], fileType);
    }
  }

  handleFileSelection(file: File, fileType: 'document' | 'certificate') {
    if (fileType === 'document') {
      this.selectedDocument.set(file);
      this.documentForm.patchValue({ document: file.name });
      this.documentForm.get('document')?.markAsTouched();
    } else {
      this.selectedCertificate.set(file);
      this.documentForm.patchValue({ certificate: file.name });
      this.documentForm.get('certificate')?.markAsTouched();
    }
    // Clear validation error
    this.documentForm.get(fileType)?.setErrors(null);
  }

  removeFile(event: Event, fileType: 'document' | 'certificate') {
    event.stopPropagation();
    if (fileType === 'document') {
      this.selectedDocument.set(null);
      this.documentForm.patchValue({ document: '' });
    } else {
      this.selectedCertificate.set(null);
      this.documentForm.patchValue({ certificate: '' });
    }
    this.documentForm.get(fileType)?.markAsTouched();
    this.documentForm.get(fileType)?.setErrors({ required: true });
  }

  formatFileSize(size: number): string {
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    return (size / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSubmit(e:any) {
    e.preventDefault();
    Object.keys(this.documentForm.controls).forEach(key => {
      this.documentForm.get(key)?.markAsTouched();
    });

    if (!this.selectedDocument()) {
      this.documentForm.get('document')?.setErrors({ required: true });
    }
    if (!this.selectedCertificate()) {
      this.documentForm.get('certificate')?.setErrors({ required: true });
    }

    if (this.documentForm.invalid) {
      return;
    }

    this.isLoading.set(true);

    const formData = new FormData();
    formData.append('project_name', this.documentForm.get('project_name')?.value);
    formData.append('client_name', this.documentForm.get('client_name')?.value);
    formData.append('type', this.documentForm.get('type')?.value);
        if (this.selectedDocument()) {
      formData.append('document', this.selectedDocument()!);
    }
    if (this.selectedCertificate()) {
      formData.append('certificate', this.selectedCertificate()!);
    }
    this.documentService.addUploadDoumnet(formData).subscribe({
      next: (res) => {
        this.isLoading.set(false);        
        if(res?.body?.code == 200) {
          this.notificationService.success(res?.body?.message);
          this.modalService.hide();
          this.mapdata.emit();
        } else {
          this.notificationService.error(res?.error?.message);
        }     
      },
      error: (err) => {
         console.log(err);
        this.isLoading.set(false);
        this.notificationService.error('Upload failed');
      }
    });

    // Simulate API call
    setTimeout(() => {
      this.isLoading.set(false);
      console.log('Form Data:', formData);
      console.log('Document:', this.selectedDocument()?.name);
      console.log('Certificate:', this.selectedCertificate()?.name);
      this.modalService.hide();
    }, 2000);
  }
}