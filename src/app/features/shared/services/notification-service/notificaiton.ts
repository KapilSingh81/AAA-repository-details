import { Injectable, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import Swal, { SweetAlertOptions } from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private toastr = inject(ToastrService);

  // ================= TOAST =================

  success(message: string, title: string = 'Success') {
    this.toastr.success(message, title);
  }

  error(message: string, title: string = 'Error') {
    this.toastr.error(message, title);
  }

  info(message: string, title: string = 'Info') {
    this.toastr.info(message, title);
  }

  warning(message: string, title: string = 'Warning') {
    this.toastr.warning(message, title);
  }

  // ================= ALERT =================

  private baseAlert(config: SweetAlertOptions) {
    return Swal.fire({
      position: 'center',
      showConfirmButton: false,
      timer: 2000,
      ...config
    });
  }

  successAlert(message: string) {
    return this.baseAlert({
      icon: 'success',
      title: message
    });
  }

  errorAlert(message: string) {
    return this.baseAlert({
      icon: 'error',
      title: message
    });
  }

  infoAlert(message: string) {
    return this.baseAlert({
      icon: 'info',
      title: message
    });
  }

  // ================= DELETE CONFIRM =================

  confirmDelete(): Promise<boolean> {
    return Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        confirmButton: 'btn btn-success',
        cancelButton: 'btn btn-danger'
      },
      buttonsStyling: false
    }).then(result => result.isConfirmed);
  }
}