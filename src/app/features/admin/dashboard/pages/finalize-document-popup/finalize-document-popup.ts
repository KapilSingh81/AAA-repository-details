import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { DocumentService } from '../../services/document-service';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';

interface ApiField {
  key: string;
  label: string;
  value: string;
  source?: string;
  required?: boolean;
  editable?: boolean;
  hint?: string;
}


interface FormCell {
  label: string;
  fullLabel: string;
  type: 'text' | 'date' | 'textarea';
  placeholder: string;
  required: boolean;
  wide: boolean;
  control: FormControl<string> | null;
  readonlyValue: string;
  min: () => string | null;
  isInvalid: () => boolean;
}

interface FormRow {
  key: string | null;
  cells: FormCell[];
  getValue: () => string;
}

@Component({
  selector: 'app-finalize-document-popup',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './finalize-document-popup.html',
  styleUrl: './finalize-document-popup.scss',
})
export class FinalizeDocumentPopup implements OnInit {
  private documentService = inject(DocumentService);
  private notification = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  bsModalRef = inject(BsModalRef);

  @Output() mapdata = new EventEmitter<any>();
  editData: any;
  usingFallback = false;
  mode: 'finalize' | 'regenerate' = 'finalize';
  isLoading = true;
  isSubmitting = false;
  loadError = '';
  notFoundRows: FormRow[] = [];
  foundRows: FormRow[] = [];

  confirmed = new FormControl<boolean>(false, { nonNullable: true });

  get isRegenerate(): boolean {
    return this.mode === 'regenerate';
  }

  ngOnInit(): void {
    this.loadReview();
  }

  private callApi(payload: any) {
    return this.isRegenerate
      ? this.documentService.regenerateCertificate(payload, this.editData?.id)
      : this.documentService.finlizeDocument(payload, this.editData?.id);
  }

