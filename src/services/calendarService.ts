import { getDb } from './db';

export interface CalendarEvent {
  id: number;
  originalEventId?: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurrenceCount?: number;
  recurrenceEndDate?: string;
  reminderMinutes?: number;
  taskId?: string;
}

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

export const calendarService = {
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

  async deleteEvent(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM calendar_events WHERE id = ?', [id]);
  },
};

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
