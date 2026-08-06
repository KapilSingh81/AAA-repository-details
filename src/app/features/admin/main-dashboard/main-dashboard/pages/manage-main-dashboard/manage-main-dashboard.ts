import { Component, OnInit, ElementRef, ViewChild, signal, computed, inject, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { CommonModule } from '@angular/common';
import { MainDashobardService } from '../../services/main-dashobard-service';

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

  // ---- Computed derived data for the "image-style" widgets ----

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
    // simple composite score out of 100 based on available ratios; safe default 0
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

  statusBreakdown = computed(() => {
    const uploads = this.recentUploads();
    if (!uploads.length) return [];
    const groups: Record<string, number> = {};
    uploads.forEach(u => {
      const s = u.status || 'completed';
      groups[s] = (groups[s] || 0) + 1;
    });
    const total = uploads.length || 1;
    const colorMap: Record<string, string> = {
      success: '#6366F1', completed: '#6366F1', pending: '#38BDF8', failed: '#F43F5E'
    };
    return Object.entries(groups).map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100),
      color: colorMap[status] || '#94A3B8'
    }));
  });

  private trendChart?: Chart;
  private typeChart?: Chart;
  private sparkCharts: Chart[] = [];
  private dashboardService = inject(MainDashobardService);
  private viewInitialized = false;

  ngOnInit(): void {
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
    this.dashboardService.getDashboard().subscribe({
      next: (res: any) => {
        this.data.set(res?.body);
        this.recentUploads.set((res.body?.recent_uploads || []).slice(0, 5));

        const total = (res.body?.total_projects || 0) + (res.body?.total_reports || 0) + (res.body?.total_certificates || 0);
        this.hasAnyData.set(total > 0);

        this.buildStatCards(res?.body);
        this.loading.set(false);

        if (this.viewInitialized) {
          setTimeout(() => this.renderCharts(), 0);
        }
      },
      error: (err: any) => {
        console.error('Error loading dashboard data:', err);
        this.error.set(true);
        this.loading.set(false);
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
    this.renderTrendChart(data.recent_uploads || []);
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

  private renderTrendChart(uploads: any[]): void {
    if (!this.trendChartRef?.nativeElement) return;

    const grouped: Record<string, number> = {};
    uploads.forEach(u => {
      const day = new Date(u.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      grouped[day] = (grouped[day] || 0) + 1;
    });

    const labels = Object.keys(grouped);
    const values = Object.values(grouped);

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
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    });
  }

  private renderSparklines(data: any): void {
    this.sparkCharts.forEach(c => c.destroy());
    this.sparkCharts = [];

    const makeSpark = (ref: ElementRef<HTMLCanvasElement> | undefined, value: number, color: string, type: 'line' | 'bar' = 'line') => {
      if (!ref?.nativeElement) return;
      // synthetic smooth series ending at the real value (placeholder trend since per-day history isn't available yet)
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
  }
}