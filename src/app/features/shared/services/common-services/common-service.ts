import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { HttpService } from '../http.services.ts/http.services';
import { API_CONSTANT } from '../../CONSTANT/API_CONSTANT';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  private apiService = inject(HttpService)

  documentTypeList() : Observable<any> {
    return this.apiService
      .get(API_CONSTANT.documentTypeList)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  };
}
