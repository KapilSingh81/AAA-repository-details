import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { HttpService } from '../http.services.ts/http.services';
import { API_CONSTANT } from '../../CONSTANT/API_CONSTANT';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  private apiService = inject(HttpService);

  documentTypeList(): Observable<any> {
    return this.apiService
      .get(API_CONSTANT.documentTypeList)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  dateFormat(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
  }

  getMyNotifications(unreadOnly?: boolean): Observable<any> {
    const query = unreadOnly === undefined ? '' : `?unread_only=${unreadOnly}`;
    const url = `${API_CONSTANT.myNotifications}${query}`;
    return this.apiService.get(url);
  }

  markAllNotificationsRead(): Observable<any> {
    return this.apiService.post(API_CONSTANT.markAllNotificationsRead, {});
  }
}