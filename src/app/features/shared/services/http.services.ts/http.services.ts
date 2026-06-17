import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { enviornment } from '../../../../../enviornment/enviornment';

@Injectable({
  providedIn: 'root',
})
export class HttpService {
  private http = inject(HttpClient);
  baseUrl = signal<string>(enviornment.baseUrl);
  
    responseType = {
    observe: 'response' as const
  };

  private buildUrl(url: string): string {
    return `${this.baseUrl()}${url}`;
  }

  get(urlData: any, options: any = {}): Observable<any> {
    let requestOptions = { ...this.responseType, ...options };
    return this.http
      .get(this.buildUrl(urlData), requestOptions)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  post(url: any, payload: any, options: any = {}): Observable<any> {
    let requestOptions = { ...options, ...this.responseType };
    return this.http.post(this.buildUrl(url), payload, requestOptions);
  }

  put(url: any, payload: any, options: any = {}) {
    let requestOptions = { ...options, ...this.responseType };
    return this.http
      .put(this.buildUrl(url), payload, requestOptions)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  patch(url: any, payload: any, options: any = {}) {
    let requestOptions = { ...options, ...this.responseType };
    return this.http
      .patch(this.buildUrl(url), payload, requestOptions)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  delete(url: any, options: any = {}): Observable<any> {
    let requestOptions = { ...options, ...this.responseType };
    return this.http
      .delete(this.buildUrl(url), requestOptions)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }
}