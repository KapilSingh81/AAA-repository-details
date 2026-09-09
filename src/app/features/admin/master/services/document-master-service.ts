import { inject, Injectable } from '@angular/core';
import { API_CONSTANT } from '../../../shared/CONSTANT/API_CONSTANT';
import { catchError, Observable, of } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpService } from '../../../shared/services/http.services.ts/http.services';

@Injectable({
  providedIn: 'root',
})
export class DocumentMasterService {

  private apiService = inject(HttpService);


  generateDocument(payload: any): Observable<any> {
    const url = API_CONSTANT.generateDocument;
    return this.apiService.post(url, payload);
  }

  
  getStatusOptions(): Observable<any> {
    const url = API_CONSTANT.statusOptions;
    return this.apiService.get(url).pipe(
      catchError((error: HttpErrorResponse) => of(error))
    );
  }
}
