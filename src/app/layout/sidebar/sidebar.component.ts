import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PageToggleService } from '../../services/page-toggle.service.ts';
import { MobileNavService } from '../../services/mobile-nav.service';
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  authService = inject(AuthService);
  pageToggle = inject(PageToggleService);
  mobileNav = inject(MobileNavService);
  openSections = new Set<string>();
  collapsed = false;

  get username(): string {
    return this.authService.getUser()?.username || 'User';
  }

  get userInitial(): string {
    return this.username.trim().charAt(0).toUpperCase() || 'U';
  }

  get userRole(): string {
    return this.authService.getUser()?.roles?.[0] || 'Operations user';
  }

  toggleSection(section: string): void {
    const wasOpen = this.openSections.has(section);
    const nextOpenSections = new Set(this.openSections);
    if (wasOpen) {
      nextOpenSections.delete(section);
      if (section === 'warehouses') {
        nextOpenSections.delete('procurement');
        nextOpenSections.delete('inventory');
        nextOpenSections.delete('inventoryReturns');
      }
      if (section === 'inventory') {
        nextOpenSections.delete('inventoryReturns');
      }
      if (section === 'technical') {
        nextOpenSections.delete('technicalReturns');
      }
    } else {
      nextOpenSections.add(section);
    }
    this.openSections = nextOpenSections;

    if (!wasOpen) {
      setTimeout(() => {
        const buttonEl = document.querySelector(`[data-section="${section}"]`);
        buttonEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

  isSectionOpen(section: string): boolean {
    return this.openSections.has(section);
  }

  onNavigationClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).closest('a')) this.mobileNav.close();
  }
  // Master Data
  get canSeeAssets() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeDeliveryHistory() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeSuppliers() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeRawMaterials() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeFinishedProducts() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician']);
  }
  get canSeeReturnedSemiFinished() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician']);
  }
  get canSeeMasterData() {
    return (
      this.canSeeAssets ||
      this.canSeeSuppliers ||
      this.canSeeRawMaterials ||
      this.canSeeFinishedProducts ||
      this.canSeeReturnedSemiFinished
    );
  }
  get canSeeAuditLogs() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get canSeeFgBalanceInit() {
    const hasRole = this.authService.hasAnyRole(['CEO', 'Admin', 'Accountant']);
    const isCeo = this.authService.hasAnyRole(['CEO']);
    if (this.pageToggle.fgBalanceInitDisabled() && !isCeo) return false;
    return hasRole;
  }
  get canSeeSemiFinishedBalanceInit() {
    const hasRole = this.authService.hasAnyRole(['CEO', 'Admin', 'Accountant']);
    const isCeo = this.authService.hasAnyRole(['CEO']);
    if (this.pageToggle.semiFinishedBalanceInitDisabled() && !isCeo) return false;
    return hasRole;
  }
  // Transactions
  get canSeeExpenses() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeCheckRequests() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Admin']);
  }
  get canSeeTransactions() {
    return this.canSeeExpenses || this.canSeeCheckRequests;
  }
  get canSeeSemiFinished() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician']);
  }
  // Accounting (بدون Check Requests دلوقتي)
  get canSeeAccounting() {
    return this.canSeeBankAccounts || this.canSeeJournalEntries;
  }

  get canSeeBankAccounts() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Admin']);
  }

  get canSeeJournalEntries() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Admin']);
  }
  // Procurement
  get canSeePurchaseOrders() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeGoodsReceipt() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeAssetPurchaseOrders() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeAssetReceipt() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeProcurement() {
    return (
      this.canSeePurchaseOrders ||
      this.canSeeGoodsReceipt ||
      this.canSeeAssetPurchaseOrders ||
      this.canSeeAssetReceipt
    );
  }

  // Production
  get canSeeProductionOrders() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeBomConsume() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer']);
  }
  get canSeeProduction() {
    return this.canSeeProductionOrders || this.canSeeBomConsume;
  }

  // Inventory
  get canSeeRawWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeThirdWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician']);
  }
  get canSeeFgWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeReturnWH() {
    return this.authService.hasAnyRole(['CEO', 'Engineer', 'Accountant', 'Admin']);
  }
  get canSeeAssetWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }

  get canSeeBalanceInit() {
    const hasRole = this.authService.hasAnyRole(['CEO', 'Admin', 'Accountant']);
    const isCeo = this.authService.hasAnyRole(['CEO']);
    if (this.pageToggle.balanceInitDisabled() && !isCeo) return false;
    return hasRole;
  }
  get canSeeSerials() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeMobileWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  get canSeeSpareWH() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }
  // Inventory
  get canSeeWarehouseDelivery() {
    return this.authService.hasAnyRole(['CEO', 'Admin']);
  }

  get canSeeInventory() {
    return (
      this.canSeeRawWH ||
      this.canSeeThirdWH ||
      this.canSeeFgWH ||
      this.canSeeReturnWH ||
      this.canSeeAssetWH ||
      this.canSeeBalanceInit ||
      this.canSeeSerials ||
      this.canSeeMobileWH ||
      this.canSeeSpareWH ||
      this.canSeeWarehouseDelivery ||
      this.canSeeDeliveryHistory
    );
  }

  get canSeeGeneralInventory() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }

  // Projects
  get canSeeProjects() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin']);
  }

  get canSeeCustomers() {
    return this.authService.hasAnyRole(['CEO', 'Sales', 'CCO', 'legal Reviewer', 'Engineer']);
  }

  get canSeeSalesActivities() {
    return this.authService.hasAnyRole(['CEO', 'Sales']);
  }

  get canSeeTasks() {
    return this.authService.hasAnyRole([
      'CEO', 'Sales', 'CCO', 'Accountant', 'Engineer', 'Technician', 'Admin', 'legal Reviewer',
    ]);
  }

  // Temporary preview count; replace with the role-scoped approvals API when available.
  get pendingTasksCount(): number { return 4; }

  // Admin
  get canSeeUserManagement() {
    return this.authService.hasAnyRole(['CEO']);
  }
  get canSeeAccountStatement() {
    return this.authService.hasAnyRole(['CEO', 'Accountant']);
  }
  get canSeeChecksReport() {
    return this.authService.hasAnyRole(['CEO', 'Accountant']);
  }

  // Reports

  get canSeeGoodsReceiptsReport() {
    return this.authService.hasAnyRole(['CEO', 'Accountant', 'Engineer', 'Admin']);
  }
  get canSeeReports() {
    return (
      this.canSeeAccountStatement ||
      this.canSeeChecksReport ||
      this.canSeeExpenses ||
      this.canSeeGoodsReceiptsReport
    );
  }
}
