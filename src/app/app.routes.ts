import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AssetsComponent } from './pages/assets/assets.component';
import { SuppliersComponent } from './pages/suppliers/suppliers.component';
import { RawMaterialsComponent } from './pages/raw-materials/raw-materials.component';
import { FinishedProductsComponent } from './pages/finished-products/finished-products.component';
import { PurchaseOrdersComponent } from './pages/purchase-orders/purchase-orders.component';
import { GoodsReceiptComponent } from './pages/goods-receipt/goods-receipt.component';
import { AssetPurchaseOrdersComponent } from './pages/asset-purchase-orders/asset-purchase-orders.component';
import { AssetReceiptComponent } from './pages/asset-receipt/asset-receipt.component';
import { ProductionOrdersComponent } from './pages/production-orders/production-orders.component';
import { BomConsumeComponent } from './pages/bom-consume/bom-consume.component';
import { RawWarehouseComponent } from './pages/raw-warehouse/raw-warehouse.component';
import { FgWarehouseComponent } from './pages/fg-warehouse/fg-warehouse.component';
import { ThirdWarehouseComponent } from './pages/third-warehouse/third-warehouse.component';
import { BalanceInitializeComponent } from './pages/balance-initialize/balance-initialize.component';
import { SerialsComponent } from './pages/serials/serials.component';
import { ProjectsComponent } from './pages/projects/projects.component';
import { UserManagementComponent } from './pages/user-management/user-management.component';
import { LoginComponent } from './pages/login/login.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';
import { VerifyOtpComponent } from './pages/verify-otp/verify-otp.component';
import { authGuard } from './guards/auth.guard';
import { ReturnWarehouseComponent } from './pages/return-warehouse/return-warehouse.component';
import { ReturnedSemiFinishedComponent } from './pages/returned-semi-finished-component/returned-semi-finished-component';
import { AssetWarehouseComponent } from './pages/asset-warehouse/asset-warehouse.component';
import { MobileWarehouseComponent } from './pages/mobile-warehouse/mobile-warehouse.component';
import { SpareWarehouseComponent } from './pages/spare-warehouse/spare-warehouse.component';
import { BankAccountsComponent } from './pages/bank-accounts/bank-accounts';
import { JournalEntriesPage } from './pages/journal-entries-page/journal-entries-page';
import { CheckRequests } from './pages/check-requests/check-requests';
import { Expenses } from './pages/expenses/expenses';
import { SemiFinishedProductsComponent } from './pages/semi-finished-products/semi-finished-products';
import { FgBalanceInitComponent } from './pages/fg-balance-init.component.ts/fg-balance-init.component.ts';
import { AccountStatement } from './pages/account-statement/account-statement';

import { SemiFinishedBalanceInitComponent } from './pages/semi-finished-balance-init.component.ts/semi-finished-balance-init.component.ts';
import { ChecksReportComponent } from './pages/checks-report/checks-report';

