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
  @ViewChild('signatureInput') signatureInput?: ElementRef<HTMLInputElement>;
  @ViewChild('barcodeInput') barcodeInput?: ElementRef<HTMLInputElement>;

  private documentService = inject(DocumentService);
  private notification = inject(NotificationService);
  private bsModalRef = inject(BsModalRef);

  private allowedTypes = ['image/png', 'image/jpeg'];

  editData: any;
  mapdata = new EventEmitter<boolean>();

  signatureFile = signal<File | null>(null);
  barcodeFile = signal<File | null>(null);
  isSignatureDragging = signal(false);
  isBarcodeDragging = signal(false);
  isSubmitting = signal(false);

  onSignatureSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setFile('signature', input.files?.[0] || null);
  }

  onBarcodeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.setFile('barcode', input.files?.[0] || null);
  }

  onSignatureDrop(event: DragEvent) {
    event.preventDefault();
    this.isSignatureDragging.set(false);
    this.setFile('signature', event.dataTransfer?.files?.[0] || null);
  }

  onBarcodeDrop(event: DragEvent) {
    event.preventDefault();
    this.isBarcodeDragging.set(false);
    this.setFile('barcode', event.dataTransfer?.files?.[0] || null);
  }

  onDragOver(event: DragEvent, type: AssetType) {
    event.preventDefault();
    if (type === 'signature') {
      this.isSignatureDragging.set(true);
    } else {
      this.isBarcodeDragging.set(true);
    }
  }

  onDragLeave(type: AssetType) {
    if (type === 'signature') {
      this.isSignatureDragging.set(false);
    } else {
      this.isBarcodeDragging.set(false);
    }
  }

  removeSignature(event: Event) {
    event.stopPropagation();
    this.signatureFile.set(null);
    this.resetInput(this.signatureInput);
  }

  removeBarcode(event: Event) {
    event.stopPropagation();
    this.barcodeFile.set(null);
    this.resetInput(this.barcodeInput);
  }

  onClear() {
    this.signatureFile.set(null);
    this.barcodeFile.set(null);
    this.resetInput(this.signatureInput);
    this.resetInput(this.barcodeInput);
  }

  onSubmit() {
    const projectId = this.editData?.id;
    if (!projectId) {
      this.notification.error('Project id not found');
      return;
    }
    if (!this.signatureFile() && !this.barcodeFile()) {
      this.notification.error('Please select at least one file');
      return;
    }

    const formData = new FormData();
    if (this.signatureFile()) {
      formData.append('signature', this.signatureFile() as File);
    }
    if (this.barcodeFile()) {
      formData.append('barcode', this.barcodeFile() as File);
    }

    this.isSubmitting.set(true);
    this.documentService.uploadSigningAssets(projectId, formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notification.success('Signature / barcode uploaded successfully');
        this.mapdata.emit(true);
        this.bsModalRef.hide();
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.notification.error(err?.error?.detail || 'Upload failed. Please try again.');
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
      this.resetInput(type === 'signature' ? this.signatureInput : this.barcodeInput);
      return;
    }

    if (type === 'signature') {
      this.signatureFile.set(file);
    } else {
      this.barcodeFile.set(file);
    }
  }

  private resetInput(ref?: ElementRef<HTMLInputElement>) {
    if (ref?.nativeElement) {
      ref.nativeElement.value = '';
    }
  }
}