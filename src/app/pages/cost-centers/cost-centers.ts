import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CostCenterService } from '../../services/cost-centers';

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cost-centers.html',
  styleUrl: './cost-centers.css',
})
export class CostCenters {
  @Output() saved = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  name = '';
  isSaving = false;
  error = '';

  constructor(private service: CostCenterService) {}

  save() {
    if (!this.name.trim()) {
      this.error = 'Name is required';
      return;
    }

    this.isSaving = true;
    this.error = '';

    this.service.create({ name: this.name.trim() }).subscribe({
      next: () => {
        this.isSaving = false;
        this.saved.emit();
      },
      error: (err) => {
        console.error('Create cost center failed:', err);
        this.isSaving = false;
        this.error = 'Saving is failed';
      },
    });
  }
}
