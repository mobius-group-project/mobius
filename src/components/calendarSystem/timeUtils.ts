/**
 * Extracts the hour component from a "HH:MM" time string.
 * @param time - Time in "HH:MM" format.
 * @returns The hour as a number.
 */
export function timeToHour(time: string): number {
  const [h] = time.split(":").map(Number);
  return h;
}

/**
 * Calculates the duration in hours between two "HH:MM" times.
 * @param start - Start time ("HH:MM").
 * @param end   - End time ("HH:MM").
 * @returns Duration in hours (may be negative if end < start).
 */
export function durationHours(start: string, end: string): number {
  const [h1] = start.split(":").map(Number);
  const [h2] = end.split(":").map(Number);
  return h2 - h1;
}
