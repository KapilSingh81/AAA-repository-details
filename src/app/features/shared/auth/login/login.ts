import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Footer } from '../../layout/footer/footer';
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

  private router = inject(Router);
  private loginService = inject(AuthService);
  private notification = inject(NotificationService);

  form: any = signal({
    email: '',
    password: '',
  });

  errors = signal<Record<string, string | null>>({
    email: null,
    password: null,
  });

  touched = signal<Record<string, boolean>>({
    email: false,
    password: false,
  });

  validators: any = {
    email: [
      (v: string) => (!v ? 'Email is required' : null),
      (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
          ? null
          : 'Please enter a valid email address (e.g., name@example.com)',
    ],
    password: [
      (v: string) => (!v ? 'Password is required' : null),
      (v: string) => (v.length >= 8 ? null : 'Password must be at least 8 characters long'),
    ],
  };

  ngOnInit(): void {
    this.checkExistingSession();
  }

  setField(field: string, value: string) {
    this.form.update((prev: any) => ({ ...prev, [field]: value }));
    this.touched.update((prev) => ({ ...prev, [field]: true }));
    this.validateField(field);
  }

  validateField(field: string): boolean {
    const value = this.form()[field];
    const rules = this.validators[field];
    for (let rule of rules) {
      const error = rule(value);
      if (error) {
        this.errors.update((prev) => ({ ...prev, [field]: error }));
        return false;
      }
    }
    this.errors.update((prev) => ({ ...prev, [field]: null }));
    return true;
  }

  validateForm(): boolean {
    return Object.keys(this.validators)
      .map((field) => this.validateField(field))
      .every(Boolean);
  }

  togglePasswordVisibility() {
    this.showPassword.update((v) => !v);
  }

  async onSubmit(event: Event) {
    event.preventDefault();
    if (!this.validateForm()) return;

    const formValues = this.form();
    const payload = {
      username: formValues.email,
      password: formValues.password,
    };

    this.isLoading.set(true);
    this.loginService.login(payload).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.body?.code === 200) {
          this.notification.success(res?.body?.message);
          this.loginService.setSession(res.body);
          this.redirectByRole();
        } else {
          this.notification.error(res?.error?.message || res?.body?.message || 'Login failed');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.notification.error(err?.error?.message || 'Server error');
      },
    });
  }

  redirectByRole() {
    this.router.navigateByUrl('/user/dashboard/home');
  }

  private async checkExistingSession() {
    const hasSession = await this.loginService.hasSession();
    if (hasSession) {
      this.redirectByRole();
    } else {
      this.loginService.clearSessionSilently();
    }
  }

  clearSession() {
    this.loginService.logoutUser();
  }
}