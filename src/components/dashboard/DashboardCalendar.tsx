/**
 * Standalone weekly calendar widget — legacy component, not currently rendered in the dashboard.
 * The dashboard embeds CalendarGrid directly instead of this component.
 *
 * Events are fetched from a REST endpoint (/api/events), which predates the app's
 * migration to SQLite via Tauri. This component is kept for reference.
 */
import React, { useEffect, useState } from 'react';
import './DashboardCalendar.css';

/** Shape of a calendar event as returned by the /api/events endpoint. */
interface CalendarEvent {
  id: number;
  title: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  /** 24-hour time string (HH:MM). */
  start_time: string;
  /** 24-hour time string (HH:MM). */
  end_time: string;
  /** CSS colour string for the event pill. */
  color: string;
  is_all_day: boolean;
}

/**
 * Weekly calendar showing time slots from 08:00 to 16:00 with event pills.
 * All-day events are excluded from the time-grid view.
 */
const DashboardCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  /**
   * Returns an array of 7 day descriptors for the current week starting on Monday.
   * `today.getDay() - 1` gives the offset from Monday (Sunday wraps to 6 via `+ 1` correction).
   */
  const getWeekDays = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return {
        name: day,
        date: date.toISOString().split('T')[0],
        dateNum: date.getDate(),
      };
    });
  };

  /**
   * Returns 9 hourly time slot labels starting at 08:00 (08:00–16:00).
   * The range is hardcoded to cover a typical working day.
   */
  const getTimeSlots = () => {
    return Array.from({ length: 9 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
  };

  /**
   * Returns events that fall in the given date and hour slot.
   * Matches by exact start hour; all-day events are excluded since they have no specific hour.
   *
   * @param date - ISO date string (YYYY-MM-DD).
   * @param hour - Integer hour (0–23).
   */
  const getEventsForTime = (date: string, hour: number) => {
    return events.filter((event) => {
      if (event.date !== date) return false;
      if (event.is_all_day) return false;
      const startHour = parseInt(event.start_time.split(':')[0]);
      return startHour === hour;
    });
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();

  return (
    <div className="dashboard-calendar">
      <div className="calendar-header">
        <h2 className="calendar-title">Weekly Calendar</h2>
        <button className="calendar-action-btn" title="Calendar options">📅</button>
      </div>

      {loading ? (
        <div className="calendar-loading">Loading calendar...</div>
      ) : (
        <div className="calendar-grid">
          {/* Day headers */}
          <div className="calendar-day-headers">
            <div className="calendar-time-col"></div>
            {weekDays.map((day) => (
              <div key={day.date} className="calendar-day-header">
                <div className="day-name">{day.name}</div>
                <div className="day-date">{day.dateNum}</div>
              </div>
            ))}
          </div>

          {/* Time slots and events */}
          <div className="calendar-time-grid">
            {timeSlots.map((time, hourIndex) => (
              <div key={time} className="calendar-time-row">
                <div className="calendar-time-label">{time}</div>
                {weekDays.map((day) => {
                  const dayEvents = getEventsForTime(day.date, 8 + hourIndex);
                  return (
                    <div key={`${day.date}-${time}`} className="calendar-cell">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="calendar-event"
                          style={{ backgroundColor: event.color }}
                          title={event.title}
                        >
                          <div className="event-time">
                            {event.start_time.substring(0, 5)}
                          </div>
                          <div className="event-title">{event.title}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardCalendar;
