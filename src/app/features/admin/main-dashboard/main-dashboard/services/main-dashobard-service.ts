import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { API_CONSTANT } from '../../../../shared/CONSTANT/API_CONSTANT';
import { HttpService } from '../../../../shared/services/http.services.ts/http.services';

export interface FileRepoDashboardResponse {
  total_files: number;
  total_storage_bytes: number;
  storage_quota_bytes: number;
  total_folders: number;
  total_shared: number;
  file_type_counts: Record<string, number>;
  file_type_size_bytes?: Record<string, number>;
  recent_files: FileRepoFile[];
  last_upload?: string;
  user?: { role?: string; name?: string };
}

export interface FileRepoFile {
  id: string | number;
  file_name: string;
  file_type: string;      // pdf | image | document | video | archive | other
  size_bytes: number;
  uploaded_at: string;
  uploaded_by?: string;
  status?: 'success' | 'pending' | 'failed';
  is_shared?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MainDashobardService {
 private apiService = inject(HttpService)

  getDashboard(): Observable<any> {
    return this.apiService
      .get(API_CONSTANT.dashboard)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  };
}
