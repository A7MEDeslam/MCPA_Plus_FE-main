import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const requiredRoles = route.data?.['roles'] as string[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, allow access
    }

    if (authService.hasAnyRole(requiredRoles)) {
      return true; // User has at least one of the required roles
    }

    // User is authenticated but doesn't have the required role
    router.navigate(['/dashboard']);
    return false;
  }

  // Redirect to login page with the return url
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