  private loadReview(): void {
    this.isLoading = true;
    this.loadError = '';

    this.documentService.finlizeDocument({ confirmed: false, fields: {} }, this.editData?.id).subscribe({
      next: (res: any) => {
        const body = res?.body ?? res;
        if (!this.applyReview(body) && !this.tryRegenerateFallback()) {
          this.loadError = body?.message || 'Unable to load finalize details.';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },

      error: (err: any) => {
        const body = err?.error ?? err?.body ?? err;
        if (!this.applyReview(body) && !this.tryRegenerateFallback()) {
          this.loadError =
            body?.message || body?.detail?.message || body?.detail || 'Unable to load finalize details.';
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }


  private readonly regenerateFallbackFields: {
    key: string;
    label: string;
    section: 'missing' | 'found';
  }[] = [
      { key: 'metadata.execution_period', label: 'Testing period (start to end)', section: 'missing' },
      { key: 'metadata.url', label: 'Testing / staging URL', section: 'missing' },
      { key: 'certificate.site_url', label: 'Live site / web service URL', section: 'missing' },
      { key: 'certificate.environment_details', label: 'Environment details', section: 'missing' },
      { key: 'metadata.asset_hash', label: 'Hash value of the audited build', section: 'missing' },
    ];

  private makeFallbackRow(f: { key: string; label: string }): FormRow {
    return this.makeRow(f.key, f.label, '', {
      key: f.key,
      label: f.label,
      value: '',
      required: false,
      editable: true,
    });
  }

  private tryRegenerateFallback(): boolean {
    if (!this.isRegenerate) return false;

    this.usingFallback = true;
    this.loadError = '';
    this.notFoundRows = this.regenerateFallbackFields
      .filter((f) => f.section === 'missing')
      .map((f) => this.makeFallbackRow(f));
    this.foundRows = this.regenerateFallbackFields
      .filter((f) => f.section === 'found')
      .map((f) => this.makeFallbackRow(f));
    return true;
  }

  private applyReview(body: any): boolean {
    const review =
      body?.certificate_review ?? body?.detail?.certificate_review ?? body?.detail ?? body;

    const notFound: string[] = review?.not_found_in_report || [];
    const found: string[] = review?.found_in_report || [];
    const apiFields: ApiField[] = review?.fields || [];

    if (!notFound.length && !found.length) {
      return false;
    }

    this.notFoundRows = notFound.map((label) => {
      const field = this.findField(apiFields, label);
      const key = field?.key ?? this.keyFromTemplate(review?.fill_template, label);
      return this.makeRow(key, field?.label ?? label, '', field);
    });

    this.foundRows = found.map((text) => {
      const { label, value } = this.splitFound(text, apiFields);
      const field = this.findField(apiFields, label);
      return this.makeRow(field?.key ?? null, field?.label ?? label, field?.value || value, field);
    });

    return true;
  }


  private splitFound(text: string, fields: ApiField[]): { label: string; value: string } {
    const hit = fields.find((f) => text.startsWith(`${f.label}:`));
    if (hit) {
      return { label: hit.label, value: text.slice(hit.label.length + 1).trim() };
    }
    const idx = text.indexOf(': ');
    return idx > -1
      ? { label: text.slice(0, idx).trim(), value: text.slice(idx + 2).trim() }
      : { label: text.trim(), value: '' };
  }

  private findField(fields: ApiField[], label: string): ApiField | undefined {
    const norm = (s: string) => (s || '').trim().toLowerCase();
    return fields.find((f) => norm(f.label) === norm(label));
  }

  private keyFromTemplate(template: any, label: string): string | null {
    const entries = Object.entries(template?.fields || {});
    const hit = entries.find(([, v]) => String(v).includes(`<${label}>`));
    return hit ? hit[0] : null;
  }


  private cleanLabel(label: string): string {
    return label
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\s*-\s*optional\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private newCtrl(value: string, required: boolean): FormControl<string> {
    return new FormControl<string>(value, {
      nonNullable: true,
      validators: required ? [Validators.required, Validators.pattern(/[\s\S]*\S[\s\S]*/)] : [],
    });
  }

  private cleanValue(v: string): string {
    const t = (v || '').trim();
    return /^not found$/i.test(t) ? '' : t;
  }


  private toIso(text: string): string {
    const t = (text || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }


  private formatDate(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    });
  }

  private makeRow(key: string | null, label: string, rawValue: string, field?: ApiField): FormRow {
    const value = this.cleanValue(rawValue);
    const base = this.cleanLabel(label);
    const probe = `${key || ''} ${label}`.toLowerCase();

    const isRange = /period|start to end/.test(probe);
    const isDate = !isRange && /date/.test(probe);
    const isUrl = /url/.test(probe);
    const isMultiline = /recommendation/.test(probe);


    const editable = !!key && field?.editable !== false;

    const required = field ? field.required !== false : true;


    if (!editable) {
      const long = value.length > 45;
      return {
        key: null,
        getValue: () => '',
        cells: [
          {
            label: base,
            fullLabel: label,
            type: long ? 'textarea' : 'text',
            placeholder: '',
            required: false,
            wide: long,
            control: null,
            readonlyValue: value,
            min: () => null,
            isInvalid: () => false,
          },
        ],
      };
    }


    if (isRange) {
      const [fromTxt, toTxt] = value.split(/\s+to\s+/i);
      const from = this.newCtrl(this.toIso(fromTxt || ''), required);
      const to = this.newCtrl(this.toIso(toTxt || ''), required);
      // invalid when "to" is before "from", or when only one of the two dates is filled
      const rangeBad = () =>
        (!!from.value && !!to.value && to.value < from.value) || !!from.value !== !!to.value;
      return {
        key,
        getValue: () =>
          from.value && to.value ? `${this.formatDate(from.value)} to ${this.formatDate(to.value)}` : '',
        cells: [
          {
            label: `${base} (From)`,
            fullLabel: label,
            type: 'date',
            placeholder: '',
            required,
            wide: false,
            control: from,
            readonlyValue: '',
            min: () => null,
            isInvalid: () => from.touched && from.invalid,
          },
          {
            label: `${base} (To)`,
            fullLabel: label,
            type: 'date',
            placeholder: '',
            required,
            wide: false,
            control: to,
            readonlyValue: '',
            min: () => from.value || null,
            isInvalid: () => (to.touched && to.invalid) || rangeBad(),
          },
        ],
      };
    }


    if (isDate) {
      const ctrl = this.newCtrl(this.toIso(value), required);
      return {
        key,
        getValue: () => this.formatDate(ctrl.value),
        cells: [
          {
            label: base,
            fullLabel: label,
            type: 'date',
            placeholder: '',
            required,
            wide: false,
            control: ctrl,
            readonlyValue: '',
            min: () => null,
            isInvalid: () => ctrl.touched && ctrl.invalid,
          },
        ],
      };
    }


    const ctrl = this.newCtrl(value, required);
    return {
      key,
      getValue: () => (ctrl.value || '').trim(),
      cells: [
        {
          label: base,
          fullLabel: label,
          type: isMultiline ? 'textarea' : 'text',
          placeholder: isUrl ? 'https://example.com' : isMultiline ? 'One per line' : `Enter ${base.toLowerCase()}`,
          required,
          wide: isMultiline,
          control: ctrl,
          readonlyValue: '',
          min: () => null,
          isInvalid: () => ctrl.touched && ctrl.invalid,
        },
      ],
    };
  }


  private get editableRows(): FormRow[] {
    return [...this.notFoundRows, ...this.foundRows].filter((r) => !!r.key);
  }

  private get editableCells(): FormCell[] {
    return this.editableRows.flatMap((r) => r.cells).filter((c) => !!c.control);
  }

  get isFormValid(): boolean {
    return this.editableCells.every((c) => c.control!.valid && !c.isInvalid());
  }


  get canSubmit(): boolean {
    return this.confirmed.value === true && this.isFormValid && !this.isSubmitting;
  }


  onSubmit(): void {
    if (this.isSubmitting) return;

    // The button stays clickable so the user always gets feedback instead of a dead button.
    if (!this.confirmed.value) {
      this.notification.error('Please tick the confirmation checkbox to continue.');
      return;
    }

    this.editableCells.forEach((c) => c.control!.markAsTouched());
    if (!this.isFormValid) {
      this.notification.error('Please fill in all required fields correctly.');
      this.cdr.detectChanges();
      return;
    }

    const fields: Record<string, string> = {};
    this.editableRows.forEach((r) => {
      const v = r.getValue();
      // in fallback mode only the filled fields are sent
      if (this.usingFallback && !v) return;
      fields[r.key as string] = v;
    });

    const successMsg = this.isRegenerate
      ? 'Certificate regenerated successfully.'
      : 'Document finalized successfully.';
    const failMsg = this.isRegenerate
      ? 'Failed to regenerate certificate.'
      : 'Failed to finalize document.';

    this.isSubmitting = true;
    this.callApi({ confirmed: true, fields }).subscribe({
      next: (res: any) => {
        const body = res?.body ?? res;
        this.isSubmitting = false;
        const status = body?.certificate_review?.status;
        if (body?.code === 200 && status !== 'needs_input') {
          this.notification.success(body?.message || successMsg);
          this.mapdata.emit(true);
          this.bsModalRef.hide();
        } else {
          this.notification.error(body?.message || failMsg);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const body = err?.error;
        this.notification.error(
          body?.message || body?.detail?.message || body?.detail || failMsg,
        );
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.bsModalRef.hide();
  }
}