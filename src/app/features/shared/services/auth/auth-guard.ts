import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { StorageService } from '../storage-service/storage.service';

export const authGuard: CanActivateFn = async (route, state) => {

  const cookieService = inject(CookieService);
  const router = inject(Router);
  const token = cookieService.get('aaa-token'); 
  const storage = inject(StorageService)

  if (!token) {
    router.navigate(['/']);
    return false;
  }

  const allowedRoles = route.data?.['role'] as string[];
  const userData:any = await storage.getItem('aaa-user');  
  if (!userData) {
    router.navigate(['/']);
    return false;
  }
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(userData.role);

    if (!hasRole) {
      router.navigate(['/']);
      return false;
    }
  }

  return true;
};