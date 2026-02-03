/**
 * Simple in-memory rate limiting for preview endpoint.
 * In production, use Redis or similar.
 */

const previewAttempts = new Map<string, { count: number; date: string }>();

export function checkRateLimit(ip: string): boolean {
  const today = new Date().toISOString().split("T")[0];
  const record = previewAttempts.get(ip);

  if (!record || record.date !== today) {
    previewAttempts.set(ip, { count: 1, date: today });
    return true;
  }

  if (record.count >= 1) {
    return false; // Only 1 preview per day
  }

  record.count++;
  return true;
}

export function resetRateLimit(ip: string) {
  previewAttempts.delete(ip);
}
