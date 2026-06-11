const API_URL = 'http://localhost:3001/api';

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
  /** Number of times the event repeats after the original occurrence. */
  recurrenceCount?: number;
  /** Repeat until this date (inclusive), format "YYYY-MM-DD". */
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

interface ExpandedCalendarEvent extends CalendarEvent {
  originalId?: number;
}

export const calendarService = {
  async getEvents(): Promise<CalendarEvent[]> {
    const res = await fetch(`${API_URL}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    const events = await res.json();
    const expandedEvents: CalendarEvent[] = [];
    
    for (const event of events) {
      const mappedEvent = mapEvent(event);
      expandedEvents.push(mappedEvent);
      
      if (mappedEvent.recurrence && mappedEvent.recurrence !== 'none') {
        const expanded = expandRecurringEvent(mappedEvent);
        expandedEvents.push(...expanded);
      }
    }
    
    return expandedEvents;
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
        recurrence_count: event.recurrenceCount ?? null,
        recurrence_end_date: event.recurrenceEndDate ?? null,
        reminder_minutes: event.reminderMinutes,
        task_id: event.taskId,
      }),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return mapEvent(await res.json());
  },

  async updateEvent(id: number, event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const res = await fetch(`${API_URL}/events/${id}`, {
      method: 'PUT',
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
        recurrence_count: event.recurrenceCount ?? null,
        recurrence_end_date: event.recurrenceEndDate ?? null,
        reminder_minutes: event.reminderMinutes,
      }),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return mapEvent(await res.json());
  },

  async deleteEvent(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  },
};

/** Generates virtual copies of a recurring event for display on the calendar. */
function expandRecurringEvent(event: CalendarEvent): CalendarEvent[] {
  const expanded: CalendarEvent[] = [];
  const startDate = new Date(event.date);

  const endDate = event.recurrenceEndDate
    ? new Date(event.recurrenceEndDate)
    : (() => { const d = new Date(startDate); d.setMonth(d.getMonth() + 3); return d; })();

  const maxCopies = event.recurrenceCount ?? 50;

  let currentDate = new Date(startDate);
  let copies = 0;

  while (copies < maxCopies) {
    switch (event.recurrence) {
      case 'daily':   currentDate.setDate(currentDate.getDate() + 1); break;
      case 'weekly':  currentDate.setDate(currentDate.getDate() + 7); break;
      case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
      default: return expanded;
    }

    if (currentDate > endDate) break;

    expanded.push({
      ...event,
      id: generateTemporaryId(event.id, new Date(currentDate)),
      originalEventId: event.id,
      date: formatDateForCompare(currentDate),
    });

    copies++;
  }

  return expanded;
}

function generateTemporaryId(originalId: number, date: Date): number {
  return parseInt(`${originalId}${formatDateForCompare(date).replace(/-/g, '')}`, 10);
}

function formatDateForCompare(d: Date): string {
  return d.toISOString().split('T')[0];
}