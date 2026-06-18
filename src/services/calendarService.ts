import { getDb } from './db';

/**
 * Represents a calendar event stored in the database, including scheduling info,
 * recurrence rules, location, and an optional link to a task.
 */
export interface CalendarEvent {
  /** Unique event identifier. */
  id: number;
  /** If this is a recurring copy, the original event's ID. */
  originalEventId?: number;
  /** Event display title. */
  title: string;
  /** Event date in "YYYY-MM-DD" format. */
  date: string;
  /** Start time in "HH:MM" format. */
  startTime: string;
  /** End time in "HH:MM" format. */
  endTime: string;
  /** Hex colour for display. */
  color: string;
  /** Optional location string. */
  location?: string;
  /** Optional description. */
  description?: string;
  /** Whether the event spans the entire day. */
  isAllDay?: boolean;
  /** Recurrence pattern: none, daily, weekly, or monthly. */
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  /** Number of recurring instances (for "After N times" end). */
  recurrenceCount?: number;
  /** Date after which recurrence stops (for "By date" end). */
  recurrenceEndDate?: string;
  /** Minutes before the event to trigger a reminder. */
  reminderMinutes?: number;
  /** Optional ID of the linked task. */
  taskId?: string;
}

/**
 * Maps a raw database row to the {@link CalendarEvent} interface.
 * @param e - Raw row from the `calendar_events` table.
 * @returns Normalised calendar event object.
 */
function mapEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.start_time,
    endTime: e.end_time,
    color: e.color ?? '#A7C7E7',
    location: e.location ?? undefined,
    description: e.description ?? undefined,
    isAllDay: Boolean(e.is_all_day),
    recurrence: e.recurrence ?? 'none',
    recurrenceCount: e.recurrence_count ?? undefined,
    recurrenceEndDate: e.recurrence_end_date ?? undefined,
    reminderMinutes: e.reminder_minutes ?? undefined,
    taskId: e.task_id ?? undefined,
  };
}

/** Service for CRUD operations on calendar events via the local SQLite database. */
export const calendarService = {
  /**
   * Fetches all calendar events ordered by date and start time.
   * Recurring events are expanded into individual copies.
   * @returns Promise resolving to an array of calendar events.
   */
  async getEvents(): Promise<CalendarEvent[]> {
    const db = await getDb();
    const rows = await db.select<any[]>('SELECT * FROM calendar_events ORDER BY date, start_time');
    const result: CalendarEvent[] = [];
    for (const row of rows) {
      const event = mapEvent(row);
      result.push(event);
      if (event.recurrence && event.recurrence !== 'none') {
        result.push(...expandRecurringEvent(event));
      }
    }
    return result;
  },

  /**
   * Creates a new calendar event in the database.
   * @param event - Event data (without the `id` field).
   * @returns Promise resolving to the saved event with its generated ID.
   */
  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const db = await getDb();
    const result = await db.execute(
      `INSERT INTO calendar_events (title, date, start_time, end_time, color, location, description, is_all_day, recurrence, recurrence_count, recurrence_end_date, reminder_minutes, task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.title, event.date, event.startTime, event.endTime,
        event.color ?? '#A7C7E7', event.location ?? null, event.description ?? null,
        event.isAllDay ? 1 : 0, event.recurrence ?? 'none',
        event.recurrenceCount ?? null, event.recurrenceEndDate ?? null,
        event.reminderMinutes ?? null, event.taskId ?? null,
      ]
    );
    const rows = await db.select<any[]>('SELECT * FROM calendar_events WHERE id = ?', [result.lastInsertId]);
    return mapEvent(rows[0]);
  },

  /**
   * Updates an existing calendar event by ID.
   * @param id    - The event ID to update.
   * @param event - New event data (all fields except `id`).
   * @returns Promise resolving to the updated event.
   */
  async updateEvent(id: number, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const db = await getDb();
    await db.execute(
      `UPDATE calendar_events SET title=?, date=?, start_time=?, end_time=?, color=?, location=?, description=?,
       is_all_day=?, recurrence=?, recurrence_count=?, recurrence_end_date=?, reminder_minutes=? WHERE id=?`,
      [
        event.title, event.date, event.startTime, event.endTime,
        event.color ?? '#A7C7E7', event.location ?? null, event.description ?? null,
        event.isAllDay ? 1 : 0, event.recurrence ?? 'none',
        event.recurrenceCount ?? null, event.recurrenceEndDate ?? null,
        event.reminderMinutes ?? null, id,
      ]
    );
    const rows = await db.select<any[]>('SELECT * FROM calendar_events WHERE id = ?', [id]);
    return mapEvent(rows[0]);
  },

  /**
   * Deletes a calendar event by ID.
   * @param id - The event ID to delete.
   */
  async deleteEvent(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM calendar_events WHERE id = ?', [id]);
  },
};

/**
 * Expands a single recurring event into multiple {@link CalendarEvent} copies
 * by advancing the date according to the recurrence rule.
 *
 * Stops when `recurrenceCount` copies are generated or the `recurrenceEndDate` is exceeded.
 * Generated copies receive a compound ID derived from the original ID and their date.
 *
 * @param event - The base recurring event.
 * @returns Array of expanded event copies (excluding the original).
 */
function expandRecurringEvent(event: CalendarEvent): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];
  const startDate = new Date(event.date);
  const endDate = event.recurrenceEndDate
    ? new Date(event.recurrenceEndDate)
    : (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + 3); return d; })();
  const maxCopies = event.recurrenceCount ?? 50;
  let current = new Date(startDate);
  let copies = 0;
  while (copies < maxCopies) {
    switch (event.recurrence) {
      case 'daily':   current.setDate(current.getDate() + 1); break;
      case 'weekly':  current.setDate(current.getDate() + 7); break;
      case 'monthly': current.setMonth(current.getMonth() + 1); break;
      default: return expanded;
    }
    if (current > endDate) break;
    expanded.push({
      ...event,
      id: parseInt(`${event.id}${current.toISOString().split('T')[0].replace(/-/g, '')}`, 10),
      originalEventId: event.id,
      date: current.toISOString().split('T')[0],
    });
    copies++;
  }
  return expanded;
}
