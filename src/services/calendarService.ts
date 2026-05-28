const API_URL = 'http://localhost:3001/api';

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  location?: string;
  description?: string;
  isAllDay?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
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
    reminderMinutes: e.reminder_minutes ?? undefined,
    taskId: e.task_id ?? undefined,
  };
}

export const calendarService = {
  async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_URL}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return (await res.json()).map(mapEvent);
  },

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const res = await fetch(`${API_URL}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: event.title,
        date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        color: event.color,
        location: event.location,
        description: event.description,
        is_all_day: event.isAllDay ? 1 : 0,
        recurrence: event.recurrence ?? 'none',
        reminder_minutes: event.reminderMinutes,
        task_id: event.taskId,
      }),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return mapEvent(await res.json());
  },

  async deleteEvent(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  },
};