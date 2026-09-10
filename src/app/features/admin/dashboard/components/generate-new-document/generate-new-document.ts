import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DocumentService } from '../../services/document-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { Router } from '@angular/router';

const IP_PATTERN = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/;
const URL_PATTERN = /^(https?:\/\/)([\w-]+\.)+[\w-]{2,}(:\d+)?(\/[^\s]*)?$/i;
export const MOBILE_PATTERN = /^[0-9]{10}$/;

@Component({
  selector: 'app-generate-new-document',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './generate-new-document.html',
  styleUrl: './generate-new-document.scss',
})
export class GenerateNewDocument implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentService);
  private readonly destroyRef = inject(DestroyRef);
  private notificationService = inject(NotificationService);
  private router = inject(Router)

  loading = signal(false);
  errorMessage = signal('');

  projectId = signal('');
  reportUrl = signal('');
  certificateUrl = signal('');
  statusOptions = signal<string[]>([]);
  observationTypeOptions = signal<string[]>([]);

  documentForm = this.fb.group({
    project_name: ['', [Validators.required, Validators.minLength(3)]],
    client_name: ['', [Validators.required, Validators.minLength(3)]],
    audit_type: ['', Validators.required],

    metadata: this.fb.group({
      document_id: ['', Validators.required],
      document_version: ['', Validators.required],
      prepared_by: ['', Validators.required],
      reviewed_by: ['', Validators.required],
      approved_by: ['', Validators.required],
      released_by: ['', Validators.required],
      release_date: ['', Validators.required],
      report_release_date: ['', Validators.required],
      url: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
      public_ip: ['', [Validators.required, Validators.pattern(IP_PATTERN)]],
      internal_ip: ['', [Validators.required, Validators.pattern(IP_PATTERN)]],
      location: ['', Validators.required],
      asset_criticality: ['', Validators.required],
      asset_hash: ['', Validators.required],
      execution_period: ['', Validators.required],
      methodology: ['', [Validators.required, Validators.minLength(10)]],
    }),

    findings: this.fb.array([]),
    auditors: this.fb.array([]),
    tools: this.fb.array([]),
    distribution: this.fb.array([]),
    assets: this.fb.array([]),
    controls: this.fb.array([]),

    summary: this.fb.group({
      total_observations: [0],
      complied: [0],
      not_complied: [0],
      exceptions: [0],
      not_applicable: [0],
    }),
  });

  ngOnInit(): void {
    this.addFinding();
    this.addAuditor();
    this.addTool();
    this.addDistribution();
    this.addAsset();
    this.addControl();
    this.loadStatusOptions();
    this.findings.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateSummary());
  }

  get metadata(): FormGroup {
    return this.documentForm.get('metadata') as FormGroup;
  }

  get findings(): FormArray {
    return this.documentForm.get('findings') as FormArray;
  }

  get auditors(): FormArray {
    return this.documentForm.get('auditors') as FormArray;
  }

  get tools(): FormArray {
    return this.documentForm.get('tools') as FormArray;
  }

  get distribution(): FormArray {
    return this.documentForm.get('distribution') as FormArray;
  }

  get assets(): FormArray {
    return this.documentForm.get('assets') as FormArray;
  }

  get controls(): FormArray {
    return this.documentForm.get('controls') as FormArray;
  }

  get summary(): {
    total_observations: number;
    complied: number;
    not_complied: number;
    exceptions: number;
    not_applicable: number;
  } {
    return (
      this.documentForm.get('summary')?.getRawValue() ?? {
        total_observations: 0,
        complied: 0,
        not_complied: 0,
        exceptions: 0,
        not_applicable: 0,
      }
    );
  }

  private loadStatusOptions(): void {
    this.documentService.getStatusOptions().subscribe({
      next: (res: any) => {
        if (Array.isArray(res?.body?.statuses) && res.body?.statuses.length) {
          this.statusOptions.set(res.body.statuses);
        }
        if (Array.isArray(res?.body?.observation_types) && res.body?.observation_types.length) {
          this.observationTypeOptions.set(res.body.observation_types);
        }
      },
      error: (error: any) => {
        console.error('Failed to load status options', error);
        this.errorMessage.set('Could not load dropdown options. Please refresh the page.');
      },
    });
  }

  createFinding(): FormGroup {
    return this.fb.group({
      finding_id: [0],
      affected_asset: ['', Validators.required],
      observation_title: ['', Validators.required],
      detailed_observation: ['', [Validators.required, Validators.minLength(10)]],
      cve_cwe: [''],
      severity: ['', Validators.required],
      recommendation: ['', Validators.required],
      reference: [''],
      observation_type: ['', Validators.required],
      evidence: this.fb.group({
        interim: this.fb.array([this.fb.control('')]),
        final: this.fb.array([this.fb.control('')]),
      }),
      status: ['', Validators.required],
    });
  }

  addFinding(): void {
    this.findings.push(this.createFinding());
    this.updateFindingIds();
    this.updateSummary();
  }

  removeFinding(index: number): void {
    if (this.findings.length <= 1) {
      this.findings.at(0)?.reset();
      this.updateFindingIds();
      this.updateSummary();
      return;
    }
    this.findings.removeAt(index);
    this.updateFindingIds();
    this.updateSummary();
  }

  private updateFindingIds(): void {
    this.findings.controls.forEach((control: AbstractControl, index: number) => {
      control.get('finding_id')?.setValue(index + 1, { emitEvent: false });
    });
  }

  getEvidence(finding: AbstractControl): FormGroup {
    return finding.get('evidence') as FormGroup;
  }

  getInterim(finding: AbstractControl): FormArray {
    return finding.get('evidence.interim') as FormArray;
  }

  getFinal(finding: AbstractControl): FormArray {
    return finding.get('evidence.final') as FormArray;
  }

  addInterim(finding: AbstractControl): void {
    this.getInterim(finding).push(this.fb.control(''));
  }

  removeInterim(finding: AbstractControl, index: number): void {
    const interim = this.getInterim(finding);
    if (interim.length <= 1) {
      interim.at(0)?.reset();
      return;
    }
    interim.removeAt(index);
  }

  addFinal(finding: AbstractControl): void {
    this.getFinal(finding).push(this.fb.control(''));
  }

  removeFinal(finding: AbstractControl, index: number): void {
    const final = this.getFinal(finding);
    if (final.length <= 1) {
      final.at(0)?.reset();
      return;
    }
    final.removeAt(index);
  }

  createAuditor(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      designation: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      certifications: ['', Validators.required],
      cert_in_listed: [''],
    });
  }

  addAuditor(): void {
    this.auditors.push(this.createAuditor());
  }

  removeAuditor(index: number): void {
    if (this.auditors.length <= 1) {
      this.auditors.at(0)?.reset();
      return;
    }
    this.auditors.removeAt(index);
  }

  createTool(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      version: ['', Validators.required],
      license_type: ['', Validators.required],
    });
  }

  addTool(): void {
    this.tools.push(this.createTool());
  }

  removeTool(index: number): void {
    if (this.tools.length <= 1) {
      this.tools.at(0)?.reset();
      return;
    }
    this.tools.removeAt(index);
  }

  createDistribution(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      organization: ['', Validators.required],
      designation: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  addDistribution(): void {
    this.distribution.push(this.createDistribution());
  }

  removeDistribution(index: number): void {
    if (this.distribution.length <= 1) {
      this.distribution.at(0)?.reset();
      return;
    }
    this.distribution.removeAt(index);
  }

  createAsset(): FormGroup {
    return this.fb.group({
      asset_description: ['', Validators.required],
      criticality: ['', Validators.required],
      internal_ip: ['', [Validators.required, Validators.pattern(IP_PATTERN)]],
      url: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
      public_ip: ['', [Validators.required, Validators.pattern(IP_PATTERN)]],
      location: ['', Validators.required],
      hash_value: ['', Validators.required],
      version: ['', Validators.required],
      other_details: [''],
    });
  }

  addAsset(): void {
    this.assets.push(this.createAsset());
  }

  removeAsset(index: number): void {
    if (this.assets.length <= 1) {
      this.assets.at(0)?.reset();
      return;
    }
    this.assets.removeAt(index);
  }

  createControl(): FormGroup {
    return this.fb.group({
      control_id: ['', Validators.required],
      control_name: ['', Validators.required],
      description: ['', Validators.required],
      status: ['Not Applicable', Validators.required],
      remarks: [''],
    });
  }

  addControl(): void {
    this.controls.push(this.createControl());
  }

  removeControl(index: number): void {
    if (this.controls.length <= 1) {
      this.controls.at(0)?.reset();
      return;
    }
    this.controls.removeAt(index);
  }

  updateSummary(): void {
    const findings = this.findings.getRawValue();
    const total = findings.length;

    const complied = findings.filter(
      (item: any) => this.normalizeStatus(item.status) === 'complied',
    ).length;

    const notComplied = findings.filter(
      (item: any) => this.normalizeStatus(item.status) === 'not complied',
    ).length;

    const exceptions = findings.filter(
      (item: any) => this.normalizeStatus(item.status) === 'exception',
    ).length;

    const notApplicable = findings.filter(
      (item: any) => this.normalizeStatus(item.status) === 'not applicable',
    ).length;

    this.documentForm.get('summary')?.patchValue(
      {
        total_observations: total,
        complied,
        not_complied: notComplied,
        exceptions,
        not_applicable: notApplicable,
      },
      { emitEvent: false },
    );
  }

  private normalizeStatus(value: any): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
  }

  getPayload(): any {
    const formValue = this.documentForm.getRawValue();

    return {
      project_name: formValue.project_name,
      client_name: formValue.client_name,
      audit_type: formValue.audit_type,
      metadata: formValue.metadata,
      findings: formValue.findings,
      auditors: formValue.auditors,
      tools: formValue.tools,
      distribution: formValue.distribution,
      assets: formValue.assets,
      controls: formValue.controls,
      summary: formValue.summary,
    };
  }

  generateDocument(): void {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      this.errorMessage.set('Please fix the highlighted fields before generating the document.');
      return;
    };
    this.updateSummary();
    const payload = this.getPayload();
    this.loading.set(true);
    this.errorMessage.set('');
    this.reportUrl.set('');
    this.certificateUrl.set('');

    this.documentService.generateDocument(payload).subscribe({
      next: (res: any) => {
        console.log(res);
        this.loading.set(false);
        if (res?.code == 200) {
          this.notificationService.success(res?.message || 'Upload successful');
          this.resetForm();
          setTimeout(() => {
            this.router.navigateByUrl('user/audit/repository')
          }, 2000)
        } else {
          this.notificationService.error(res?.message || 'Document generation failed.');
        }
      },
      error: (error: any) => {
        this.loading.set(false);
        this.notificationService.error(error?.error?.message || 'Document generation failed.');
      },
    });
  }

  resetForm(): void {
    this.documentForm.reset({
      project_name: '',
      client_name: '',
      audit_type: '',
      metadata: {
        document_id: '',
        document_version: '',
        prepared_by: '',
        reviewed_by: '',
        approved_by: '',
        released_by: '',
        release_date: '',
        report_release_date: '',
        url: '',
        public_ip: '',
        internal_ip: '',
        location: '',
        asset_criticality: '',
        asset_hash: '',
        execution_period: '',
        methodology: '',
      },
      summary: {
        total_observations: 0,
        complied: 0,
        not_complied: 0,
        exceptions: 0,
        not_applicable: 0,
      },
    });

    this.clearArray(this.findings);
    this.clearArray(this.auditors);
    this.clearArray(this.tools);
    this.clearArray(this.distribution);
    this.clearArray(this.assets);
    this.clearArray(this.controls);

    this.addFinding();
    this.addAuditor();
    this.addTool();
    this.addDistribution();
    this.addAsset();
    this.addControl();

    this.loading.set(false);
    this.errorMessage.set('');
    this.projectId.set('');
    this.reportUrl.set('');
    this.certificateUrl.set('');

    this.updateSummary();
  }

  private clearArray(array: FormArray): void {
    array.clear();
  }

}