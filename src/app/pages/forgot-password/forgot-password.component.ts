import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Step tracking (1 = enter email, 2 = verify OTP, 3 = reset password)
  forgotPasswordStep = 1;

  // Forms
  forgotPasswordForm: FormGroup;
  verifyOtpForm: FormGroup;
  resetPasswordForm: FormGroup;

  // Loading states
  isLoadingForgotPassword = false;

  // Errors
  forgotPasswordError = '';

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParams['email'];
    if (emailParam) {
      this.forgotPasswordForm.patchValue({ email: emailParam });
    }
  }

  sendResetCode(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoadingForgotPassword = true;
      this.forgotPasswordError = '';
      
      const email = this.forgotPasswordForm.value.email;
      
      this.authService.forgotPassword(email).subscribe({
        next: () => {
          this.isLoadingForgotPassword = false;
          // Route to OTP verification page after successful forget password submission
          this.router.navigate(['/verify-otp'], { queryParams: { email } });
        },
        error: (error) => {
          this.isLoadingForgotPassword = false;
          this.forgotPasswordError = error.message || 'Failed to send reset code. Please try again.';
        },
      });
    } else {
      this.markFormGroupTouched(this.forgotPasswordForm);
    }
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getForgotPasswordError(fieldName: string): string {
    const field = this.forgotPasswordForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
    }
    return '';
  }

  currentYear = new Date().getFullYear();
}
