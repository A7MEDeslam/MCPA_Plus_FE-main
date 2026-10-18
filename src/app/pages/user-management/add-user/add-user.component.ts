import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { UserManagementService } from '../service/user-management.service';
import { OutsourceSalesProfileService } from '../../../services/outsource-sales-profile.service';

// ───────── Custom validators ─────────

/** Starts with a letter, then English letters / digits / _ . (3 to 30 chars) */
const usernameRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  if (!v) return null;
  return /^[A-Za-z][A-Za-z0-9_.]{2,29}$/.test(v) ? null : { username: true };
};

/** Valid email, no spaces */
const emailRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  if (!v) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : { emailFormat: true };
};

/** Egyptian mobile: 010/011/012/015 + 8 digits, optional +20 prefix */
const egyptPhoneRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  if (!v) return null;
  return /^(\+20|0)1[0125][0-9]{8}$/.test(v) ? null : { phone: true };
};

/** At least one letter and one digit, no spaces */
const passwordRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '');
  if (!v) return null;
  if (/\s/.test(v)) return { passwordSpaces: true };
  return /(?=.*[A-Za-z])(?=.*\d)/.test(v) ? null : { passwordStrength: true };
};

/** Letters, numbers and spaces, at least one letter */
const companyRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  return /^(?=.*\p{L})[\p{L}\p{N} ]{2,100}$/u.test(v) ? null : { company: true };
};

/** Letters, numbers, spaces and , - ; at least one letter */
const locationRule: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  if (!v) return null;
  return /^(?=.*\p{L})[\p{L}\p{N} ,\-]{2,100}$/u.test(v) ? null : { location: true };
};

type SanitizeKind = 'username' | 'email' | 'phone' | 'password' | 'company' | 'location';

@Component({
  selector: 'app-add-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.css',
})
export class AddUserComponent implements OnInit {
  @Output() userAdded = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private userService = inject(UserManagementService);
  private outsourceService = inject(OutsourceSalesProfileService);

  form!: FormGroup;
  availableRoles: any[] = [];
  loading = false;
  errorMessage = '';

  private readonly OUTSOURCE_ROLE_KEYWORD = 'outsource';

  constructor() {
    this.form = this.fb.group({
      username: ['', [Validators.required, usernameRule]],
      email: ['', [Validators.required, Validators.maxLength(100), emailRule]],
      phoneNumber: ['', [Validators.required, egyptPhoneRule]],
      password: [
        '',
        [Validators.required, Validators.minLength(6), Validators.maxLength(50), passwordRule],
      ],
      roleName: ['', Validators.required],
      companyName: [''],
      location: [''],
    });
  }

  ngOnInit(): void {
    this.loadRoles();

    this.form.get('roleName')?.valueChanges.subscribe((role) => {
      const companyCtrl = this.form.get('companyName');
      const locationCtrl = this.form.get('location');

      if (this.isOutsourceRole(role)) {
        companyCtrl?.setValidators([Validators.required, Validators.maxLength(100), companyRule]);
        locationCtrl?.setValidators([Validators.required, Validators.maxLength(100), locationRule]);
      } else {
        companyCtrl?.clearValidators();
        locationCtrl?.clearValidators();
        companyCtrl?.setValue('');
        locationCtrl?.setValue('');
      }
      companyCtrl?.updateValueAndValidity();
      locationCtrl?.updateValueAndValidity();
    });
  }

  // ---------- validation helpers (used by the template) ----------

