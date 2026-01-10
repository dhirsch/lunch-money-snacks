/**
 * Generate a UUID v4 for itemized breakdown items
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
