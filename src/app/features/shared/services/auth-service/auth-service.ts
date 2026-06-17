import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from '../http.services.ts/http.services';
import { catchError, Observable, of, finalize } from 'rxjs';
import { API_CONSTANT } from '../../CONSTANT/API_CONSTANT';
import { HttpErrorResponse } from '@angular/common/http';
import { StorageService } from '../storage-service/storage.service';
import { CookieService } from 'ngx-cookie-service';
import { NotificationService } from '../notification-service/notificaiton';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private apiService = inject(HttpService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private cookieService = inject(CookieService);
  private notificationService = inject(NotificationService);

  private authRefreshTimeout: any;
  isRefreshing = signal(false);

  login(payload: any): Observable<any> {
    let url = API_CONSTANT.login;
    return this.apiService
      .post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  };

  logout(payload: any): Observable<any> {
    let url = API_CONSTANT.logout;
    return this.apiService
      .post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  };

  refreshTokenRequest(payload: any): Observable<any> {
    let url = API_CONSTANT.refreshToken;
    return this.apiService
      .post(url, payload).pipe(catchError((error: HttpErrorResponse) => of(error)));
  };

  startTimer(expiresIn: number) {
    const timeout = (expiresIn - 60) * 1000;
    clearTimeout(this.authRefreshTimeout);
    this.authRefreshTimeout = setTimeout(() => {
      this.refreshToken();
    }, timeout);
  }

  async refreshToken() {
    try {
      const refreshToken: any = await this.storage.getItem('aaa-user');
      if (!refreshToken) return;
      this.isRefreshing.set(true);
      let payload = {
        refresh_token: refreshToken?.refresh_token
      }
      this.refreshTokenRequest(payload).subscribe((res: any) => {
        const tokens = res?.body;
        document.cookie = `aaa-token=${tokens.access_token}`;
        if (tokens.refresh_token) {
          this.storage.setItem('aaa-user', tokens);
        }
        this.startTimer(tokens.expires_in);
      })
    } catch (error) {
      this.logoutUser();
    } finally {
      this.isRefreshing.set(false);
    }
  }

  async logoutUser() {
    const user: any = await this.storage.getItem('aaa-user');
    const payload = {
      refresh_token: user?.refresh_token || null
    };
    this.logout(payload)
      .subscribe({
        next: (res: any) => {
          if (res?.body?.code === 200) {
            this.notificationService.success(res?.body?.message);
            this.performClientCleanup();
          } else {
            this.notificationService.error(res?.body?.message || 'Logout failed');
          }
        },
        error: (err) => {
          this.notificationService.error(err?.error?.message || 'Logout error');
          this.performClientCleanup();
        }
      });
  }

  private performClientCleanup() {
    clearTimeout(this.authRefreshTimeout);
    this.storage.clear();
    this.cookieService.delete('aaa-token', '/');
    this.router.navigate(['/login']);
  }
}