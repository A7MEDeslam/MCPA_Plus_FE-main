import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  username: string;
  roles: string[];
  permissions: string[];
  expiration: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiration: string;
  username: string;
  roles: string[];
  permissions: string[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.getToken();
    const user = this.getUser();

    if (token && user && !this.isTokenExpired()) {
      this.currentUserSubject.next(user);
      this.isAuthenticatedSubject.next(true);
    } else {
      this.logout();
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/login`, credentials)
      .pipe(
        tap((response) => {
          const user: User = {
            username: response.username,
            roles: response.roles || [],
            permissions: response.permissions || [],
            expiration: response.expiration,
          };

          this.setToken(response.token);
          this.setUser(user);

          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/password/forget`, { email }, { responseType: 'text' }).pipe(
      map((responseText) => {
        const isSuccess = responseText.toLowerCase().includes('otp') || responseText.toLowerCase().includes('success');
        return { success: isSuccess, message: responseText };
      }),
      catchError((error) => {
        return throwError(() => ({
          message: error.error?.message || error.message || 'Failed to send reset code',
          status: error.status,
        }));
      })
    );
  }

  validateOtp(data: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${this.API_URL}/password/validate-otp`, data, { responseType: 'text' }).pipe(
      map((responseText) => {
        const isValid = responseText.toLowerCase().includes('valid') || responseText.toLowerCase().includes('success');
        return { success: isValid, message: responseText };
      }),
      catchError((error) => {
        return throwError(() => ({
          message: error.error?.message || 'Invalid verification code',
          status: error.status,
        }));
      })
    );
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}/password/reset`, data, { responseType: 'text' }).pipe(
      map((responseText) => {
        const isSuccess = responseText.toLowerCase().includes('success') || responseText.toLowerCase().includes('reset');
        return { success: isSuccess, message: responseText };
      }),
      catchError((error) => {
        return throwError(() => ({
          message: error.error?.message || 'Failed to reset password',
          status: error.status,
        }));
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired();
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return !!user?.roles?.some(r => r.toLowerCase() === role.toLowerCase());
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    if (!user?.roles) return false;
    const userRoles = user.roles.map(r => r.toLowerCase());
    return roles.some(role => userRoles.includes(role.toLowerCase()));
  }

  isCeo(): boolean {
    return this.hasRole('ceo');
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  private removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  private isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
}
