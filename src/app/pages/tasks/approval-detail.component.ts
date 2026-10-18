import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-approval-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './approval-detail.component.html',
  styleUrl: './approval-detail.component.css',
})
export class ApprovalDetailComponent {
  private readonly route = inject(ActivatedRoute);
  readonly ref = this.route.snapshot.paramMap.get('ref') || 'CT-0121';
  readonly readOnly = this.route.snapshot.data['mode'] === 'history';
  rejectOpen = false;
  confirmOpen = false;
  decision: 'Approved' | 'Rejected' | null = null;
  rejectionReason = '';
  approve(): void { this.confirmOpen = true; }
  confirmApproval(): void { this.decision = 'Approved'; this.confirmOpen = false; }
  openReject(): void { this.rejectOpen = true; }
  confirmRejection(): void { if (!this.rejectionReason.trim()) return; this.decision = 'Rejected'; this.rejectOpen = false; }
}
