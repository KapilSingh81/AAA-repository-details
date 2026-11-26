import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, inject, signal, ViewChild } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { NotificationService } from '../../../../shared/services/notification-service/notificaiton';
import { DocumentService } from '../../services/document-service';

type AssetType = 'signature' | 'barcode';

@Component({
  selector: 'app-signing-assets-popup',
  imports: [CommonModule],
  templateUrl: './signing-assets-popup.html',
})
export class SigningAssetsPopup {
  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  private documentService = inject(DocumentService);
  private notification = inject(NotificationService);
  private bsModalRef = inject(BsModalRef);

  private allowedTypes = ['image/png', 'image/jpeg'];

  editData: any;
  mapdata = new EventEmitter<boolean>();

  barcodeFile = signal<File | null>(null);
  isBarcodeDragging = signal(false);
  isSubmitting = signal(false);

  onBarcodeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setFile('barcode', input.files?.[0] || null);
  }

  onBarcodeDrop(event: DragEvent) {
    event.preventDefault();
    this.isBarcodeDragging.set(false);
    this.setFile('barcode', event.dataTransfer?.files?.[0] || null);
  }

  onDragOver(event: DragEvent, type: AssetType) {
    event.preventDefault();
    if (type === 'barcode') {
      this.isBarcodeDragging.set(true);
    }
  }

  onDragLeave(type: AssetType) {
    if (type === 'barcode') {
      this.isBarcodeDragging.set(false);
    }
  }

  removeBarcode(event: Event) {
    event.stopPropagation();
    this.barcodeFile.set(null);
    this.resetInput(this.barcodeInput);
  }

  onClear() {
    this.barcodeFile.set(null);
    this.resetInput(this.barcodeInput);
  }

  onSubmit() {
    const projectId = this.editData?.id;
    if (!projectId) {
      this.notification.error('Project id not found');
      return;
    }
    if (!this.barcodeFile()) {
      this.notification.error('Please select a barcode / QR file');
      return;
    }

    const formData = new FormData();
    if (this.barcodeFile()) {
      formData.append('barcode', this.barcodeFile() as File);
    }

    this.isSubmitting.set(true);
    this.documentService.uploadSigningAssets(projectId, formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Barcode uploaded successfully');
        this.mapdata.emit(true);
        this.bsModalRef.hide();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.notification.error(this.getErrorMessage(err));
      },
    });
  }

  onClose() {
    this.bsModalRef.hide();
  }

  private setFile(type: AssetType, file: File | null) {
    if (!file) return;

    if (!this.allowedTypes.includes(file.type)) {
      this.notification.error('Only PNG or JPEG images are allowed');
      this.resetInput(this.barcodeInput);
      return;
    }

    if (type === 'barcode') {
      this.barcodeFile.set(file);
    }
  }

  private getErrorMessage(err: any): string {
    const body = err?.error;
    const detail = body?.detail;
    return (
      body?.message ||
      (typeof detail === 'string' ? detail : detail?.message) ||
      'Upload failed. Please try again.'
    );
  }

  private resetInput(ref?: ElementRef<HTMLInputElement>) {
    if (ref?.nativeElement) {
      ref.nativeElement.value = '';
    }
  }
}