import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

@Component({
  selector: 'app-generate-certificate',
  imports: [ReactiveFormsModule],
  templateUrl: './generate-certificate.html',
  styleUrl: './generate-certificate.scss',
})
export class GenerateCertificate {
  @Output() mapdata = new EventEmitter();
  editData: any;
  isLoading = signal(false);

  private fb = inject(FormBuilder);
  private bsmodalService = inject(BsModalService);
  private documentService = inject(DocumentService);
  private notificationService = inject(NotificationService);

  certificateForm: FormGroup = this.fb.group({
    project_name: ['', [Validators.required]],
    client_name: ['', [Validators.required]],
    site_name: ['', [Validators.required]],
    site_url: ['', [Validators.required]],
    staging_url: ['', [Validators.required]],
    environment_details: ['', [Validators.required]],
    testing_start_date: ['', [Validators.required]],
    testing_end_date: ['', [Validators.required]],
    issue_date: ['', [Validators.required]],
    validity_years: [{ value: 1, disabled: true }, [Validators.required]],
    hash_value: ['', [Validators.required]],
    audited_by: ['', [Validators.required]],
    vulnerabilities: ['', [Validators.required]],
    extra_recommendation: ['', [Validators.required]],
    signatory_name: ['', [Validators.required]],
    signatory_designation: ['', [Validators.required]],
  });

  close(event: any) {
    event.preventDefault();
    this.bsmodalService.hide();
  }

  onSubmit(e: any) {
    const formValue = this.certificateForm.getRawValue();
    e.preventDefault();
    if (this.certificateForm.invalid) {
      this.certificateForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    let vulnerabilitiesArray: string[] = [];
    if (formValue.vulnerabilities && typeof formValue.vulnerabilities === 'string') {
      vulnerabilitiesArray = formValue.vulnerabilities
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v !== '');
    }

    const payload = {
      project_id: this.editData?.id,
      project_name: formValue.project_name,
      client_name: formValue.client_name,
      site_name: formValue.site_name,
      site_url: formValue.site_url,
      staging_url: formValue.staging_url,
      environment_details: formValue.environment_details,
      testing_start_date: formValue.testing_start_date,
      testing_end_date: formValue.testing_end_date,
      issue_date: formValue.issue_date,
      validity_years: Number(formValue.validity_years),
      hash_value: formValue.hash_value,
      audited_by: formValue.audited_by,
      vulnerabilities: vulnerabilitiesArray,
      extra_recommendation: formValue.extra_recommendation,
      signatory_name: formValue.signatory_name,
      signatory_designation: formValue.signatory_designation,
    };
    this.documentService.generateCertificate(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.body?.code == 200) {
          this.notificationService.success(res?.body?.message || 'Certificate generated successfully');
          setTimeout(() => {
            this.bsmodalService.hide();
            this.mapdata.emit();
          }, 2000);
        } else {
          this.notificationService.error(res?.error?.message || 'Certificate generation failed.');
        }
      },
      error: (error: any) => {
        this.isLoading.set(false);
        this.notificationService.error(error?.error?.message || 'Certificate generation failed.');
      },
    });
  }
}