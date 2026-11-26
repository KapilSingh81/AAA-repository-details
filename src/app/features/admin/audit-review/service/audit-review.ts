import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { API_CONSTANT } from '../../../shared/CONSTANT/API_CONSTANT';
import { HttpService } from '../../../shared/services/http.services.ts/http.services';

export interface AdminReportParams {
  period: string;
  start_date?: string;
  end_date?: string;
}

export interface ApprovalPayload {
  decision: string;
  comment: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuditReviewService {
  private apiService = inject(HttpService);
  private http = inject(HttpClient);
  private cookieService = inject(CookieService);

  private baseUrl = 'https://dms.aaatechnologies.co.in/api/';

  getAdminReportStatus(params: AdminReportParams): Observable<any> {
    const query = new URLSearchParams({ period: params.period });
    if (params.start_date) {
      query.append('start_date', params.start_date);
    }
    if (params.end_date) {
      query.append('end_date', params.end_date);
    }
    const url = `${API_CONSTANT.adminReportStatus}?${query.toString()}`;
    return this.apiService.get(url);
  }

  getPendingApprovals(limit: number): Observable<any> {
    const url = `${API_CONSTANT.pendingApprovals}?limit=${limit}`;
    return this.apiService.get(url);
  }

  submitApproval(projectId: string, payload: ApprovalPayload): Observable<any> {
    const url = API_CONSTANT.reviewApproval.replace('{project_id}', projectId);
    return this.apiService.post(url, payload);
  }

  downloadReportPdf(reportId: string): Observable<Blob> {
    const url = API_CONSTANT.downloadReportPdf.replace('{report_id}', reportId);
    return this.downloadPdf(url);
  }

  downloadCertificatePdf(certId: string): Observable<Blob> {
    const url = API_CONSTANT.downloadCertificatePdf.replace('{cert_id}', certId);
    return this.downloadPdf(url);
  }

  private downloadPdf(path: string): Observable<Blob> {
    const token = this.cookieService.get('aaa-token');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get(`${this.baseUrl}${path}`, { headers, responseType: 'blob' });
  }
}