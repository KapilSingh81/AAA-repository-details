import { Component, OnInit, ElementRef, ViewChild, signal, computed, effect, inject, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MainDashobardService } from '../../services/main-dashobard-service';
import { CommonService } from '../../../../../shared/services/common-services/common-service';
import { Router } from '@angular/router';

Chart.register(...registerables);

const TYPE_COLORS: Record<string, string> = {
  web: '#6366F1',
  vapt: '#10B981',
  comprehensive: '#F59E0B',
  mobile: '#38BDF8',
  source_code: '#A855F7',
  web_api: '#F43F5E',
};

@Component({
  selector: 'app-manage-main-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-main-dashboard.html',
  styleUrls: ['./manage-main-dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageMainDashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('projectsSpark') projectsSparkRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('reportsSpark') reportsSparkRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('certsSpark') certsSparkRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('rateSpark') rateSparkRef!: ElementRef<HTMLCanvasElement>;

  loading = signal<boolean>(true);
  error = signal<boolean>(false);
  data = signal<any | null>(null);
  hasAnyData = signal<boolean>(false);
  recentUploads = signal<any[]>([]);

  statCards = signal<any[]>([
    { label: 'Total Projects', value: 0, icon: 'folder', bg: 'bg-indigo-50', text: 'text-indigo-600' },
    { label: 'Total Reports', value: 0, icon: 'file-text', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Total Certificates', value: 0, icon: 'award', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: 'Last Upload', value: '—', icon: 'clock', bg: 'bg-rose-50', text: 'text-rose-600' },
  ]);

  readonly auditTypeLabels: Record<string, string> = {
    web: 'Web',
    vapt: 'VAPT',
    comprehensive: 'Comprehensive',
    mobile: 'Mobile',
    source_code: 'Source Code',
    web_api: 'Web API'
  };

  fromDate = signal<string>('');
  toDate = signal<string>('');
  showDatePicker = signal<boolean>(false);
  displayRange = computed(() => {
    if (!this.fromDate() || !this.toDate()) return 'Select date range';
    return `${this.commonService.dateFormat(this.fromDate())} - ${this.commonService.dateFormat(this.toDate())}`;
  });

  totalAudits = computed(() => {
    const counts = this.data()?.audit_type_counts;
    if (!counts) return 0;
    return Object.values(counts).reduce((a: number, b: any) => a + (b as number), 0);
  });

  completionRate = computed(() => {
    const d = this.data();
    if (!d || !d.total_projects) return 0;
    return Math.round((d.total_reports / d.total_projects) * 100);
  });

  certificateRate = computed(() => {
    const d = this.data();
    if (!d || !d.total_reports) return 0;
    return Math.round((d.total_certificates / d.total_reports) * 100);
  });

  overallScore = computed(() => {
    const c = this.completionRate();
    const cert = this.certificateRate();
    if (!this.hasAnyData()) return 0;
    return Math.round((c + cert) / 2);
  });

  typeBreakdown = computed(() => {
    const counts = this.data()?.audit_type_counts;
    if (!counts) return [];
    const total = this.totalAudits() || 1;
    return Object.entries(counts).map(([key, count]) => ({
      key,
      label: this.auditTypeLabels[key] || key,
      count: count as number,
      pct: Math.round(((count as number) / total) * 100),
      color: TYPE_COLORS[key] || '#94A3B8',
    })).sort((a, b) => b.count - a.count);
  });

  private trendChart?: Chart;
  private typeChart?: Chart;
  private sparkCharts: Chart[] = [];
  private viewInitialized = false;
  private activeRequestId = 0;

  private dashboardService = inject(MainDashobardService);
  private commonService = inject(CommonService);
  private router = inject(Router)


  ngOnInit(): void {
    this.setDefaultDateRange();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.data()) {
      setTimeout(() => this.renderCharts(), 0);
    }
  }

  ngOnDestroy(): void {
    this.trendChart?.destroy();
    this.typeChart?.destroy();
    this.sparkCharts.forEach(c => c.destroy());
  }

  private loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(false);

    const requestId = ++this.activeRequestId;

    const payload: any = {};
    if (this.fromDate()) payload.from_date = this.commonService.dateFormat(this.fromDate());
    if (this.toDate()) payload.to_date = this.commonService.dateFormat(this.toDate());

    this.dashboardService.getDashboard(payload).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (requestId !== this.activeRequestId) return;
        this.data.set(res?.body);
        this.recentUploads.set(res.body?.latest_projects);
        const total = (res.body?.total_projects || 0) + (res.body?.total_reports || 0) + (res.body?.total_certificates || 0);
        this.hasAnyData.set(total > 0);
        this.buildStatCards(res?.body);
        if (this.viewInitialized) {
          setTimeout(() => this.renderCharts(), 0);
        }
      },
      error: (err: any) => {
        this.loading.set(false);
        if (requestId !== this.activeRequestId) return;
        console.error('Error loading dashboard data:', err);
        this.error.set(true);
      }
    });
  }

  private buildStatCards(res: any): void {
    this.statCards.set([
      { label: 'Total Projects', value: res.total_projects, icon: 'folder', bg: 'bg-indigo-50', text: 'text-indigo-600' },
      { label: 'Total Reports', value: res.total_reports, icon: 'file-text', bg: 'bg-emerald-50', text: 'text-emerald-600' },
      { label: 'Total Certificates', value: res.total_certificates, icon: 'award', bg: 'bg-amber-50', text: 'text-amber-600' },
      { label: 'Last Upload', value: res.last_upload ? this.formatDate(res.last_upload) : 'No uploads yet', icon: 'clock', bg: 'bg-rose-50', text: 'text-rose-600' },
    ]);
  }

  private renderCharts(): void {
    const data = this.data();
    if (!data) return;

    this.renderTypeChart(data.audit_type_counts);
    this.renderTrendChart(data.upload_date || []);
    this.renderSparklines(data);
  }

  private renderTypeChart(counts: any): void {
    if (!this.typeChartRef?.nativeElement || !counts) return;
    const labels = Object.keys(counts).map(k => this.auditTypeLabels[k] || k);
    const values = Object.values(counts) as number[];
    const colors = Object.keys(counts).map(k => TYPE_COLORS[k] || '#94A3B8');

    this.typeChart?.destroy();
    this.typeChart = new Chart(this.typeChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: this.hasAnyData() ? values : [1],
          backgroundColor: this.hasAnyData() ? colors : ['#E2E8F0'],
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        animation: { animateRotate: true, animateScale: true, duration: 1200, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: { enabled: this.hasAnyData() } }
      }
    });
  }

  private renderTrendChart(uploadDates: { date: string; count: number }[]): void {
    if (!this.trendChartRef?.nativeElement) return;
    const parsed = uploadDates.map(item => {
      const [d, m, y] = item.date.split('-').map(Number);
      return {
        dateObj: new Date(y, m - 1, d),
        label: item.date,
        count: item.count
      };
    }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    const labels = parsed.map(p =>
      p.dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    );
    const values = parsed.map(p => p.count);

    this.trendChart?.destroy();
    this.trendChart = new Chart(this.trendChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['—'],
        datasets: [{
          label: 'Files Uploaded',
          data: values.length ? values : [0],
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#6366F1',
          pointRadius: labels.length ? 4 : 0,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: Math.ceil(Math.max(...values, 1) / 6) } } }
      }
    });
  }

  private renderSparklines(data: any): void {
    this.sparkCharts.forEach(c => c.destroy());
    this.sparkCharts = [];

    const makeSpark = (ref: ElementRef<HTMLCanvasElement> | undefined, value: number, color: string, type: 'line' | 'bar' = 'line') => {
      if (!ref?.nativeElement) return;
      const points = value > 0 ? [value * 0.3, value * 0.5, value * 0.4, value * 0.7, value * 0.6, value * 0.9, value] : [0, 0, 0, 0, 0, 0, 0];
      const chart = new Chart(ref.nativeElement, {
        type,
        data: {
          labels: points.map((_, i) => i.toString()),
          datasets: [{
            data: points,
            borderColor: color,
            backgroundColor: type === 'line' ? `${color}22` : color,
            fill: type === 'line',
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 2,
            borderRadius: type === 'bar' ? 3 : 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 1000, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { point: { radius: 0 } }
        }
      });
      this.sparkCharts.push(chart);
    };

    makeSpark(this.projectsSparkRef, data.total_projects, '#6366F1', 'line');
    makeSpark(this.reportsSparkRef, data.total_reports, '#10B981', 'bar');
    makeSpark(this.certsSparkRef, data.total_certificates, '#F59E0B', 'line');
    makeSpark(this.rateSparkRef, this.completionRate(), '#38BDF8', 'line');
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  refreshData(): void {
    this.loadDashboardData();
  };

  private setDefaultDateRange(): void {
    const today = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(today.getMonth() - 1);

    this.fromDate.set(this.toApiFormat(oneMonthAgo));
    this.toDate.set(this.toApiFormat(today));
  }

  private toApiFormat(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  toggleDatePicker(): void {
    this.showDatePicker.update(v => !v);
  }

  closeDatePicker(): void {
    this.showDatePicker.set(false);
  }

  onFromDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.fromDate.set(value);
  }

  onToDateChange(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.toDate.set(value);
  }

  applyDateFilter() {
    if (this.fromDate() && this.toDate() && this.fromDate() > this.toDate()) {
      return;
    }
    this.showDatePicker.set(false);
    this.loadDashboardData();
  };

  insertLineBreaks(text: string | null, interval: number = 200): string {
    if (!text) return '';
    return text.toString().replace(new RegExp(`(.{${interval}})`, 'g'), '$1<br>');
  };

  onRedirectRepo(url:string) {
    this.router.navigateByUrl(url)
  };

  onShowProjectDetails(doc: any) {
    this.router.navigate(['/user/project-details', doc.id]);
  }
}