/**
 * Utility functions for formatting durations in human-readable form.
 * Used by the activity tracker and statistics pages.
 *
 * Two formats are available:
 *   - detailed: all non-zero units shown, e.g. "1d 2h 30m 15s"
 *   - compact:  top two significant units only, e.g. "2h 30m" (seconds dropped when hours are present)
 */

/**
 * Formats a duration showing every non-zero unit from days down to seconds.
 * Returns "0s" for zero input so callers always get a non-empty string.
 *
 * @param seconds - Total duration in seconds.
 * @returns String such as "1d 4h 30m 5s" or "45s".
 */
export const formatDurationDetailed = (seconds: number): string => {
  if (seconds === 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  // Always include seconds when no larger unit is present, so "0s" is never returned for non-zero input.
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};

/**
 * Formats a duration showing only the two most significant units.
 * Drops lower units once a higher one is present — e.g. when days exist, minutes and seconds are omitted.
 * Returns "0s" for zero input.
 *
 * @param seconds - Total duration in seconds.
 * @returns String such as "1d 2h", "2h 30m", "5m 10s", or "45s".
 */
export const formatDurationCompact = (seconds: number): string => {
  if (seconds === 0) return '0s';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};