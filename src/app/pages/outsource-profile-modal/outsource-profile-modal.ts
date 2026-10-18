import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OutsourceSalesProfileService } from '../../services/outsource-sales-profile.service';

@Component({
  selector: 'app-outsource-profile-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './outsource-profile-modal.html',
  styleUrl: './outsource-profile-modal.css',
})
export class OutsourceProfileModalComponent implements OnInit {
  @Input({ required: true }) userId!: string;
  @Input() userName = '';
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private outsourceService = inject(OutsourceSalesProfileService);

  form!: FormGroup;
  loading = false;
  fetching = true;
  errorMessage = '';

  /** null = لسه مفيش profile لليوزر ده -> هنعمل Create بدل Update */
  private existingProfileId: number | null = null;

  constructor() {
    this.form = this.fb.group({
      companyName: ['', Validators.required],
      location: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.fetching = true;
    this.outsourceService.getByUserId(this.userId).subscribe({
      next: (profile) => {
        this.existingProfileId = profile.id ?? null;
        this.form.patchValue({
          companyName: profile.companyName,
          location: profile.location,
        });
        this.fetching = false;
      },
      error: (error) => {
        // 404 يعني طبيعي: اليوزر ده لسه معملوش بيانات شركة -> فورم فاضي وهنعمل Create
        if (error.status === 404) {
          this.existingProfileId = null;
          this.fetching = false;
        } else {
          this.errorMessage = 'حصل خطأ أثناء تحميل بيانات الشركة';
          this.fetching = false;
        }
      },
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    const { companyName, location } = this.form.value;

    const request$ = this.existingProfileId
      ? this.outsourceService.updateProfile(this.existingProfileId, { companyName, location })
      : this.outsourceService.createProfile({ userId: this.userId, companyName, location });

    request$.subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
      },
      error: (error) => {
        console.error('Error saving outsource profile:', error);
        this.errorMessage = error.error?.message || 'فشل حفظ بيانات الشركة';
        this.loading = false;
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
