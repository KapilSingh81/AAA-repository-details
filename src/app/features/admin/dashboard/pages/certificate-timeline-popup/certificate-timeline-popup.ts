// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-certificate-timeline-popup',
//   imports: [],
//   templateUrl: './certificate-timeline-popup.html',
//   styleUrl: './certificate-timeline-popup.scss',
// })
// export class CertificateTimelinePopup {}




import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { DocumentService } from '../../services/document-service';

interface StatCard {
  label: string;
  value: string;
  badge?: 'success' | 'warning' | 'neutral';
}

interface CountChip {
  label: string;
  value: number;
}

interface DetailChip {
  label: string;
  value: string;
}

interface TimelineEvent {
  step: number;
  title: string;
  icon: string;
  tone: string;
  at: string;
  by: string;
  email: string;
  since: string;
  chips: DetailChip[];
}

interface EventMeta {
  icon: string;
  tone: string;
}

// Heroicons (outline) path data
const ICON = {
  folder:
    'M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
  upload: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
  check: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  certificate:
    'M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12',
  refresh:
    'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  pencil:
    'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125',
  clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
};

const EVENT_META: Record<string, EventMeta> = {
  project_created: { icon: ICON.folder, tone: 'tone-blue' },
  report_uploaded: { icon: ICON.upload, tone: 'tone-indigo' },
  report_finalized: { icon: ICON.check, tone: 'tone-emerald' },
  report_edited: { icon: ICON.pencil, tone: 'tone-slate' },
  certificate_generated: { icon: ICON.certificate, tone: 'tone-purple' },
  certificate_regenerated: { icon: ICON.refresh, tone: 'tone-amber' },
  certificate_edited: { icon: ICON.pencil, tone: 'tone-slate' },
};

const DEFAULT_META: EventMeta = { icon: ICON.clock, tone: 'tone-slate' };

const DETAIL_LABELS: Record<string, string> = {
  filename: 'File',
  audit_type: 'Audit type',
  issued_date: 'Issued on',
  expiry_date: 'Expires on',
  certificate_no: 'Certificate No.',
};

@Component({
  selector: 'app-certificate-timeline-popup',
  imports: [CommonModule],
  templateUrl: './certificate-timeline-popup.html',
  styleUrl: './certificate-timeline-popup.scss',
})
export class CertificateTimelinePopup implements OnInit {
  private documentService = inject(DocumentService);
  private cdr = inject(ChangeDetectorRef);
  bsModalRef = inject(BsModalRef);

  // set through initialState by the dashboard (uses editData.id as project id)
  editData: any;

  isLoading = true;
  error = '';

  summary: any = null;
  stats: StatCard[] = [];
  counts: CountChip[] = [];
  events: TimelineEvent[] = [];
  timezone = 'IST';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = '';

    this.documentService.certificateTimeline(this.editData?.id).subscribe({
      next: (res: any) => {
        const body = res?.body ?? res;
        if (body?.summary || Array.isArray(body?.timeline)) {
          this.build(body);
        } else {
          this.error = this.errorMessage(body);
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.error = this.errorMessage(err?.error ?? err?.body ?? err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.bsModalRef.hide();
  }

  private errorMessage(body: any): string {
    const detail = body?.detail;
    const msg =
      body?.message || (typeof detail === 'string' ? detail : detail?.message) || '';
    return msg || 'Unable to load the timeline. Please try again.';
  }

  private build(body: any): void {
    const s = body.summary || {};
    this.summary = s;
    this.timezone = s.timezone || 'IST';

    this.stats = [
      { label: 'Certificate No.', value: s.certificate_no || '—' },
      {
        label: 'Certificate Status',
        value: this.titleCase(s.certificate_status) || '—',
        badge: this.statusTone(s.certificate_status),
      },
      { label: 'Time to First Certificate', value: s.time_to_first_certificate?.human || '—' },
      { label: 'Time to Finalize', value: s.time_to_finalize?.human || '—' },
    ];

    const c = s.counts || {};
    this.counts = [
      { label: 'Certificates created', value: c.certificates_created_total ?? 0 },
      { label: 'Regenerated', value: c.certificates_regenerated ?? 0 },
      { label: 'Certificate edits', value: c.certificate_edits ?? 0 },
      { label: 'Report edits', value: c.report_edits ?? 0 },
      { label: 'Total events', value: c.total_events ?? 0 },
    ];

    this.events = (body.timeline || []).map((ev: any, i: number): TimelineEvent => {
      const meta = EVENT_META[ev.event] || DEFAULT_META;
      return {
        step: ev.step ?? i + 1,
        title: ev.title || this.titleCase(ev.event),
        icon: meta.icon,
        tone: meta.tone,
        at: ev.at_ist || '',
        by: ev.done_by?.name || 'System',
        email: ev.done_by?.email || '',
        since: i > 0 ? ev.since_previous_step?.human || '' : '',
        chips: this.buildChips(ev),
      };
    });
  }

  private buildChips(ev: any): DetailChip[] {
    const chips: DetailChip[] = [];
    const details = ev?.details || {};

    Object.keys(details).forEach((key) => {
      const raw = details[key];
      if (raw === null || raw === undefined || raw === '' || typeof raw === 'object') return;

      const label = DETAIL_LABELS[key] || this.titleCase(key);
      let value = String(raw);
      if (/date/.test(key)) value = this.formatDate(value);
      if (key === 'audit_type') value = value.replace(/_/g, ' ').toUpperCase();
      chips.push({ label, value });
    });

    if (ev?.certificate_no && !details.certificate_no) {
      chips.push({ label: 'Certificate No.', value: ev.certificate_no });
    }
    return chips;
  }

  private formatDate(value: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) return value;
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private titleCase(text: string | null | undefined): string {
    if (!text) return '';
    const t = String(text).replace(/_/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  private statusTone(status: string | null | undefined): 'success' | 'warning' | 'neutral' {
    switch ((status || '').toLowerCase()) {
      case 'generated':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
