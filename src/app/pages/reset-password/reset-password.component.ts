import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

export function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('newPassword');
    const confirm = control.get('confirmPassword');
    if (password && confirm && password.value !== confirm.value) {
      confirm.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  public router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  public form: FormGroup;
  public email = '';
  public loading = false;
  public error = '';
  public currentYear = new Date().getFullYear();

  constructor() {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: passwordMatchValidator() });
  }

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParams['email'];
    if (!emailParam) {
      this.router.navigate(['/forgot-password']);
      return;
    }
    this.email = emailParam;
  }

  public submit(): void {
    if (this.form.invalid) {
      this.markTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    const payload = { email: this.email, newPassword: this.form.value.newPassword };
    this.auth.resetPassword(payload).subscribe({
      next: () => {
        this.loading = false;
        this.toast.show('Password reset successfully. Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'Failed to reset password.';
      }
    });
  }

  private markTouched() {
    Object.keys(this.form.controls).forEach(k => this.form.get(k)?.markAsTouched());
  }
}
