import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword?.errors?.['passwordMismatch']) {
        delete confirmPassword.errors['passwordMismatch'];
        confirmPassword.updateValueAndValidity();
      }
    }
    return null;
  };
}

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css'],
})
export class VerifyOtpComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Forms
  public verifyOtpForm: FormGroup;
  public resetPasswordForm: FormGroup;

  // State
  public email = '';
  public step = 1; // 1: Enter OTP, 2: Reset Password

  // Loading states
  public isLoadingVerifyOtp = false;
  public isLoadingResetPassword = false;
  public isLoadingResendOtp = false;

  // Errors
  public otpError = '';
  public resetPasswordError = '';

  // Success states
  public passwordResetSuccess = false;

  // Resend Timer
  public resendTimer = 0;
  private timerSubscription: Subscription | null = null;

  constructor() {
    this.verifyOtpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
    });

    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: passwordMatchValidator() });
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParams['email'];
    if (!emailParam) {
      // Redirect back to forgot-password if email is missing
      this.router.navigate(['/forgot-password']);
      return;
    }

    this.email = emailParam;
    this.startResendTimer();
  }

  public verifyOtp(): void {
    if (this.verifyOtpForm.valid) {
      this.isLoadingVerifyOtp = true;
      this.otpError = '';
      
      const otpData = {
        email: this.email,
        otp: this.verifyOtpForm.value.otp,
      };
      
      this.authService.validateOtp(otpData).subscribe({
        next: () => {
          this.isLoadingVerifyOtp = false;
          // OTP verified -> navigate to reset-password page
          this.router.navigate(['/reset-password'], { queryParams: { email: this.email } });
        },
        error: (error) => {
          this.isLoadingVerifyOtp = false;
          this.otpError = error.message || 'Invalid verification code. Please try again.';
        },
      });
    } else {
      this.markFormGroupTouched(this.verifyOtpForm);
    }
  }

  public resetPassword(): void {
    if (this.resetPasswordForm.valid) {
      this.isLoadingResetPassword = true;
      this.resetPasswordError = '';
      
      const resetData = {
        email: this.email,
        otp: this.verifyOtpForm.value.otp,
        newPassword: this.resetPasswordForm.value.newPassword,
      };
      
      this.authService.resetPassword(resetData).subscribe({
        next: () => {
          this.isLoadingResetPassword = false;
          this.passwordResetSuccess = true;
          
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.isLoadingResetPassword = false;
          this.resetPasswordError = error.message || 'Failed to reset password. Please try again.';
        },
      });
    } else {
      this.markFormGroupTouched(this.resetPasswordForm);
    }
  }

  public resendOtp(): void {
    if (this.resendTimer === 0 && this.email) {
      this.isLoadingResendOtp = true;
      this.otpError = '';
      
      this.authService.forgotPassword(this.email).subscribe({
        next: () => {
          this.isLoadingResendOtp = false;
          this.startResendTimer();
        },
        error: (error) => {
          this.isLoadingResendOtp = false;
          this.otpError = error.message || 'Failed to resend code. Please try again.';
        },
      });
    }
  }

  private startResendTimer(): void {
    this.resendTimer = 60;
    
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    
    this.timerSubscription = interval(1000).subscribe(() => {
      if (this.resendTimer > 0) {
        this.resendTimer--;
      } else {
        this.timerSubscription?.unsubscribe();
      }
    });
  }

  public backToForgotPassword(): void {
    this.router.navigate(['/forgot-password'], { queryParams: { email: this.email } });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getOtpError(fieldName: string): string {
    return this.getError(this.verifyOtpForm, fieldName);
  }

  getResetPasswordError(fieldName: string): string {
    const field = this.resetPasswordForm.get(fieldName);
    
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName === 'newPassword' ? 'Password' : 'Confirm password'} is required`;
      }
      if (field.errors['minlength']) {
        return `Password must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['passwordMismatch'] && fieldName === 'confirmPassword') {
        return 'Passwords do not match';
      }
    }
    return '';
  }

  private getError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
      }
      if (field.errors['minlength']) {
        return `Code must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength'] && fieldName === 'otp') {
        return 'Code must be exactly 6 digits';
      }
    }
    return '';
  }

  currentYear = new Date().getFullYear();

  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
}
