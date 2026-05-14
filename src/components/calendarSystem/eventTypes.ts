export interface CalendarEvent {
  id: number;
  title: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  color: string;
}