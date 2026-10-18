import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css',
})
export class TasksComponent {
  private readonly route = inject(ActivatedRoute);
  readonly mode = this.route.snapshot.data['mode'] as 'pending' | 'history';
  readonly isPending = this.mode === 'pending';

  readonly pendingApprovals = [
    { type: 'Contract Approval', ref: 'CT-0121', title: 'Cairo Smart Facilities', detail: 'IoT Monitoring · 80 units', requestedBy: 'Mariam Hassan · Sales', created: 'Today, 11:20 AM', timer: '5h 33m left', urgency: 'normal' },
    { type: 'Purchase Request', ref: 'PR-1024', title: 'Copper wire', detail: '500 KG', requestedBy: 'Ahmed Ali', created: 'Today, 10:30 AM', timer: '3h 51m left', urgency: 'normal' },
    { type: 'Work Order', ref: 'WO-0187', title: 'Power Quality Beacon', detail: '40 units', requestedBy: 'Production Team', created: 'Yesterday, 03:20 PM', timer: '0h 15m left', urgency: 'warning' },
    { type: 'Return / Scrap Request', ref: 'RT-0041', title: 'PLC Breaker', detail: 'SN-PL-2248', requestedBy: 'Warehouse Team', created: 'Oct 12, 09:15 AM', timer: 'Overdue by 1d 1h', urgency: 'overdue' },
  ];

  readonly approvalHistory = [
    { type: 'Contract Approval', ref: 'CT-0113', title: 'Delta Technology', detail: 'IoT Monitoring · 50 units', decidedBy: 'Ahmed Khaled', date: 'Yesterday, 02:40 PM', time: '1h 22m', result: 'Approved' },
    { type: 'Purchase Request', ref: 'PR-1016', title: 'Industrial connectors', detail: 'Returned for revised supplier quotation', decidedBy: 'Finance Manager', date: 'Oct 11, 04:15 PM', time: '3h 48m', result: 'Rejected' },
    { type: 'Work Order', ref: 'WO-0175', title: 'Beacon assembly', detail: 'Approved for production · Contract CT-0098', decidedBy: 'Production Manager', date: 'Oct 10, 10:00 AM', time: '56m', result: 'Approved' },
  ];
}
