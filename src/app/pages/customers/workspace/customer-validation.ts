const NAME_REGEX = /^[A-Za-z\u0600-\u06FF][A-Za-z\u0600-\u06FF\s.'-]{1,59}$/;
const EGYPT_PHONE_REGEX = /^01[0125][0-9]{8}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._%+-]{1,}[a-zA-Z0-9]@[a-zA-Z]{4,}\.com$/;
const WEBSITE_REGEX = /^https?:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/?#].*)?$/;
const LETTERS_REGEX = /[^A-Za-z\u0600-\u06FF\s.'-]/g;
const DIGITS_REGEX = /[^0-9]/g;
const INDUSTRY_NAME_CHARS_REGEX = /^[A-Za-z\u0600-\u06FF_]{3,}$/;
const HAS_LETTER_REGEX = /[A-Za-z\u0600-\u06FF]/;
const INDUSTRY_NAME_FILTER_REGEX = /[^A-Za-z\u0600-\u06FF_]/g;

export function isValidCustomerName(value: string): boolean {
  return !!value?.trim() && NAME_REGEX.test(value.trim());
}

export function isValidCustomerPhone(value: string): boolean {
  return !value?.trim() || EGYPT_PHONE_REGEX.test(value.trim());
}

export function isValidCustomerEmail(value: string): boolean {
  return !value?.trim() || EMAIL_REGEX.test(value.trim());
}

export function isValidCustomerUrl(value: string): boolean {
  return !value?.trim() || WEBSITE_REGEX.test(value.trim());
}

export function isValidIndustryName(value: string): boolean {
  if (!value?.trim()) return false;
  const trimmed = value.trim();
  return INDUSTRY_NAME_CHARS_REGEX.test(trimmed) && HAS_LETTER_REGEX.test(trimmed);
}

export function sanitizeIndustryName(value: string): string {
  return value.replace(INDUSTRY_NAME_FILTER_REGEX, '');
}

export function restrictToLetters(event: Event): void {
  const input = event.target as HTMLInputElement;
  const cleaned = input.value.replace(LETTERS_REGEX, '');
  if (cleaned !== input.value) input.value = cleaned;
}

export function restrictToDigits(event: Event): void {
  const input = event.target as HTMLInputElement;
  const cleaned = input.value.replace(DIGITS_REGEX, '').slice(0, 11);
  if (cleaned !== input.value) input.value = cleaned;
}
