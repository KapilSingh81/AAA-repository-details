import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { HttpService } from '../../../shared/services/http.services.ts/http.services';
import { API_CONSTANT } from '../../../shared/CONSTANT/API_CONSTANT';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {

  private apiService = inject(HttpService)

  dashboardList(data: any): Observable<any> {
    let params: any = {};
    if (data?.uuid) {
      params.uuid = data.uuid;
    };
    if (data?.name) {
      params.name = data.name;
    };
    if (data?.audit_type) {
      params.audit_type = data.audit_type;
    };
    return this.apiService
      .get(API_CONSTANT.dashboardList, { params })
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  };

  addUploadDoumnet(payload: any): Observable<any> {
    const url = API_CONSTANT.addUploadDoumnet;
    return this.apiService.post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)))
  };

  documentDetailsdata(id: any): Observable<any> {
    let url = API_CONSTANT.documentDetails?.replace('{projectId}', id)
    return this.apiService
      .get(url)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  };
}
