import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from '../http.services.ts/http.services';
import {
  BehaviorSubject,
  catchError,
  filter,
  from,
  map,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
} from 'rxjs';
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
  private redirectingToLogin = false;

  /** single-flight refresh ke liye */
  private refreshInProgress = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  // ---------------------------------------------------------------- API calls

  login(payload: any): Observable<any> {
    return this.apiService
      .post(API_CONSTANT.login, payload)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  logout(payload: any): Observable<any> {
    return this.apiService
      .post(API_CONSTANT.logout, payload)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  resetPwd(payload: any): Observable<any> {
    return this.apiService
      .post(API_CONSTANT.resetPwd, payload)
      .pipe(catchError((error: HttpErrorResponse) => of(error)));
  }

  // ------------------------------------------------------------ session setup


  setSession(body: any): void {
    const cookieExpiry = new Date(body?.tokenExpiredOn);

    this.cookieService.set('aaa-token', body.access_token, {
      path: '/',
      secure: false,
      sameSite: 'Lax',
      expires: cookieExpiry,
    });

    this.storage.setItem('aaa-user', body);
    this.startTimer(body.expires_in);
  }

  startTimer(expiresIn: number): void {
    clearTimeout(this.authRefreshTimeout);
    const timeout = Math.max((expiresIn - 60) * 1000, 0);
    this.authRefreshTimeout = setTimeout(() => {
      this.getFreshToken().subscribe({ error: () => {} });
    }, timeout);
  }

  async restoreSession(): Promise<void> {
    const user: any = await this.storage.getItem('aaa-user');
    if (!user?.refresh_token) return;

    const secondsLeft = this.getSecondsLeft();

    if (secondsLeft > 60) {
      this.startTimer(secondsLeft);
    } else {
      await new Promise<void>((resolve) => {
        this.getFreshToken().subscribe({
          next: () => resolve(),
          error: () => resolve(),
        });
      });
    }
  }

  // ------------------------------------------------------------------ refresh

  private refreshAccessToken(): Observable<string> {
    return from(this.storage.getItem('aaa-user')).pipe(
      switchMap((user: any) => {
        if (!user?.refresh_token) {
          return throwError(() => new Error('No refresh token'));
        }
        return this.apiService.post(API_CONSTANT.refreshToken, {
          refresh_token: user.refresh_token,
        });
      }),
      map((res: any) => {
        const body = res?.body;
        if (body?.code !== 200 || !body?.access_token) {
          throw new Error(body?.message || 'Refresh failed');
        }
        this.setSession(body);
        return body.access_token as string;
      }),
    );
  }

  getFreshToken(): Observable<string> {
    if (this.refreshInProgress) {
      return this.refreshSubject.pipe(
        filter((t): t is string => !!t),
        take(1),
      );
    }

    this.refreshInProgress = true;
    this.isRefreshing.set(true);
    this.refreshSubject.next(null);

    return this.refreshAccessToken().pipe(
      tap((token) => {
        this.refreshInProgress = false;
        this.isRefreshing.set(false);
        this.refreshSubject.next(token);
      }),
      catchError((err) => {
        this.refreshInProgress = false;
        this.isRefreshing.set(false);
        this.performClientCleanup();
        return throwError(() => err);
      }),
    );
  }

  refreshToken(): void {
    this.getFreshToken().subscribe({ error: () => {} });
  }

  // ------------------------------------------------------------ token helpers

  private getSecondsLeft(): number {
    const token = this.cookieService.get('aaa-token');
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp - Math.floor(Date.now() / 1000);
    } catch {
      return 0;
    }
  }

  isTokenValid(): boolean {
    return this.getSecondsLeft() > 0;
  }

  async hasSession(): Promise<boolean> {
    const user: any = await this.storage.getItem('aaa-user');
    return !!user?.refresh_token;
  }

  clearInvalidToken(): void {
    this.cookieService.delete('aaa-token', '/');
    this.storage.removeItem('aaa-user');
  }

  // ------------------------------------------------------------------- logout

  async logoutUser(): Promise<void> {
    if (this.isLoggingOut) return;
    this.isLoggingOut = true;

    const user: any = await this.storage.getItem('aaa-user');
    const payload = { refresh_token: user?.refresh_token || null };

    this.logout(payload).subscribe({
      next: (res: any) => {
        if (res?.body?.code === 200) {
          this.notificationService.success(res?.body?.message);
        } else {
          this.notificationService.error(res?.body?.message || 'Logout failed');
        }
        this.performClientCleanup();
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.performClientCleanup();
      },
    });
  }

  clearSessionSilently(): void {
    clearTimeout(this.authRefreshTimeout);
    this.storage.clear();
    this.cookieService.delete('aaa-token', '/');
    this.isLoggingOut = false;
    this.refreshInProgress = false;
    this.isRefreshing.set(false);
  }

  private performClientCleanup(): void {
    if (this.redirectingToLogin) return;
    this.redirectingToLogin = true;

    this.clearSessionSilently();

    this.router.navigate(['/login']).then(() => {
      this.redirectingToLogin = false;
    });
  }

  canMakeApiCalls(): boolean {
    if (this.refreshInProgress) return false;
    if (this.isLoggingOut) return false;
    if (this.redirectingToLogin) return false;
    return true;
  }
}