
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;      // "2025-06-14"
  startTime: string; // "08:30"
  endTime: string;   // "13:15"
  color: string;
}


