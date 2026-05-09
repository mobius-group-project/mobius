
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarEvent {
  id: number;
  title: string;
  day: DayOfWeek;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  color: string;     // hex color
}
