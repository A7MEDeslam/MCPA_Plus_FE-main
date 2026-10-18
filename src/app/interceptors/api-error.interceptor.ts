import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, tap, throwError } from 'rxjs';
import { ApiRequestStateService } from '../services/api-request-state.service';
import { ToastService } from '../services/toast.service';

export class ApiResponseError extends Error {
  constructor(message: string, readonly response: HttpResponse<unknown>) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const requestState = inject(ApiRequestStateService);
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (isMutation) requestState.beginMutation();

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && hasExplicitFailure(event.body)) {
        throw new ApiResponseError(getApiMessage(event.body) || 'The request was not completed.', event);
      }
    }),
    catchError(error => {
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        toast.show(getErrorMessage(error));
      }
      return throwError(() => error);
    }),
    finalize(() => {
      if (isMutation) requestState.endMutation();
    })
  );
};

function hasExplicitFailure(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const value = body as Record<string, unknown>;
  return value['success'] === false || value['succeeded'] === false || value['isSuccess'] === false || value['isSucceeded'] === false;
}

export function getApiMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  for (const key of ['message', 'errorMessage', 'title', 'detail']) {
    if (typeof body[key] === 'string' && body[key].trim()) return body[key] as string;
  }
  if (Array.isArray(body['errors'])) {
    return body['errors'].filter((item): item is string => typeof item === 'string').join(', ') || null;
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError) return error.message;
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Unable to reach the server. Check your connection and try again.';
    return getApiMessage(error.error) || error.message || `Request failed (${error.status}).`;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Please try again.';
}
