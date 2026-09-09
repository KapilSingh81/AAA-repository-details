import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { DocumentMasterService } from '../../services/document-master-service';

@Component({
  selector: 'app-document-master',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './document-master.html',
})
export class DocumentMaster {
  private readonly fb = inject(FormBuilder);
  private readonly documentService = inject(DocumentMasterService);

  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  projectId = signal('');
  reportUrl = signal('');
  certificateUrl = signal('');
  assetCriticalityOptions = signal<string[]>([]);

  statusOptions = signal<string[]>(['Complied', 'Not Complied', 'Exception', 'Not Applicable']);

  observationTypeOptions = signal<string[]>(['New', 'Repeat']);

  documentForm = this.fb.group({
    project_name: ['', Validators.required],
    client_name: ['', Validators.required],
    audit_type: ['', Validators.required],

    metadata: this.fb.group({
      document_id: [''],
      document_version: [''],
      prepared_by: [''],
      reviewed_by: [''],
      approved_by: [''],
      released_by: [''],
      release_date: [''],
      report_release_date: [''],
      url: [''],
      public_ip: [''],
      internal_ip: [''],
      location: [''],
      asset_criticality: [''],
      asset_hash: [''],
      execution_period: [''],
      methodology: [''],
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

    activity_summary: [''],
  });

  constructor() {
    this.addFinding();
    this.addAuditor();
    this.addTool();
    this.addDistribution();
    this.addAsset();
    this.addControl();

    this.loadStatusOptions();

    this.findings.valueChanges.subscribe(() => this.updateSummary());
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
        if (Array.isArray(res?.statuses) && res.statuses.length) {
          this.statusOptions.set(res.statuses);
        }

        if (Array.isArray(res?.observation_types) && res.observation_types.length) {
          this.observationTypeOptions.set(res.observation_types);
        }

        if (Array.isArray(res?.asset_criticality) && res.asset_criticality.length) {
          this.assetCriticalityOptions.set(res.asset_criticality);
        }
      },

      error: () => {
        // API error handling
      },
    });
  }

  createFinding(): FormGroup {
    return this.fb.group({
      finding_id: [0],
      affected_asset: [''],
      observation_title: [''],
      detailed_observation: [''],
      cve_cwe: [''],
      severity: [''],
      recommendation: [''],
      reference: [''],
      observation_type: ['New'],
      evidence: this.fb.group({
        interim: this.fb.array([this.fb.control('')]),
        final: this.fb.array([this.fb.control('')]),
      }),
      status: [''],
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
      name: [''],
      designation: [''],
      email: [''],
      certifications: [''],
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
      name: [''],
      version: [''],
      license_type: [''],
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
      name: [''],
      organization: [''],
      designation: [''],
      email: [''],
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
      asset_description: [''],
      criticality: [''],
      internal_ip: [''],
      url: [''],
      public_ip: [''],
      location: [''],
      hash_value: [''],
      version: [''],
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
      control_id: [''],
      control_name: [''],
      description: [''],
      status: [''],
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
      activity_summary: formValue.activity_summary,
    };
  }

  generateDocument(): void {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    this.updateSummary();

    const payload = this.getPayload();

    this.loading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.reportUrl.set('');
    this.certificateUrl.set('');

    this.documentService.generateDocument(payload).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        this.successMessage.set(res?.message || 'Document generated successfully.');
        this.errorMessage.set('');

        this.projectId.set(res?.project_id || '');
        this.reportUrl.set(res?.report_download_url || '');
        this.certificateUrl.set(res?.certificate_download_url || '');
      },
      error: (error: any) => {
        this.loading.set(false);
        this.successMessage.set('');
        this.errorMessage.set(error?.error?.message || 'Document generation failed.');
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
      activity_summary: '',
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
    this.successMessage.set('');
    this.errorMessage.set('');
    this.projectId.set('');
    this.reportUrl.set('');
    this.certificateUrl.set('');

    this.updateSummary();
  }

  private clearArray(array: FormArray): void {
    array.clear();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
