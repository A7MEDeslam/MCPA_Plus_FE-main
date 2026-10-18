import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterDataService } from '../../services/master-data.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { useDynamicPagination } from '../../utils/pagination-helper';
import { PaginationComponent } from '../../layout/pagination/pagination.component';
import { finalize } from 'rxjs';
@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.css',
})
export class SuppliersComponent {
  masterData = inject(MasterDataService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  get canCreateSupplier() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Admin']);
  }
  get canDeleteSupplier() {
    return this.authService.hasAnyRole(['CEO']);
  }
  pagination = useDynamicPagination();

  pagedSuppliers = computed(() => {
    const data = this.masterData.SUPPLIERS();
    const page = this.pagination.currentPage();
    const size = this.pagination.pageSize();
    return data.slice((page - 1) * size, page * size);
  });

  modalOpen = false;
  form = { name: '', phone: '', email: '', address: '', taxNumber: '' };

  errors: Record<string, string> = {};

  deleteOpen = false;
  supplierToDelete: any = null;
  isDeleting = false;

  openDelete(s: any) {
    this.supplierToDelete = s;
    this.deleteOpen = true;
  }

  closeDelete() {
    if (this.isDeleting) return;
    this.deleteOpen = false;
    this.supplierToDelete = null;
  }

  confirmDelete() {
    if (!this.supplierToDelete || this.isDeleting) return;
    this.isDeleting = true;

    this.masterData
      .deleteSupplier(this.supplierToDelete.id)
      .pipe(finalize(() => (this.isDeleting = false)))
      .subscribe({
        next: () => {
          this.toastService.show('Supplier deleted.');
          this.deleteOpen = false;
          this.supplierToDelete = null;
        },
        error: (err) => {
          console.error('Failed to delete supplier', err);
          this.toastService.show(err?.error?.message || 'Failed to delete supplier');
        },
      });
  }

  // Name: letters, numbers, spaces only, at least one letter
  private validateName(): void {
    const name = (this.form.name ?? '').trim();
    delete this.errors['name'];
    if (!name) this.errors['name'] = 'Supplier name is required';
    else if (!/\p{L}/u.test(name)) this.errors['name'] = 'Name must include at least one letter';
    else if (!/^[\p{L}\p{N} ]{2,100}$/u.test(name))
      this.errors['name'] =
        'Name can contain only letters, numbers, and spaces (2 to 100 characters)';
  }

  // Phone: Egyptian mobile, optional +20 prefix (optional field)
  private validatePhone(): void {
    const phone = (this.form.phone ?? '').trim();
    delete this.errors['phone'];
    if (phone && !/^(\+20|0)1[0125][0-9]{8}$/.test(phone)) {
      this.errors['phone'] = 'Enter a valid mobile number (e.g. 01012345678 or +201012345678)';
    }
  }

  onNameInput(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^\p{L}\p{N} ]/gu, '');
    this.form.name = input.value;
    this.validateName();
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // digits only, with a single + allowed at the start
    let v = input.value.replace(/[^\d+]/g, '');
    v = (v.startsWith('+') ? '+' : '') + v.replace(/\+/g, '');
    input.value = v;
    this.form.phone = v;
    this.validatePhone();
  }

  closeModal() {
    this.modalOpen = false;
    this.errors = {};
  }

  closeModalIfOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  saveSupplier() {
    this.validateName();
    this.validatePhone();
    if (Object.keys(this.errors).length) return;

    this.masterData.addSupplier({
      ...this.form,
      name: this.form.name.trim(),
      phone: this.form.phone.trim(),
    });
    this.closeModal();
    this.form = { name: '', phone: '', email: '', address: '', taxNumber: '' };
    this.toastService.show('Supplier added successfully!');
    this.pagination.resetPage();
  }

  // deleteSupplier(s: any) {
  //   if (!confirm(`Delete supplier "${s.name}"? This cannot be undone.`)) return;
  //   this.masterData.deleteSupplier(s.id).subscribe({
  //     next: () => this.toastService.show('Supplier deleted.'),
  //     error: (err) => {
  //       console.error('Failed to delete supplier', err);
  //       this.toastService.show(err?.error?.message || 'Failed to delete supplier');
  //     },
  //   });
  // }
}
