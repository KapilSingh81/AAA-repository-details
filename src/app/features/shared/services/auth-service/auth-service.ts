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
  private isLoggingOut = false;
  private isRefreshingToken = false;
  private redirectingToLogin = false;

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
    // Prevent multiple refresh attempts
    if (this.isRefreshingToken) {
      return;
    }
    
    try {
      const refreshToken: any = await this.storage.getItem('aaa-user');
      if (!refreshToken) {
        this.performClientCleanup();
        return;
      }
      
      this.isRefreshingToken = true;
      this.isRefreshing.set(true);
      
      let payload = {
        refresh_token: refreshToken?.refresh_token
      };
      
      this.refreshTokenRequest(payload).subscribe({
        next: (res: any) => {
          this.isRefreshingToken = false;
          this.isRefreshing.set(false);
          
          if (res?.body?.code === 200) {
            const tokens = res?.body;
            this.cookieService.set('aaa-token', tokens.access_token, {
              path: '/',
              secure: false,
              sameSite: 'Lax',
              expires: new Date(tokens.tokenExpiredOn),
            });
            if (tokens.refresh_token) {
              this.storage.setItem('aaa-user', tokens);
            }
            this.startTimer(tokens.expires_in);
          } else {
            // Refresh token failed - clear session
            this.performClientCleanup();
          }
        },
        error: (err) => {
          this.isRefreshingToken = false;
          this.isRefreshing.set(false);
          console.error('Refresh token error:', err);
          this.performClientCleanup();
        }
      });
    } catch (error) {
      this.isRefreshingToken = false;
      this.isRefreshing.set(false);
      console.error('Refresh token error:', error);
      this.performClientCleanup();
    }
  }

  // Check if token is valid (not expired)
  isTokenValid(): boolean {
    const token = this.cookieService.get('aaa-token');
    if (!token) return false;
    
    // Check if token is expired by decoding it
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expired = payload.exp * 1000 < Date.now();
      if (expired) {
        // Token expired, clear it
        this.clearInvalidToken();
        return false;
      }
      return true;
    } catch {
      // Invalid token format
      this.clearInvalidToken();
      return false;
    }
  }

  clearInvalidToken() {
    this.cookieService.delete('aaa-token', '/');
    this.storage.removeItem('aaa-user');
  }

  async logoutUser() {
    if (this.isLoggingOut) {
      return;
    }
    
    this.isLoggingOut = true;    
    const user: any = await this.storage.getItem('aaa-user');
    const payload = {
      refresh_token: user?.refresh_token || null
    };
    
    this.logout(payload).subscribe({
      next: (res: any) => {
        if (res?.body?.code === 200) {
          this.notificationService.success(res?.body?.message);
          this.performClientCleanup();
        } else {
          this.notificationService.error(res?.body?.message || 'Logout failed');
          this.performClientCleanup();
        }
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.performClientCleanup();
      }
    });
  }

  clearSessionSilently() {
    this.performClientCleanup();
  }

  private performClientCleanup() {
    clearTimeout(this.authRefreshTimeout);
    this.storage.clear();
    this.cookieService.delete('aaa-token', '/');
    this.isLoggingOut = false;
    this.isRefreshingToken = false;
    this.isRefreshing.set(false);
    this.redirectingToLogin = false;
    this.router.navigate(['/login']);
  }

  // Check if we should allow API calls
  canMakeApiCalls(): boolean {
    if (this.isRefreshingToken) return false;
    if (this.isLoggingOut) return false;
    if (this.redirectingToLogin) return false;
    return true;
  }
}