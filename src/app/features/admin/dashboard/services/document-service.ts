import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { API_CONSTANT } from '../../../shared/CONSTANT/API_CONSTANT';
import { HttpService } from '../../../shared/services/http.services.ts/http.services';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiService = inject(HttpService);

  dashboardList(data: any): Observable<any> {
    const params: any = {
      page: data?.page,
      limit: data?.limit,
    };
    if (data?.uuid) {
      params.uuid = data.uuid;
    }
    if (data?.name) {
      params.name = data.name;
    }
    if (data?.audit_type) {
      params.audit_type = data.audit_type;
    }
    if (data?.status) {
      params.status = data.status;
    }
    return this.apiService
      .get(API_CONSTANT.dashboardList, { params })
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  addUploadDoumnet(payload: any): Observable<any> {
    const url = API_CONSTANT.addUploadDoumnet;
    return this.apiService.post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  reuploadDocument(payload: any, id: any): Observable<any> {
    const url = API_CONSTANT.reuploadDocument.replace('{project_id}', id);
    return this.apiService.put(url, payload);
  }

  documentDetailsdata(id: any): Observable<any> {
    const url = API_CONSTANT.documentDetails?.replace('{projectId}', id);
    return this.apiService.get(url).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  documentById(id: any): Observable<any> {
    const url = API_CONSTANT.documentById.replace('{id}', id);
    return this.apiService.get(url).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  getStatusOptions(): Observable<any> {
    const url = API_CONSTANT.statusOptions;
    return this.apiService.get(url).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  generateDocument(payload: any): Observable<any> {
    const url = API_CONSTANT.generateDocument;
    return this.apiService.post(url, payload);
  }

  updateDocument(payload: any, id: any): Observable<any> {
    const url = API_CONSTANT.updateDocument?.replace('{id}', id);
    return this.apiService.put(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  uploadEvidance(payload: any, id: any): Observable<any> {
    const url = API_CONSTANT.addEvidance?.replace('{project_id}', id);
    return this.apiService.post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  generateCertificate(payload: any): Observable<any> {
    const url = API_CONSTANT.generateCertificate;
    return this.apiService.post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  finlizeDocument(payload: any, projectId: any): Observable<any> {
    const url = API_CONSTANT.finalizeDocument.replace('{project_id}', projectId);
    return this.apiService.post(url, payload);
  }

  regenerateCertificate(payload: any, projectId: any): Observable<any> {
    const url = API_CONSTANT.regenerateCertificate.replace('{project_id}', projectId);
    return this.apiService.post(url, payload);
  }

  certificateTimeline(projectId: any): Observable<any> {
    const url = API_CONSTANT.certificateTimeline.replace('{project_id}', projectId);
    return this.apiService.get(url);
  }
}