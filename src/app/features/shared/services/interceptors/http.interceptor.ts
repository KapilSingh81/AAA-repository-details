import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth-service/auth-service';
import { StorageService } from '../storage-service/storage.service';

export const HttpInterceptorService: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const cookieService = inject(CookieService);
  const authService = inject(AuthService);
  const storageService = inject(StorageService);
  
  let isRedirecting = false;
    const token = cookieService.get('aaa-token');
    if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: token ? `Bearer ${token}` : ""
      }
    });
  }
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthError = error.status === 401 || error.status === 403;
      const isInvalidToken = error.error?.errors?.some((e: any) =>
        e.type === 'InvalidTokenError' || 
        e.type === 'UnauthorizedError' ||
        e.type === 'TokenExpiredError'
      );
      
      const isRefreshOrLogoutRequest = req.url.includes('refresh-token') || req.url.includes('logout');      
      if ((isAuthError || isInvalidToken) && !isRefreshOrLogoutRequest) {
        if (!isRedirecting) {
          isRedirecting = true;
          cookieService.delete('aaa-token', '/');
          storageService.clear();
          
          router.navigate(['/login']).then(() => {
            isRedirecting = false;
          });
        }
      }
      
      return throwError(() => error);
    })
  );
};