import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { ToastService } from './services/toast.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TopbarComponent,
    SidebarComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  toastService = inject(ToastService);
  private router = inject(Router);

  isLoginPage(): boolean {
    return this.router.url.startsWith('/login') || this.router.url.startsWith('/forgot-password') || this.router.url.startsWith('/verify-otp');
  }
}
