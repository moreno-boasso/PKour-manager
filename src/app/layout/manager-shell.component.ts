import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ShellMenuItem {
  path: string;
  label: string;
  enabled: boolean;
}

@Component({
  selector: 'app-manager-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './manager-shell.component.html',
})
export class ManagerShellComponent {
  protected readonly menuItems: ShellMenuItem[] = [
    { path: '/spots', label: 'Approvazione Spot', enabled: true },
    { path: '/reviews', label: 'Approvazione Recensioni', enabled: true },
    { path: '/reports', label: 'Approvazione Segnalazioni', enabled: true },
    { path: '/tricks', label: 'Gestione Tricks', enabled: true },
    { path: '#', label: 'Approvazione Foto', enabled: false },
  ];

  protected isSidebarOpen = false;

  constructor(private readonly router: Router) {}

  protected toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  protected closeSidebarOnMobile(): void {
    this.isSidebarOpen = false;
  }

  protected get activeModuleTitle(): string {
    const url = this.router.url;
    if (url.startsWith('/spots')) {
      return 'Approvazione Spot';
    }
    if (url.startsWith('/reviews')) {
      return 'Approvazione Recensioni';
    }
    if (url.startsWith('/reports')) {
      return 'Approvazione Segnalazioni';
    }
    if (url.startsWith('/tricks')) {
      return 'Gestione Tricks';
    }
    return 'Manager';
  }
}
