import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for merging Tailwind CSS classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as INR (Indian Rupee) currency.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a date value into a human-readable format.
 */
export function formatDate(dateValue: string | Date): string {
  const date = parseDateValue(dateValue);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function parseDateValue(dateValue: string | Date): Date {
  if (dateValue instanceof Date) {
    return dateValue;
  }

  const hasExplicitTimeZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(dateValue);
  if (hasExplicitTimeZone) {
    return new Date(dateValue);
  }

  const normalizedValue = dateValue.trim().replace(' ', 'T');
  return new Date(`${normalizedValue}+05:30`);
}
