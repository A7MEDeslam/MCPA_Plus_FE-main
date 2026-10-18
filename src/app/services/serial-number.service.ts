import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SerialNumberService {
  private http = inject(HttpClient);
  url = environment.apiUrl + '/SerialNumbers';

  Serials = signal<any[]>([]);
  isLoading = signal(false);

  constructor() {
    this.fetchAll();
  }

  fetchAll() {
    this.http.get<any[]>(`${this.url}`).subscribe({
      next: (data) => this.Serials.set(data),
      error: (err) => console.error('Failed to fetch serial numbers:', err)
    });
  }

  fetchByWorkOrder(workOrderId: number) {
    if (!workOrderId) {
      this.Serials.set([]);
      return;
    }

    this.http.get<any[]>(`${this.url}/work-order/${workOrderId}`).subscribe({
      next: (data) => this.Serials.set(data),
      error: (err) => {
        console.error('Failed to fetch serials for work order:', err);
        this.Serials.set([]);
      }
    });
  }

  fetchByFinishedProduct(finishedProductId: number) {
    if (!finishedProductId) {
      this.Serials.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.http.get<any[]>(`${this.url}/finished-product/${finishedProductId}`).pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (data) => this.Serials.set(data),
      error: (err) => {
        console.error('Failed to fetch serials for finished product:', err);
        this.Serials.set([]);
      }
    });
  }

  fetchByProject(projectId: number) {
    if (!projectId) {
      this.Serials.set([]);
      return;
    }

    this.http.get<any[]>(`${this.url}/project/${projectId}`).subscribe({
      next: (data) => this.Serials.set(data),
      error: () => {
        this.http.get<any[]>(`${this.url}`).subscribe({
          next: (data) => this.Serials.set(data.filter(s => s.projectId === projectId)),
          error: (err) => {
            console.error('Failed to fetch serials for project:', err);
            this.Serials.set([]);
          }
        });
      }
    });
  }

  fetchBySerial(serial: string) {
    return this.http.get<any>(`${this.url}/${encodeURIComponent(serial)}`);
  }

  assignToProject(serialNumberId: number, projectId: number) {
    return this.http.put<any>(`${this.url}/${serialNumberId}/assign-project`, { projectId });
  }
}
