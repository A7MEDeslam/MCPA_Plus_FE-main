import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementService } from './service/user-management.service';
import { User } from './models/user';
import { AddUserComponent } from './add-user/add-user.component';
import { AddRoleComponent } from './add-role/add-role.component';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { OutsourceProfileModalComponent } from '../outsource-profile-modal/outsource-profile-modal';


@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AddUserComponent,
    AddRoleComponent,
    PaginationComponent,
    OutsourceProfileModalComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  private userService = inject(UserManagementService);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  /** True only when the logged-in user has the CEO role */
  get isCeo(): boolean {
    return this.authService.isCeo();
  }
  // Outsource profile modal state
  showOutsourceModal = false;
  selectedOutsourceUserId = '';
  selectedOutsourceUserName = '';

  private readonly OUTSOURCE_ROLE_KEYWORD = 'outsource';

  isOutsourceRole(roleName: string | null | undefined): boolean {
    return !!roleName && roleName.toLowerCase().includes(this.OUTSOURCE_ROLE_KEYWORD);
  }

  openOutsourceModal(user: User): void {
    this.selectedOutsourceUserId = user.id;
    this.selectedOutsourceUserName = user.userName;
    this.showOutsourceModal = true;
  }

  onOutsourceProfileSaved(): void {
    this.showOutsourceModal = false;
    this.toastService.show('Company info saved successfully');
  }
  usersPagination = useDynamicPagination();
  rolesPagination = useDynamicPagination();

  users: User[] = [];
  roles: any[] = [];
  selectedTab: 'users' | 'roles' = 'users';

  // Modal display toggles
  showAddUserForm = false;
  showAddRoleForm = false;

  // Filter criteria
  searchText = '';
  selectedRole = '';

  switchTab(tab: 'users' | 'roles') {
    this.selectedTab = tab;
    this.usersPagination.currentPage.set(1);
    this.rolesPagination.currentPage.set(1);
  }

  get filteredUsers(): User[] {
    return this.users.filter((user) => {
      const matchesSearch =
        !this.searchText ||
        (user.userName && user.userName.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(this.searchText.toLowerCase())) ||
        (user.phoneNumber && user.phoneNumber.includes(this.searchText));
      const matchesRole = !this.selectedRole || user.roleName === this.selectedRole;
      return matchesSearch && matchesRole;
    });
  }

  get pagedUsers(): User[] {
    const data = this.filteredUsers;
    const page = this.usersPagination.currentPage();
    const size = this.usersPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  }

  get pagedRoles(): any[] {
    const data = this.roles;
    const page = this.rolesPagination.currentPage();
    const size = this.rolesPagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.cdr.detectChanges(); // ← force view update
        console.log('Users loaded:', users);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.toastService.show('Error loading users list');
      },
    });
  }

  loadRoles(): void {
    this.userService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.cdr.detectChanges(); // ← force view update
        console.log('Roles loaded:', roles);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      },
    });
  }

  onUserAdded(): void {
    this.showAddUserForm = false;
    this.loadUsers();
    this.toastService.show('User added successfully');
  }

  onRoleAdded(): void {
    this.showAddRoleForm = false;
    this.loadRoles();
    this.toastService.show('Role added successfully');
  }

  updateUserRole(userId: string, newRole: string): void {
    // Guard: skip if the user already has this role
    const user = this.users.find((u) => u.id === userId);
    if (!user || user.roleName === newRole) return;

    this.userService.updateUserRole({ userId, role: newRole }).subscribe({
      next: () => {
        // Update in-place to avoid re-rendering the entire list (prevents dropdown flicker)
        user.roleName = newRole;
        this.toastService.show('User role updated successfully');
      },
      error: (error) => {
        console.error('Error updating user role:', error);
        this.toastService.show(error.error?.message || 'Error updating user role');
      },
    });
  }

  deleteUser(userId: string): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.userService.deleteUser(userId).subscribe({
        next: () => {
          this.toastService.show('User deleted successfully');
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.toastService.show(error.error?.message || 'Error deleting user');
        },
      });
    }
  }

  deleteRole(roleName: string): void {
    if (confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      this.userService.deleteRole(roleName).subscribe({
        next: () => {
          this.toastService.show(`Role "${roleName}" deleted successfully`);
          this.loadRoles();
          this.loadUsers(); // Reload users in case some users had this role
        },
        error: (error) => {
          console.error('Error deleting role:', error);
          this.toastService.show(error.error?.message || 'Error deleting role');
        },
      });
    }
  }
}
