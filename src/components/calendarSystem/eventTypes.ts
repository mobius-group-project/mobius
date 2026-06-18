/**
 * Shared type definitions for the calendar system.
 * The full CalendarEvent interface (with recurrence, reminders, etc.) lives in calendarService.ts;
 * this file defines the minimal shape used by the legacy CalendarGrid display logic.
 */

/**
 * Represents a calendar event with scheduling information.
 *
 * @property id        - Unique event identifier.
 * @property title     - Event display title.
 * @property date      - Event date in "YYYY-MM-DD" format.
 * @property startTime - Start time in "HH:MM" format.
 * @property endTime   - End time in "HH:MM" format.
 * @property color     - Hex colour string for display (e.g. "#A7C7E7").
 */
export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
}