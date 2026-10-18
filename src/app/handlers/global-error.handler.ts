import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ApiResponseError, getErrorMessage } from '../interceptors/api-error.interceptor';
import { ToastService } from '../services/toast.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(error: unknown): void {
    // HTTP errors are already displayed by apiErrorInterceptor.
    if (!(error instanceof HttpErrorResponse || error instanceof ApiResponseError)) {
      this.toast.show(getErrorMessage(error));
    }
    console.error('Unhandled application error:', error);
  }
}
