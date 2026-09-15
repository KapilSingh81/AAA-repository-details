import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { BsModalService } from 'ngx-bootstrap/modal';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth-service/auth-service';

const attach = (req: HttpRequest<any>, token: string) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

export const HttpInterceptorService: HttpInterceptorFn = (req, next: HttpHandlerFn) => {
  const cookieService = inject(CookieService);
  const authService = inject(AuthService);
  const bsModalService = inject(BsModalService);

  const isAuthEndpoint =
    req.url.includes('refresh-token') || req.url.includes('logout') || req.url.includes('login');

  const authReq = attach(req, cookieService.get('aaa-token'));

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthError = error.status === 401 || error.status === 403;
      if (!isAuthError || isAuthEndpoint) return throwError(() => error);

      return authService.getFreshToken().pipe(
        switchMap(token => next(attach(req, token))),   
        catchError(refreshErr => {
          while (bsModalService.getModalsCount() > 0) bsModalService.hide();
          return throwError(() => refreshErr);      
        }),
      );
    }),
  );
};