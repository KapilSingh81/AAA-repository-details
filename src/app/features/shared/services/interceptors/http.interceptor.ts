import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth-service/auth-service';

export const HttpInterceptorService: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);
  const refreshToken = inject(AuthService);
  const token = cookieService.get('aaa-token');
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: token ? `Bearer ${token}` : ""
      }
    });
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {

        const isAuthError = error.status === 401 || error.status === 403;
        const isInvalidToken =
          error.error?.errors?.some((e: any) =>
            e.type === 'InvalidTokenError' || e.type === 'UnauthorizedError'
          );

        if (isAuthError || isInvalidToken) {
          refreshToken.logoutUser();
          router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
  }
  return next(req);

};

