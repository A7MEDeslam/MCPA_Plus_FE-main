import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { SystemNotification, SystemNotificationsService } from '../../services/system-notifications.service';
import { MobileNavService } from '../../services/mobile-nav.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent implements OnInit {
  projectService = inject(ProjectService);
  authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsApi = inject(SystemNotificationsService);
  readonly mobileNav = inject(MobileNavService);
  notifications: SystemNotification[] = [];
  notificationsOpen = false;
  notificationError = '';
  liveDateStr = '';

  ngOnInit() {
    this.updateDate();
    this.loadNotifications();
    setInterval(() => this.updateDate(), 60000);
  }

  get unreadNotificationsCount(): number {
    return this.notifications.filter(notification => !notification.isRead).length;
  }

  toggleNotifications(): void {
    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationError = '';
    this.notificationsApi.getMine().subscribe({
      next: rows => this.notifications = rows ?? [],
      error: error => { this.notificationError = error?.error?.message || 'Could not load notifications.'; },
    });
  }

  markNotificationRead(notification: SystemNotification): void {
    if (notification.isRead) return;
    this.notificationsApi.markRead(notification.id).subscribe({
      next: () => this.notifications = this.notifications.map(row => row.id === notification.id ? { ...row, isRead: true } : row),
      error: error => { this.notificationError = error?.error?.message || 'Could not mark this notification as read.'; },
    });
  }

  openWorkOrders(notification: SystemNotification): void {
    if (!notification.isRead) this.markNotificationRead(notification);
    this.notificationsOpen = false;
    this.router.navigate(['/prodorders']);
  }

  updateDate() {
    const d = new Date();
    this.liveDateStr = d.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) + ' ' + d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }

  onProjectChange(id: number | null) {
    this.projectService.selectProject(id);
  }

  logout() {
    this.authService.logout();
  }

  get username(): string {
    return this.authService.getUser()?.username || 'User';
  }

  get userInitial(): string {
    return this.username.charAt(0).toUpperCase();
  }
}
