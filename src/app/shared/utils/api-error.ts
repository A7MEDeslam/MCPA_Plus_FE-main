/**
 * Pulls a human message out of an HttpErrorResponse coming from ASP.NET Core.
 * Handles: plain string bodies, { message }, { detail }, { title } (ProblemDetails)
 * and { errors: { Field: ['msg'] } } (ValidationProblemDetails).
 *
 * Replaces the ~40 copies of `error.error?.message || '...'`:
 *
 *   error: (error) => this.toast.show(apiErrorMessage(error, 'Failed to save customer.'))
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const body = (error as { error?: unknown } | null)?.error;

  if (typeof body === 'string' && body.trim()) return body;

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;

    const errors = record['errors'];
    if (errors && typeof errors === 'object') {
      for (const messages of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(messages) && typeof messages[0] === 'string' && messages[0].trim()) {
          return messages[0];
        }
      }
    }

    for (const key of ['message', 'detail', 'title']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value;
    }
  }

  return fallback;
}
