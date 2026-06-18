/** Static sample events for development and testing — not used in production. */
import type { CalendarEvent } from "./eventTypes";

/** Static sample events used for development/testing purposes. */
export const sampleEvents: CalendarEvent[] = [
  { id: 1, title: "Plan 1", date: "2026-05-14", 
    startTime: "9:45", endTime: "11:20", color: "#FFB347" },
  { id: 2, title: "Plan 2", date: "2026-05-15",
     startTime: "10:10", endTime: "11:00", color: "#77DD77" },
  { id: 3, title: "Plan 3", date: "2026-05-16",
     startTime: "12:00", endTime: "14:30", color: "#AEC6CF" },
];