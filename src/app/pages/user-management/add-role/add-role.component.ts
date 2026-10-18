import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { UserManagementService } from '../service/user-management.service';

@Component({
  selector: 'app-add-role',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-role.component.html',
  styleUrl: './add-role.component.css',
})
export class AddRoleComponent implements OnInit {
  @Output() roleAdded = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private userService = inject(UserManagementService);

  form!: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  private readonly roleNameRegex = /^[A-Za-z\u0600-\u06FF]+(?:[\s_-][A-Za-z\u0600-\u06FF]+)*$/;
  availableClaims: { id: string; name: string; value: string; type: string }[] = [
    { id: 'ManageRoles', name: 'Manage Roles', value: 'ManageRoles', type: 'Permission' },
    {
      id: 'HasAccessToEverything',
      name: 'Has Access To Everything',
      value: 'HasAccessToEverything',
      type: 'Permission',
    },
    {
      id: 'HasAccessToAreaOne',
      name: 'Has Access To Area One',
      value: 'HasAccessToAreaOne',
      type: 'Permission',
    },
    {
      id: 'HasAccessToAreaTwo',
      name: 'Has Access To Area Two',
      value: 'HasAccessToAreaTwo',
      type: 'Permission',
    },
    { id: 'ViewReports', name: 'View Reports', value: 'ViewReports', type: 'Permission' },
    { id: 'ViewLogs', name: 'View Logs', value: 'ViewLogs', type: 'Permission' },
  ];

  constructor() {
    this.form = this.fb.group({
      roleName: ['', [Validators.required, Validators.pattern(this.roleNameRegex)]],
      selectedClaims: this.fb.array([]),
    });
  }
  onRoleNameInput(event: Event) {
    const el = event.target as HTMLInputElement;

    const cleaned = el.value
      .replace(/[^A-Za-z\u0600-\u06FF\s_-]/g, '') 
    if (el.value !== cleaned) {
      el.value = cleaned;
      this.form.get('roleName')?.setValue(cleaned);
    }
  }
  ngOnInit(): void {
    this.loadSystemClaims();
  }

  get selectedClaimsFormArray() {
    return this.form.get('selectedClaims') as FormArray;
  }

  loadSystemClaims() {
    this.userService.getAllClaims().subscribe({
      next: (response: any) => {
        // If claims are found on the server, we can merge or use them
        if (response && response.status === 'Success' && Array.isArray(response.data)) {
          const claims = response.data.map((c: any) => ({
            id: c.id?.toString() || c.claimName,
            name: c.claimName.replace(/([A-Z])/g, ' $1').trim(), // Format camelCase to readable title
            value: c.claimName,
            type: 'Permission',
          }));
          if (claims.length > 0) {
            this.availableClaims = claims;
          }
        }
        this.buildClaimsCheckboxes();
      },
      error: (err) => {
        console.warn('Failed to load system claims, using default claims list.', err);
        this.buildClaimsCheckboxes();
      },
    });
  }

  buildClaimsCheckboxes() {
    // Clear existing controls
    while (this.selectedClaimsFormArray.length !== 0) {
      this.selectedClaimsFormArray.removeAt(0);
    }
    // Add a form control for each claim (initially false/unchecked)
    this.availableClaims.forEach(() => {
      this.selectedClaimsFormArray.push(new FormControl(false));
    });
  }

  onSubmit() {
    if (this.form.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formValue = this.form.value;

      // Get selected claims based on indices
      const selectedClaims = this.availableClaims
        .filter((_, index) => formValue.selectedClaims[index])
        .map((claim) => ({
          type: claim.type,
          value: claim.value,
        }));

    const roleData = {
      roleName: (formValue.roleName as string).trim(),
      claims: selectedClaims,
    };

      this.userService.addRole(roleData).subscribe({
        next: () => {
          this.successMessage = 'Role created successfully!';
          this.roleAdded.emit();
          this.form.patchValue({ roleName: '' });
          this.buildClaimsCheckboxes(); // Reset check boxes
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding role:', error);
          this.errorMessage =
            error.error?.message || 'Failed to add role. Role name may already exist.';
          this.loading = false;
        },
      });
    } else {
      this.form.get('roleName')?.markAsTouched();
    }
  }

  close() {
    this.closed.emit();
  }
}