  /** Error message shown once the field is touched or typed in */
  err(field: string): string {
    const c = this.form.get(field);
    if (!c || !c.errors || !(c.touched || c.dirty)) return '';

    const e = c.errors;
    if (e['required']) return 'This field is required';
    if (e['username'])
      return 'Start with a letter; English letters, numbers, _ and . only (3 to 30 characters)';
    if (e['emailFormat']) return 'Please enter a valid email (e.g. name@mail.com)';
    if (e['phone']) return 'Enter a valid Egyptian mobile (e.g. 01012345678 or +201012345678)';
    if (e['passwordSpaces']) return 'Password cannot contain spaces';
    if (e['passwordStrength']) return 'Password must include at least one letter and one number';
    if (e['company'])
      return 'Letters and numbers only, with at least one letter (2 to 100 characters)';
    if (e['location'])
      return 'Letters, numbers, spaces, comma and dash only, with at least one letter';
    if (e['minlength']) return `Minimum ${e['minlength'].requiredLength} characters`;
    if (e['maxlength']) return `Maximum ${e['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }

  /** Cleans wrong characters while typing or pasting */
  sanitize(event: Event, field: string, kind: SanitizeKind): void {
    const el = event.target as HTMLInputElement;
    let v = el.value;

    switch (kind) {
      case 'username':
        v = v.replace(/[^A-Za-z0-9_.]/g, '');
        break;
      case 'email':
        v = v.replace(/\s/g, '');
        break;
      case 'phone':
        v = v.replace(/[^\d+]/g, '');
        v = (v.startsWith('+') ? '+' : '') + v.replace(/\+/g, '');
        break;
      case 'password':
        v = v.replace(/\s/g, '');
        break;
      case 'company':
        v = v
          .replace(/[^\p{L}\p{N} ]/gu, '')
          .replace(/^ +/, '')
          .replace(/ {2,}/g, ' ');
        break;
      case 'location':
        v = v
          .replace(/[^\p{L}\p{N} ,\-]/gu, '')
          .replace(/^ +/, '')
          .replace(/ {2,}/g, ' ');
        break;
    }

    el.value = v;
    const ctrl = this.form.get(field);
    ctrl?.setValue(v);
    ctrl?.markAsDirty();
  }

  isOutsourceRole(roleName: string | null | undefined): boolean {
    return !!roleName && roleName.toLowerCase().includes(this.OUTSOURCE_ROLE_KEYWORD);
  }

  loadRoles() {
    this.userService.getAllRoles().subscribe({
      next: (roles) => {
        this.availableRoles = roles.map((role: any) => ({
          id: role.roleName || role.name || role,
          name: role.roleName || role.name || role,
        }));
      },
      error: (err) => {
        console.error('Error loading roles:', err);
      },
    });
  }

  onSubmit() {
    if (this.loading) return;

    if (this.form.valid) {
      this.loading = true;
      this.errorMessage = '';

      const formValue = this.form.value;
      const userData = {
        roleName: formValue.roleName,
        username: formValue.username.trim(),
        email: formValue.email.trim().toLowerCase(),
        phoneNumber: formValue.phoneNumber.trim(),
        password: formValue.password,
      };

      this.userService.addUser(userData).subscribe({
        next: () => {
          if (this.isOutsourceRole(formValue.roleName)) {
            this.createOutsourceProfile(
              userData.email,
              formValue.companyName.trim(),
              formValue.location.trim(),
            );
          } else {
            this.finishSuccess();
          }
        },
        error: (error) => {
          console.error('Error adding user:', error);
          this.errorMessage =
            error.error?.message ||
            'Failed to add user. Please check if username/email already exists and password criteria are met.';
          this.loading = false;
        },
      });
    } else {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }

  private createOutsourceProfile(email: string, companyName: string, location: string) {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        const newUser: any = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (!newUser) {
          this.errorMessage =
            'user is created but there is an error in creating the outsource profile: user not found.';
          this.loading = false;
          return;
        }

        this.outsourceService
          .createProfile({
            userId: newUser.id,
            companyName,
            location,
          })
          .subscribe({
            next: () => this.finishSuccess(),
            error: (error) => {
              console.error('Error creating outsource profile:', error);
              this.errorMessage =
                'user is created but there is an error in creating the outsource profile: ' +
                (error.error?.message || '');
              this.loading = false;
            },
          });
      },
      error: () => {
        this.errorMessage = 'user is created but there is an error in loading the users list.';
        this.loading = false;
      },
    });
  }

  private finishSuccess() {
    this.userAdded.emit();
    this.form.reset({ roleName: '' });
    this.loading = false;
  }

  close() {
    this.closed.emit();
  }
}
