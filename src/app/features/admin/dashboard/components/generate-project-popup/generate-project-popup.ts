import { ChangeDetectorRef, Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonService } from '../../../../shared/services/common-services/common-service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { DocumentService } from '../../services/document-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';

@Component({
  selector: 'app-generate-project-popup',
  imports: [ReactiveFormsModule],
  templateUrl: './generate-project-popup.html',
  styleUrl: './generate-project-popup.scss',
})
export class GenerateProjectPopup {
  @Output() mapdata = new EventEmitter();

  documentTypeList: any;
  isLoading = signal(false);

  private fb = inject(FormBuilder);
  private commonService = inject(CommonService);
  private cdr = inject(ChangeDetectorRef);
  private bsmodalService = inject(BsModalService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService)

  documentForm: FormGroup = this.fb.group({
    project_name: ['', [Validators.required, Validators.minLength(3)]],
    client_name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['', Validators.required],
  });

  ngOnInit() {
    this.getDocumentList();
  }

  getDocumentList() {
    this.commonService.documentTypeList().subscribe((res: any) => {
      this.documentTypeList = res?.body?.types || []
      this.cdr.detectChanges();
    })
  };

  close(event: any) {
    event.preventDefault();
    this.bsmodalService.hide();
  };

  onSubmit(e: any, formValue: any) {
    e.preventDefault();
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    };
    this.isLoading.set(true);
    let payload = {
      project_name: formValue.project_name,
      client_name: formValue.client_name,
      audit_type: formValue.type,
      metadata: {
        "document_id": '',
        "document_version": '',
        "prepared_by": '',
        "reviewed_by": '',
        "approved_by": '',
        "released_by": '',
        "release_date": '',
        "report_release_date": '',
        "url": '',
        "public_ip": '',
        "internal_ip": '',
        "location": '',
        "asset_criticality": '',
        "asset_hash": '',
        "execution_period": '',
        "methodology": ''
      },
      findings: [],
      auditors: [],
      tools: [],
      distribution: [],
      assets: [],
      controls: [],
      "activity_summary": '',
      document_generate: true,
    };
    this.documentService.generateDocument(payload).subscribe({
      next: (res: any) => {
        console.log(res);
        this.isLoading.set(false);
        if (res?.body?.code == 200) {
          this.notificationService.success(res?.body?.message || 'Upload successful');
          setTimeout(() => {
            this.bsmodalService.hide();
            this.mapdata.emit();
          }, 2000);
        } else {
          this.notificationService.error(res?.body?.message || 'Document generation failed.');
        }
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.notificationService.error(error?.error?.message || 'Document generation failed.');
      },
    });


  }
}
