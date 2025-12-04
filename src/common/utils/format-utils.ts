/**
 * Utility functions for formatting Brazilian documents and codes
 */

export type NullableString = string | undefined | null;

/**
 * Formats a CNPJ string to XX.XXX.XXX/XXXX-XX format
 * Accepts both formatted and unformatted input
 */
export function formatCNPJ(value: NullableString): NullableString {
  if (!value || typeof value !== 'string') return value;
  const numbers = value.replace(/\D/g, '');
  if (numbers.length !== 14) return value; // Return as-is if invalid length
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
}

/**
 * Formats a CPF string to XXX.XXX.XXX-XX format
 * Accepts both formatted and unformatted input
 */
export function formatCPF(value: NullableString): NullableString {
  if (!value || typeof value !== 'string') return value;
  const numbers = value.replace(/\D/g, '');
  if (numbers.length !== 11) return value; // Return as-is if invalid length
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Formats a ZIP code (CEP) string to XXXXX-XXX format
 * Accepts both formatted and unformatted input
 */
export function formatZipCode(value: NullableString): NullableString {
  if (!value || typeof value !== 'string') return value;
  const numbers = value.replace(/\D/g, '');
  if (numbers.length !== 8) return value; // Return as-is if invalid length
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}
