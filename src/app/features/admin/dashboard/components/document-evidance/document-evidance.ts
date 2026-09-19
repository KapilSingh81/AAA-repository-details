import { ChangeDetectorRef, Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { DocumentService } from '../../services/document-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-evidance',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './document-evidance.html',
  styleUrl: './document-evidance.scss',
})
export class DocumentEvidance {
  @Output() mapdata = new EventEmitter();

  isLoading = signal(false);
  selectedFileName = signal<string>('');
  selectedFile: File | null = null;
  editData:any;

  stageOptions = ['interim', 'final'];

  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private bsmodalService = inject(BsModalService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService);

  evidanceForm: FormGroup = this.fb.group({
    finding_index: [0, [Validators.required, Validators.min(0)]],
    stage: ['', Validators.required],
    image: ['', Validators.required],
  });

  close(event: any) {
    event.preventDefault();
    this.bsmodalService.hide();
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
      this.evidanceForm.patchValue({ image: file.name });
      this.evidanceForm.get('image')?.markAsTouched();
    }
  }

  onSubmit(e: any, formValue: any) {
    e.preventDefault();
    if (this.evidanceForm.invalid || !this.selectedFile) {
      this.evidanceForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const formData = new FormData();
    formData.append('finding_index', formValue.finding_index);
    formData.append('stage', formValue.stage);
    formData.append('image', this.selectedFile);

    this.documentService.uploadEvidance(formData,this.editData?.id).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.body?.code == 200) {
          this.notificationService.success(res?.body?.message || 'Evidence uploaded successfully');
          setTimeout(() => {
            this.bsmodalService.hide();
            this.mapdata.emit();
          }, 2000);
        } else {
          this.notificationService.error(res?.error?.message || 'Evidence upload failed.');
        }
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.notificationService.error(error?.error?.message || 'Evidence upload failed.');
      },
    });
  }
}