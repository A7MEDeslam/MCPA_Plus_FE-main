import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth`;

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // Get all users (optionally filtered by role and email)
  getAllUsers(role?: string, email?: string): Observable<User[]> {
    let url = `${this.API_URL}/GetAllUsersWithRoles`;
    const params: any = {};
    if (role) params.role = role;
    if (email) params.email = email;

    return this.http.get<User[]>(url, {
      headers: this.getAuthHeaders().headers,
      params
    });
  }

  // Add new user (SignUp)
  addUser(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/SignUp`, userData, this.getAuthHeaders());
  }

  // Update user role by Admin
  updateUserRole(data: { userId: string; role: string }): Observable<any> {
    return this.http.put(`${this.API_URL}/UpdateUser`, data, this.getAuthHeaders());
  }

  // Delete user by Admin
  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/DeleteUser/${userId}`, this.getAuthHeaders());
  }

  // Get all roles
  getAllRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/GetAllRoles`, this.getAuthHeaders());
  }

  // Add new role
  addRole(roleData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/AddRoles`, roleData, this.getAuthHeaders());
  }

  // Update existing role
  updateRole(roleData: any): Observable<any> {
    return this.http.put(`${this.API_URL}/UpdateRole`, roleData, this.getAuthHeaders());
  }

  // Delete role
  deleteRole(roleName: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/DeleteRole/${roleName}`, this.getAuthHeaders());
  }

  // Get all system claims
  getAllClaims(): Observable<any> {
    return this.http.get(`${this.API_URL}/GetAllClaims`, this.getAuthHeaders());
  }
}
