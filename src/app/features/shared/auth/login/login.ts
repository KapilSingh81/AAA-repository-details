import { Component, inject, signal } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Router } from '@angular/router';
import { StorageService } from '../../services/storage-service/storage.service';
import { Footer } from "../../layout/footer/footer";
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth-service/auth-service';
import { NotificationService } from '../../services/notification-service/notificaiton';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  imports: [CommonModule],
})
export class Login {
  currentYear = signal(new Date().getFullYear());
  showPassword = signal(false);
  isLoading = signal<boolean>(false);

  private cookieService = inject(CookieService);
  private router = inject(Router);
  private storageService = inject(StorageService);
  private loginService = inject(AuthService);
  private notification = inject(NotificationService);
  
  form: any = signal({
    email: '',
    password: ''
  });

  errors = signal<Record<string, string | null>>({
    email: null,
    password: null
  });

  touched = signal<Record<string, boolean>>({
    email: false,
    password: false
  });

  validators: any = {
    email: [
      (v: string) => !v ? 'Email is required' : null,
      (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? null
          : 'Please enter a valid email address (e.g., name@example.com)'
    ],
    password: [
      (v: string) => !v ? 'Password is required' : null,
      (v: string) => v.length >= 8 ? null : 'Password must be at least 8 characters long'
    ]
  };

  setField(field: string, value: string) {
    this.form.update((prev: any) => ({ ...prev, [field]: value }));
    this.touched.update(prev => ({ ...prev, [field]: true }));
    this.validateField(field);
  }

  validateField(field: string): boolean {
    const value = this.form()[field];
    const rules = this.validators[field];
    for (let rule of rules) {
      const error = rule(value);
      if (error) {
        this.errors.update(prev => ({ ...prev, [field]: error }));
        return false;
      }
    }
    this.errors.update(prev => ({ ...prev, [field]: null }));
    return true;
  }

  validateForm(): boolean {
    return Object.keys(this.validators)
      .map(field => this.validateField(field))
      .every(Boolean);
  }

  ngOnInit(): void {
    this.checkExistingSession();
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    if (!this.validateForm()) {
      return;
    }
    
    const formValues = this.form();
    const payload = {
      username: formValues.email,  
      password: formValues.password
    };
    
    this.isLoading.set(true);
    this.loginService.login(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.body?.code === 200) {          
          this.notification.success(res?.body?.message);
          const tokenExpires = new Date(res?.body?.tokenExpiredOn);
          const expiresIn = res?.body?.expires_in;
          
          this.cookieService.set('aaa-token', res?.body?.access_token, {
            path: '/',
            secure: false,
            sameSite: 'Lax',
            expires: tokenExpires,
          });
          this.storageService.setItem('aaa-user', res?.body);
          this.loginService.startTimer(expiresIn);
          this.redirectByRole();
        } else {
          this.notification.error(res?.error?.message || 'Login failed');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message || 'Server error');
      }
    });
  }

  redirectByRole() {
    this.router.navigateByUrl('/user/workspace');
  }

  private async checkExistingSession() {
    const token = this.cookieService.get('aaa-token');
    const user: any = await this.storageService.getItem('aaa-user');    
    if (token && user) {
      const isValid = this.loginService.isTokenValid();      
      if (isValid) {
        try {
          this.redirectByRole();
          return;
        } catch (error) {
          this.clearSessionSilently();
        }
      } else {
        this.clearSessionSilently();
      }
    } else {
      this.clearSessionSilently();
    }
  }

  private clearSessionSilently() {
    clearTimeout(this.loginService['authRefreshTimeout']);
    this.storageService.clear();
    this.cookieService.delete('aaa-token', '/');
  }

  clearSession() {
    this.loginService.logoutUser();
  }
}