import { ExpenseDashboardComponent } from './pages/expense-dashboard/expense-dashboard';
import { GoodsReceiptsReportComponent } from './pages/goods-receipts-report.component/goods-receipts-report.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { SalesActivitiesComponent } from './pages/sales-activities/sales-activities.component';
import { WarehouseDeliveryComponent } from './pages/warehouse-delivery/warehouse-delivery.component';
import { DeliveryHistoryComponent } from './pages/delivery-history/delivery-history.component';
import { AuditLogs } from './pages/audit-logs/audit-logs';
import { GeneralInventoryComponent } from './pages/general-inventory/general-inventory.component';
import { StockComponent } from './pages/stock/stock.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { ApprovalDetailComponent } from './pages/tasks/approval-detail.component';
export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-otp', component: VerifyOtpComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'pending-approvals', component: TasksComponent, canActivate: [authGuard], data: { mode: 'pending' } },
  { path: 'approval-history', component: TasksComponent, canActivate: [authGuard], data: { mode: 'history' } },
  { path: 'pending-approvals/:ref', component: ApprovalDetailComponent, canActivate: [authGuard], data: { mode: 'pending' } },
  { path: 'approval-history/:ref', component: ApprovalDetailComponent, canActivate: [authGuard], data: { mode: 'history' } },

  {
    path: 'customers',
    component: CustomersComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Sales', 'CCO', 'legal Reviewer', 'Engineer'] },
  },
  {
    path: 'delivery-history',
    component: DeliveryHistoryComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Engineer', 'Admin'] },
  },
  {
    path: 'warehouse-delivery',
    component: WarehouseDeliveryComponent,
    canActivate: [authGuard],
    data: { roles: ['Admin', 'CEO'] },
  },
  {
    path: 'sales-activities',
    component: SalesActivitiesComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Sales'] },
  },

  {
    path: 'assets',
    component: AssetsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'suppliers',
    component: SuppliersComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'materials',
    component: RawMaterialsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'products',
    component: FinishedProductsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician'] },
  },
  {
    path: 'po',
    component: PurchaseOrdersComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'receive',
    component: GoodsReceiptComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'asset-po',
    component: AssetPurchaseOrdersComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'asset-receive',
    component: AssetReceiptComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'prodorders',
    component: ProductionOrdersComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'consume',
    component: BomConsumeComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer'] },
  },
  {
    path: 'rawwh',
    component: RawWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'stock',
    component: StockComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'general-inventory',
    component: GeneralInventoryComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'thirdwh',
    component: ThirdWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician'] },
  },
  {
    path: 'balance-init',
    component: BalanceInitializeComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Admin', 'Accountant'] },
  },
  {
    path: 'fgwh',
    component: FgWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'serials',
    component: SerialsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'projects',
    component: ProjectsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'returnwh',
    component: ReturnWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Engineer', 'Accountant', 'Admin'] },
  },
  {
    path: 'work-center',
    component: ReturnWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Engineer', 'Accountant', 'Admin'] },
  },
  {
    path: 'assetwh',
    component: AssetWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'mobilewh',
    component: MobileWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'sparewh',
    component: SpareWarehouseComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Technician', 'Admin'] },
  },
  {
    path: 'bank-accounts',
    component: BankAccountsComponent,
    canActivate: [authGuard],
    data: {
      roles: ['CEO', 'Accountant'],
    },
  },
  {
    path: 'journal-entries',
    component: JournalEntriesPage,
    canActivate: [authGuard],
    data: {
      roles: ['CEO', 'Accountant'],
    },
  },
  {
    path: 'check-requests',
    component: CheckRequests,
    canActivate: [authGuard],
    data: {
      roles: ['CEO', 'Accountant'],
    },
  },
  {
    path: 'expenses',
    component: Expenses,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant'] },
  },
  {
    path: 'semi-finished',
    component: SemiFinishedProductsComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician'] },
  },
  {
    path: 'returns-operations',
    component: ReturnedSemiFinishedComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin', 'Technician'] },
  },
  {
    path: 'returned-semi-finished',
    redirectTo: 'returns-operations',
    pathMatch: 'full',
  },
  {
    path: 'fg-balance-init',
    component: FgBalanceInitComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Admin', 'Accountant'] },
  },
  {
    path: 'semi-finished-balance-init',
    component: SemiFinishedBalanceInitComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Admin', 'Accountant'] },
  },
  {
    path: 'account-statement',
    component: AccountStatement,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant'] },
  },
  {
    path: 'checks-report',
    component: ChecksReportComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant'] },
  },
  {
    path: 'expenses-dashboard',
    component: ExpenseDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant'] },
  },
  {
    path: 'goods-receipts-report',
    component: GoodsReceiptsReportComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO', 'Accountant', 'Engineer', 'Admin'] },
  },
  {
    path: 'user-management',
    component: UserManagementComponent,
    canActivate: [authGuard],
    data: { roles: ['CEO'] },
  },
  {
    path: 'audit-logs',
    component: AuditLogs,
    canActivate: [authGuard],
    data: { roles: ['CEO'] },
  },
];
