import { Component, HostListener, inject, OnDestroy, OnInit, Renderer2, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import { Footer } from "../footer/footer";
import { ADMIN_MENU } from '../../CONSTANT/menu';
import { AuthService } from '../../services/auth-service/auth-service';

import { BsModalRef, BsModalService, ModalOptions } from 'ngx-bootstrap/modal';
import { ResetPassword } from '../../components/reset-password/reset-password';
import { CommonService } from '../../services/common-services/common-service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterOutlet, Footer],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  private router = inject(Router);
  private loginService = inject(AuthService);
  private renderer = inject(Renderer2);
  private notificationApi = inject(CommonService);
  private notificationTimer: any;

  menu = signal<any[]>(ADMIN_MENU);
  currentBasePath = signal('');
  notifications = signal<any[]>([]);
  unreadCount = signal(0);
  isNotificationLoading = signal(false);
  isMobile: boolean = false;
  isMobileMenuOpen: boolean = false;
  isDropdownOpen: boolean = false;
  isNotificationOpen: boolean = false;
  bsModalRef!: BsModalRef;

  constructor(
    private modalService: BsModalService
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const segments = this.router.url.split('/');
        this.currentBasePath.set('/' + (segments[1] || ''));
        this.updateActiveMenu(this.router.url);
      }
    });
  };

  ngOnInit() {
    this.loadNotifications();
    this.notificationTimer = setInterval(() => this.loadNotifications(false), 60000);
  }

  ngOnDestroy() {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
  }

  updateActiveMenu(currentPath: string) {
    this.menu.set(
      this.menu().map((menu: any) => {
        const isMainActive = menu.path === currentPath;
        const subNav = menu.subNav?.map((sub: any) => {
          const isSubActive = sub.path === currentPath;
          return { ...sub, isActive: isSubActive };
        });
        const isAnySubActive = subNav?.some((s: any) => s.isActive);
        return {
          ...menu,
          isActive: isMainActive || isAnySubActive,
          subNav
        };
      })
    );
  }

  onMenuItemClick(menuItem: any, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onSubmenuShow(menuItem);
    if (this.isMobile) {
      this.isMobileMenuOpen = false;
    }
  };

  onSubmenuShow(item: any): void {
    this.isDropdownOpen = false;
    this.updateActiveMenu(item?.path);
    if (item.path) {
      this.router.navigate([item.path]);
    }
  };

  toggleDropdown(state: boolean) {
    this.isDropdownOpen = state;
  };

  logout() {
    this.loginService.logoutUser()
  };

  onResetPwd() {
    const initialState: ModalOptions = {
      initialState: {},
    };
    this.bsModalRef = this.modalService.show(
      ResetPassword,
      Object.assign(initialState, {
        id: 'confirmation',
        class: 'modal-md modal-dialog-centered alert-popup',
      })
    );
  }

  loadNotifications(showLoader: boolean = true) {
    if (showLoader) {
      this.isNotificationLoading.set(true);
    }
    this.notificationApi.getMyNotifications().subscribe({
      next: (res: any) => {
        const data = res?.body || res;
        this.isNotificationLoading.set(false);
        this.notifications.set(data?.notifications || []);
        this.unreadCount.set(data?.unread_count || 0);
      },
      error: () => {
        this.isNotificationLoading.set(false);
      },
    });
  }

  toggleNotification(event: Event) {
    event.stopPropagation();
    this.isNotificationOpen = !this.isNotificationOpen;
    if (this.isNotificationOpen) {
      this.loadNotifications();
    }
  }

  markAllAsRead(event: Event) {
    event.stopPropagation();
    this.notificationApi.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.set(this.notifications().map((item: any) => ({ ...item, is_read: true })));
        this.unreadCount.set(0);
      },
    });
  }

  getInitials(name: string): string {
    const parts = (name || '').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
  }

  getTimeAgo(value: string): string {
    if (!value) return '';
    const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    if (diff < 604800) return Math.floor(diff / 86400) + ' d ago';
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  onNotificationClick(notification: any) {
    this.isNotificationOpen = false;
    this.router.navigateByUrl('/user/audit-review/repository');
  }

  getNotificationTitle(type: string): string {
    switch (type) {
      case 'report_uploaded':
        return 'Report Uploaded';
      default:
        return (type || 'Notification')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.isNotificationOpen && !target.closest('.notification-wrapper')) {
      this.isNotificationOpen = false;
    }
  }
}