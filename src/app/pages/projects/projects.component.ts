import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit {
  projectService = inject(ProjectService);
  toastService = inject(ToastService);
  authService = inject(AuthService);
  router = inject(Router);

  get canManageProjects() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Accountant']);
  }

  pagination = useDynamicPagination();

  modalOpen = false;
  editingId: number | null = null;
  projectName = '';
  projectTheme = 'default';
  projectSearch = '';

  get filteredProjects() {
    const term = this.projectSearch.toLowerCase();
    return this.projectService
      .Projects()
      .filter((p) => !term || p.name.toLowerCase().includes(term));
  }

  get pagedProjects() {
    const data = this.filteredProjects;
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  }

  ngOnInit() {
    this.projectService.fetchAll();
  }

  openNewProjectModal() {
    this.editingId = null;
    this.projectName = '';
    this.projectTheme = 'default';
    this.modalOpen = true;
  }

  openEditProjectModal(project: any) {
    this.editingId = project.id;
    this.projectName = project.name;
    this.projectTheme = localStorage.getItem(`project_theme_${project.id}`) || 'default';
    this.modalOpen = true;
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.modalOpen = false;
    }
  }

  selectProject(id: number | null) {
    this.projectService.selectProject(id);
    this.toastService.show(id ? 'Project activated!' : 'Global view activated!');
  }

  viewProjectSerials(projectId: number, projectName: string) {
    this.router.navigate(['/serials'], {
      queryParams: { type: 'project', id: projectId, name: projectName },
    });
  }

  saveProject() {
    if (!this.projectName.trim()) {
      return alert('Project name is required.');
    }

    if (!this.nameRegex.test(this.projectName.trim())) {
      return alert('Project name can contain letters and hyphens (-) only.');
    }

    const payload = { name: this.projectName.trim() };
    if (this.editingId) {
      this.projectService.update(this.editingId, payload).subscribe({
        next: () => {
          localStorage.setItem(`project_theme_${this.editingId}`, this.projectTheme);
          // If editing the active project, trigger theme refresh
          if (this.projectService.selectedProjectId() === this.editingId) {
            this.projectService.selectProject(this.editingId); // re-trigger effect
          }
          this.projectService.fetchAll();
          this.modalOpen = false;
          this.toastService.show('Project updated!');
        },
        error: (err) => {
          console.error('Failed to update project:', err);
          alert(err?.error?.message || 'Failed to update project.');
        },
      });
    } else {
      localStorage.setItem('pending_project_theme', this.projectTheme);
      this.projectService.create(payload).subscribe({
        next: (res) => {
          const id = res?.id;
          if (id) {
            localStorage.setItem(`project_theme_${id}`, this.projectTheme);
            localStorage.removeItem('pending_project_theme');
          }
          this.projectService.fetchAll();
          this.modalOpen = false;
          this.toastService.show('Project created!');
        },
        error: (err) => {
          console.error('Failed to create project:', err);
          alert(err?.error?.message || 'Failed to create project.');
        },
      });
    }
  }

  deleteProject(id: number, name: string) {
    if (!confirm(`Delete project "${name}"?`)) return;

    this.projectService.delete(id).subscribe({
      next: () => {
        if (this.projectService.selectedProjectId() === id) {
          this.projectService.selectProject(null);
        }
        localStorage.removeItem(`project_theme_${id}`);
        this.projectService.fetchAll();
        this.toastService.show('Project deleted!');
      },
      error: (err) => {
        console.error('Failed to delete project:', err);
        alert(err?.error?.message || 'Failed to delete project.');
      },
    });
  }

  // isProjectNameValid(): boolean {
  //   const name = this.projectName.trim();
  //   return !name || this.nameRegex.test(name);
  // }

  private readonly nameRegex = /^[A-Za-z\u0600-\u06FF]+(?:[\s-][A-Za-z\u0600-\u06FF]+)*$/;

  onProjectNameInput(event: Event) {
    const el = event.target as HTMLInputElement;

    const cleaned = el.value
      .replace(/[^A-Za-z\u0600-\u06FF\s-]/g, '')
      .replace(/^[\s-]+/, '')
      .replace(/[\s-]{2,}/g, (m) => m[0]);

    if (el.value !== cleaned) {
      el.value = cleaned;
    }
    this.projectName = cleaned;
  }
}
