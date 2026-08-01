import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { HttpService } from '../../../../shared/services/http.services.ts/http.services';
import { API_CONSTANT } from '../../../../shared/CONSTANT/API_CONSTANT';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class MainDashobardService {

  private apiService = inject(HttpService)

  getDashboard(): Observable<any> {
    return this.apiService
      .get(API_CONSTANT.dashboard)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  };
}
