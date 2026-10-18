import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GeneralInventoryItem,
  GeneralInventoryMovement,
  GeneralInventoryName,
  GeneralInventoryPayload,
  GeneralInventoryService,
} from '../../services/general-inventory.service';

type ItemForm = { generalInventoryNameId: number | null; category: number | null; unit: string; minStockLevel: number | null; description: string };

@Component({
  selector: 'app-general-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './general-inventory.component.html',
  styleUrl: './general-inventory.component.css',
})
export class GeneralInventoryComponent implements OnInit {
  private readonly api = inject(GeneralInventoryService);
  readonly categories = [
    { id: 1, name: 'Spare Parts' },
    { id: 2, name: 'Tools' },
    { id: 3, name: 'Consumables' },
    { id: 4, name: 'Office Supplies' },
    { id: 5, name: 'Safety Equipment' },
    { id: 6, name: 'Other' },
  ];
  readonly items = signal<GeneralInventoryItem[]>([]);
  readonly names = signal<GeneralInventoryName[]>([]);
  readonly lowStockItems = signal<GeneralInventoryItem[]>([]);
  readonly history = signal<GeneralInventoryMovement[]>([]);
  readonly search = signal('');
  readonly activeTab = signal<'all' | 'low'>('all');
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    const source = this.activeTab() === 'low' ? this.lowStockItems() : this.items();
    return source.filter(item => !term || [item.code, item.name, item.categoryName, item.unit].join(' ').toLowerCase().includes(term));
  });
  readonly lowStockCount = computed(() => this.lowStockItems().length);
  readonly totalUnits = computed(() => this.items().reduce((sum, item) => sum + (item.currentStock || 0), 0));

  itemModalOpen = false;
  movementModalOpen = false;
  historyModalOpen = false;
  nameModalOpen = false;
  editingId: number | null = null;
  activeItem: GeneralInventoryItem | null = null;
  movementType: 'receive' | 'issue' = 'receive';
  nameDraft = '';
  itemForm: ItemForm = this.emptyItemForm();
  movementForm = { quantity: null as number | null, notes: '' };

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.api.getAll().subscribe({
      next: rows => { this.items.set(rows ?? []); this.loading.set(false); },
      error: error => { this.errorMessage.set(this.errorText(error, 'Could not load general inventory.')); this.loading.set(false); },
    });
    this.api.getNames().subscribe({
      next: rows => this.names.set(rows ?? []),
      error: error => this.errorMessage.set(this.errorText(error, 'Could not load item names.')),
    });
    this.loadLowStock();
  }

  loadLowStock(): void {
    this.api.getLowStock().subscribe({
      next: rows => this.lowStockItems.set(rows ?? []),
      error: () => this.lowStockItems.set(this.items().filter(item => item.isLowStock)),
    });
  }

  openCreate(): void { this.editingId = null; this.itemForm = this.emptyItemForm(); this.itemModalOpen = true; this.clearMessages(); }

  openEdit(item: GeneralInventoryItem): void {
    const name = this.names().find(value => value.name === item.name);
    this.editingId = item.id;
    this.itemForm = { generalInventoryNameId: name?.id ?? null, category: item.category, unit: item.unit, minStockLevel: item.minStockLevel, description: item.description ?? '' };
    this.itemModalOpen = true;
    this.clearMessages();
  }

  saveItem(): void {
    const form = this.itemForm;
    if (!form.generalInventoryNameId || !form.category || !form.unit.trim() || form.minStockLevel === null || form.minStockLevel < 0) {
      this.errorMessage.set('Enter an item name, category, unit, and a valid minimum stock level.');
      return;
    }
    const payload: GeneralInventoryPayload = {
      generalInventoryNameId: form.generalInventoryNameId,
      category: form.category,
      unit: form.unit.trim(),
      minStockLevel: form.minStockLevel,
      description: form.description.trim(),
    };
    this.loading.set(true);
    const request = this.editingId === null ? this.api.create(payload) : this.api.update(this.editingId, payload);
    request.subscribe({
      next: () => { this.itemModalOpen = false; this.successMessage.set(this.editingId === null ? 'Item added successfully.' : 'Item updated successfully.'); this.loadData(); },
      error: error => { this.errorMessage.set(this.errorText(error, 'Could not save the item.')); this.loading.set(false); },
    });
  }

  deleteItem(item: GeneralInventoryItem): void {
    if (!confirm(`Delete inventory item "${item.name}"?`)) return;
    this.api.delete(item.id).subscribe({
      next: () => { this.successMessage.set('Item deleted successfully.'); this.loadData(); },
      error: error => this.errorMessage.set(this.errorText(error, 'Could not delete the item.')),
    });
  }

  openMovement(item: GeneralInventoryItem, type: 'receive' | 'issue'): void {
    this.activeItem = item;
    this.movementType = type;
    this.movementForm = { quantity: null, notes: '' };
    this.movementModalOpen = true;
    this.clearMessages();
  }

  saveMovement(): void {
    if (!this.activeItem || this.movementForm.quantity === null || this.movementForm.quantity <= 0) {
      this.errorMessage.set('Enter a quantity greater than zero.');
      return;
    }
    const payload = { quantity: this.movementForm.quantity, notes: this.movementForm.notes.trim() };
    const request = this.movementType === 'receive' ? this.api.receive(this.activeItem.id, payload) : this.api.issue(this.activeItem.id, payload);
    this.loading.set(true);
    request.subscribe({
      next: () => { this.movementModalOpen = false; this.successMessage.set(this.movementType === 'receive' ? 'Stock received successfully.' : 'Stock issued successfully.'); this.loadData(); },
      error: error => { this.errorMessage.set(this.errorText(error, 'Could not save the stock movement.')); this.loading.set(false); },
    });
  }

  openHistory(item: GeneralInventoryItem): void {
    this.activeItem = item;
    this.history.set([]);
    this.historyModalOpen = true;
    this.api.getHistory(item.id).subscribe({
      next: rows => this.history.set(rows ?? []),
      error: error => this.errorMessage.set(this.errorText(error, 'Could not load movement history.')),
    });
  }

  openNameManager(): void { this.nameDraft = ''; this.nameModalOpen = true; this.clearMessages(); }

  addName(): void {
    const name = this.nameDraft.trim();
    if (!name) { this.errorMessage.set('Enter an item name.'); return; }
    this.api.createName(name).subscribe({
      next: created => { this.names.update(values => [...values, created]); this.itemForm.generalInventoryNameId = created.id; this.nameModalOpen = false; this.successMessage.set('Item name added successfully.'); },
      error: error => this.errorMessage.set(this.errorText(error, 'Could not add the item name.')),
    });
  }

  private emptyItemForm(): ItemForm { return { generalInventoryNameId: null, category: null, unit: '', minStockLevel: 0, description: '' }; }
  private clearMessages(): void { this.errorMessage.set(''); this.successMessage.set(''); }
  private errorText(error: any, fallback: string): string { return error?.error?.message || error?.error?.title || fallback; }
}
