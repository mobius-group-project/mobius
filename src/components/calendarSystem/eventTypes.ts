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