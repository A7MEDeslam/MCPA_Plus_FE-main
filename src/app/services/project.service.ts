import { Injectable, signal, inject, effect, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  url = environment.apiUrl + '/Projects';

  Projects = signal<any[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedProject = computed(() => {
    const id = this.selectedProjectId();
    return this.Projects().find(p => p.id === id) || null;
  });

  constructor() {
    this.fetchAll();
    const stored = localStorage.getItem('activeProjectId');
    if (stored) {
      this.selectedProjectId.set(Number(stored));
    }

    // Automatically apply theme when active project changes
    effect(() => {
      const proj = this.selectedProject();
      if (proj) {
        const theme = localStorage.getItem(`project_theme_${proj.id}`) || 'default';
        this.applyTheme(theme);
      } else {
        this.applyTheme('default');
      }
    });
  }

  applyTheme(themeName: string) {
    const root = document.documentElement;
    const themes: { [key: string]: any } = {
      default: {
        '--navy': '#1A3A5C',
        '--navy-light': '#2a4e76',
        '--teal': '#0D7E8A',
        '--teal-light': '#13a8b8',
        '--amber': '#D4821A',
        '--amber-light': '#e89b3a'
      },
      emerald: {
        '--navy': '#064e3b',
        '--navy-light': '#0f766e',
        '--teal': '#10b981',
        '--teal-light': '#34d399',
        '--amber': '#f59e0b',
        '--amber-light': '#fbbf24'
      },
      indigo: {
        '--navy': '#1e293b',
        '--navy-light': '#334155',
        '--teal': '#6366f1',
        '--teal-light': '#818cf8',
        '--amber': '#f43f5e',
        '--amber-light': '#fb7185'
      },
      rose: {
        '--navy': '#0f172a',
        '--navy-light': '#1e293b',
        '--teal': '#e11d48',
        '--teal-light': '#fda4af',
        '--amber': '#eab308',
        '--amber-light': '#fde047'
      },
      amber: {
        '--navy': '#1c1917',
        '--navy-light': '#44403c',
        '--teal': '#d97706',
        '--teal-light': '#fbbf24',
        '--amber': '#0d9488',
        '--amber-light': '#2dd4bf'
      },
      sapphire: {
        '--navy': '#0f172a',
        '--navy-light': '#1e3a8a',
        '--teal': '#2563eb',
        '--teal-light': '#60a5fa',
        '--amber': '#ea580c',
        '--amber-light': '#f97316'
      }
    };

    const theme = themes[themeName] || themes['default'];
    Object.keys(theme).forEach(key => {
      root.style.setProperty(key, theme[key]);
    });
  }

  selectProject(id: number | null) {
    this.selectedProjectId.set(id);
    if (id) {
      localStorage.setItem('activeProjectId', String(id));
    } else {
      localStorage.removeItem('activeProjectId');
    }
  }

  fetchAll() {
    this.http.get<any[]>(`${this.url}`).subscribe({
      next: (data) => {
        this.Projects.set(data);
        const pendingTheme = localStorage.getItem('pending_project_theme');
        if (pendingTheme) {
          const unthemed = data.find(p => !localStorage.getItem(`project_theme_${p.id}`));
          if (unthemed) {
            localStorage.setItem(`project_theme_${unthemed.id}`, pendingTheme);
          }
          localStorage.removeItem('pending_project_theme');
        }
      },
      error: (err) => console.error('Failed to fetch projects:', err)
    });
  }

  getById(id: number) {
    return this.http.get<any>(`${this.url}/${id}`);
  }

  create(payload: any) {
    return this.http.post<any>(`${this.url}`, payload);
  }

  update(id: number, payload: any) {
    return this.http.put<any>(`${this.url}/${id}`, payload);
  }

  delete(id: number) {
    return this.http.delete<any>(`${this.url}/${id}`);
  }
}
