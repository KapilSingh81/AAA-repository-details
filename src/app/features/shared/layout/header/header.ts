import { Component, inject, Renderer2, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from "@angular/router";
import { Footer } from "../footer/footer";
import { ADMIN_MENU } from '../../CONSTANT/menu';
import { AuthService } from '../../services/auth-service/auth-service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink, RouterOutlet, Footer],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  menu = signal<any[]>(ADMIN_MENU);
  currentBasePath = signal('');
  isMobile: boolean = false;
  isMobileMenuOpen: boolean = false;
  isDropdownOpen: boolean = false;
  private router = inject(Router);
  private loginService = inject(AuthService);
  private renderer = inject(Renderer2);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const segments = this.router.url.split('/');
        this.currentBasePath.set('/' + (segments[1] || ''));
        this.updateActiveMenu(this.router.url);
      }
    });
  };

  ngOnInit() {}

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
  }
}