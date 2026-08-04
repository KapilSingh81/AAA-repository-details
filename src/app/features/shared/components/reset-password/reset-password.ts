import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { AuthService } from '../../services/auth-service/auth-service';
import { NotificationService } from '../../services/notification-service/notificaiton';

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;

    const hasMinLength = value.length >= 8;
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/;'~`]/.test(value);

    const valid = hasMinLength && hasNumber && hasSpecialChar;

    return valid
      ? null
      : {
        passwordStrength: {
          hasMinLength,
          hasNumber,
          hasSpecialChar,
        },
      };
  };
}

export function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const newPwd = group.get('newPwd')?.value;
    const retypePwd = group.get('retypePwd')?.value;

    if (!newPwd || !retypePwd) return null;

    return newPwd === retypePwd ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  resetPwdForm!: FormGroup;
  isLoading = signal<boolean>(false);

  showNewPwd = signal<boolean>(false);
  showRetypePwd = signal<boolean>(false);

  private fb = inject(FormBuilder);
  private bsmodalService = inject(BsModalService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService)

  constructor() {
    this.setInitialForm();
  }

  setInitialForm() {
    this.resetPwdForm = this.fb.group(
      {
        email: [null, [Validators.required, Validators.email]],
        newPwd: [null, [Validators.required, passwordStrengthValidator()]],
        retypePwd: [null, [Validators.required]],
      },
      { validators: passwordMatchValidator() }
    );
  }

  toggleNewPwd() {
    this.showNewPwd.set(!this.showNewPwd());
  }

  toggleRetypePwd() {
    this.showRetypePwd.set(!this.showRetypePwd());
  }

  close(event: any) {
    event.preventDefault();
    this.bsmodalService.hide();
  }

  submit(e: any, formValue: any) {
    e.preventDefault();
    if (this.resetPwdForm.invalid) {
      this.resetPwdForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const payload = {
      email: formValue.email,
      new_password: formValue.retypePwd,
    };
    this.authService.resetPwd(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res?.body?.code === 200) {
          this.notificationService.success(res?.body?.message);
          this.bsmodalService.hide();
        } else {
          this.notificationService.error(res?.body?.message || 'Something went wrong');
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.error('Server error');
      }
    });
  }
}