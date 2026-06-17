import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { get, set, del, clear } from 'idb-keyval';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private isBrowser: boolean;
  private store = new Map<string, ReturnType<typeof signal<any>>>();
  selectedAccount = signal<any>(null);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private getSignal(key: string) {
    if (!this.store.has(key)) {
      this.store.set(key, signal<any>(null));
    }
    return this.store.get(key)!;
  };

  async getItem<T>(key: string): Promise<T | null> {
    if (!this.isBrowser) return null;
    const value = await get(key);
    this.getSignal(key).set(value);
    return value;
  }

  async setItem(key: string, value: any): Promise<void> {
    if (!this.isBrowser) return;
    await set(key, value);
    this.getSignal(key).set(value);
  };

  async removeItem(key: string): Promise<void> {
    if (!this.isBrowser) return;
    await del(key);
    this.getSignal(key).set(null);
  };

  async clear(): Promise<void> {
    if (!this.isBrowser) return;
    await clear();
    this.store.forEach(sig => sig.set(null));
  };

  getItemSignal<T>(key: string) {
    return this.getSignal(key) as ReturnType<typeof signal<T | null>>;
  }

  setSelectedAccount(data: any) {
    this.selectedAccount.set(data);
  }

  getSelectedAccount() {
    return this.selectedAccount;
  }
}