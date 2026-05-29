import React, { useEffect, useState } from 'react';
import './DashboardCalendar.css';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  is_all_day: boolean;
}

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

  const getTimeSlots = () => {
    return Array.from({ length: 9 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
  };

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
