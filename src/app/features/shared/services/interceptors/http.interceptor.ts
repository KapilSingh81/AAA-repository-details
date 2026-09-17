import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth-service/auth-service';
import { StorageService } from '../storage-service/storage.service';

const attach = (req: HttpRequest<any>, token: string) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

let isRedirecting = false;

export const HttpInterceptorService: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);
  const authService = inject(AuthService);
  const storageService = inject(StorageService);
  const bsModalService = inject(BsModalService);

  const isAuthEndpoint =
    req.url.includes('refresh-token') || req.url.includes('logout') || req.url.includes('login');

  const authReq = attach(req, cookieService.get('aaa-token'));

  const forceLogout = () => {
    if (isRedirecting) return;
    isRedirecting = true;
    cookieService.delete('aaa-token', '/');
    storageService.clear();
    while (bsModalService.getModalsCount() > 0) {
      bsModalService.hide();
    }
    router.navigate(['/login']).then(() => {
      isRedirecting = false;
    });
  };

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthError = error.status === 401 || error.status === 403;
      const isInvalidToken = error.error?.errors?.some((e: any) =>
        e.type === 'InvalidTokenError' ||
        e.type === 'UnauthorizedError' ||
        e.type === 'TokenExpiredError'
      );

      if (isAuthEndpoint || (!isAuthError && !isInvalidToken)) {
        return throwError(() => error);
      }

      return authService.getFreshToken().pipe(
        switchMap(token => next(attach(req, token))),
        catchError(refreshErr => {
          forceLogout();
          return throwError(() => refreshErr);
        }),
      );
    }),
  );
};