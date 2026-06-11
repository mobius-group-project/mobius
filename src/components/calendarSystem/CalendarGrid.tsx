import React, { useEffect, useRef, useState } from "react";
import { calendarService, type CalendarEvent } from "../../services/calendarService";
import "./CalendarGrid.css";

interface CalendarGridProps {
  weekOffset: number;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function generateTimeSlots(stepMinutes: number = 60) {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

const timeSlots = generateTimeSlots(60);

const formatDate = (d: Date) => d.toISOString().split("T")[0];

const getDurationInMinutes = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

const CalendarGrid: React.FC<CalendarGridProps> = ({ weekOffset }) => {
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const isCurrentWeek = weekOffset === 0;

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const diff = i - todayIndex + weekOffset * 7;
    d.setDate(today.getDate() + diff);
    return d;
  });

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const [linePosition, setLinePosition] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number; date: Date; time: string } | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    recurrence: "none" as 'none' | 'daily' | 'weekly' | 'monthly',
    recurrenceEndType: "count" as 'count' | 'date',
    recurrenceCount: 1,
    recurrenceEndDate: "",
    color: "#A7C7E7",
    isAllDay: false,
    reminderMinutes: 0
  });

  useEffect(() => {
    if (!bodyRef.current || !firstRowRef.current) return;
    const now = new Date();
    const currentHour = now.getHours();
    const rowHeight = firstRowRef.current.getBoundingClientRect().height;
    const headerHeight = 60;
    const target = currentHour * rowHeight - bodyRef.current.clientHeight / 2 + headerHeight;
    bodyRef.current.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const fetchedEvents = await calendarService.getEvents();
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  useEffect(() => {
    if (!firstRowRef.current) return;
    const update = () => {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const rowHeight = firstRowRef.current!.getBoundingClientRect().height;
      setLinePosition(hour * rowHeight + (minutes / 60) * rowHeight);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const calculatePopupPosition = (rect: DOMRect) => {
    const popupWidth = 320;
    const popupHeight = 500;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let x = rect.right + 10;
    let y = rect.top;
    
    if (x + popupWidth > windowWidth) {
      x = rect.left - popupWidth - 10;
    }
    
    if (y + popupHeight > windowHeight) {
      y = windowHeight - popupHeight - 10;
    }
    
    if (y < 10) {
      y = 10;
    }
    
    return { x, y };
  };

  const handleCellClick = (date: Date, time: string, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = calculatePopupPosition(rect);
    
    setPopupPosition({
      x: position.x,
      y: position.y,
      date: date,
      time: time
    });
    
    setFormData({
      title: "",
      startTime: time,
      endTime: `${String(Number(time.split(":")[0]) + 1).padStart(2, "0")}:00`,
      location: "",
      description: "",
      recurrence: "none",
      recurrenceEndType: "count",
      recurrenceCount: 1,
      recurrenceEndDate: "",
      color: "#A7C7E7",
      isAllDay: false,
      reminderMinutes: 0
    });
  };

  const createEvent = async () => {
    if (!popupPosition) return;
    
    try {
      const isRepeating = formData.recurrence !== 'none';

      await calendarService.createEvent({
        title: formData.title || 'Untitled Event',
        date: formatDate(popupPosition.date),
        startTime: formData.startTime,
        endTime: formData.endTime,
        color: formData.color,
        location: formData.location || undefined,
        description: formData.description || undefined,
        recurrence: formData.recurrence,
        recurrenceCount: isRepeating && formData.recurrenceEndType === 'count' ? formData.recurrenceCount : undefined,
        recurrenceEndDate: isRepeating && formData.recurrenceEndType === 'date' ? formData.recurrenceEndDate || undefined : undefined,
        isAllDay: formData.isAllDay,
        reminderMinutes: formData.reminderMinutes || undefined,
      });
      
      await loadEvents();
      setPopupPosition(null);
    } catch (e) {
      console.error('Failed to create event:', e);
    }
  };

  const getEventsForCell = (date: Date, slot: string) => {
    const dateStr = formatDate(date);
    const slotHour = slot.split(":")[0];
    
    return events.filter((ev) => {
      const evHour = ev.startTime.split(":")[0];
      return ev.date === dateStr && evHour === slotHour;
    });
  };

  const isRecurringCopy = (eventId: number, originalDate: string, currentDate: string) => {
    const eventIdStr = eventId.toString();
    return eventIdStr.length > 6 && currentDate !== originalDate;
  };

  const colorOptions = [
    { value: "#A7C7E7", label: "Blue" },
    { value: "#FFB3BA", label: "Pink" },
    { value: "#B5EAD7", label: "Green" },
    { value: "#FFDAC1", label: "Orange" },
    { value: "#E2F0CB", label: "Light Green" },
    { value: "#C7CEE6", label: "Purple" },
  ];

  return (
    <div className="calendar-grid">
      <div className="calendar-header">
        <div className="calendar-header-empty" />
        {DAYS.map((day, index) => (
          <div
            key={day}
            className={"calendar-header-cell" + (isCurrentWeek && index === todayIndex ? " is-today" : "")}
          >
            <div className="day-name">{day}</div>
            <div className={"day-number" + (isCurrentWeek && index === todayIndex ? " today-number" : "")}>
              {weekDates[index].getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="calendar-body" ref={bodyRef}>
        {isCurrentWeek && (
          <div className="current-time-line" style={{ top: `${linePosition}px` }} />
        )}

        {timeSlots.map((slot, i) => (
          <div key={slot} className="calendar-row" ref={i === 0 ? firstRowRef : null}>
            <div className="calendar-time-label">{slot}</div>
            <div className="calendar-row-cells">
              {DAYS.map((day, index) => {
                const cellDate = weekDates[index];
                const cellEvents = getEventsForCell(cellDate, slot);
                
                return (
                  <div
                    key={day + slot}
                    className={"calendar-cell" + (isCurrentWeek && index === todayIndex ? " is-today" : "")}
                    onClick={(e) => handleCellClick(cellDate, slot, e)}
                  >
                    {cellEvents.map((ev) => {
                      const duration = getDurationInMinutes(ev.startTime, ev.endTime);
                      const rowHeight = 80;
                      const startMinutes = Number(ev.startTime.split(":")[1]);
                      const topOffset = (startMinutes / 60) * rowHeight;
                      const height = (duration / 60) * rowHeight;
                      
                      const isRecurring = isRecurringCopy(ev.id, ev.date, formatDate(cellDate));
                      
                      return (
                        <div
                          key={ev.id}
                          className="calendar-event"
                          style={{
                            backgroundColor: ev.color,
                            height: `${height}px`,
                            top: `${topOffset}px`,
                            opacity: isRecurring ? 0.85 : 1,
                            border: isRecurring ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                          }}
                          title={isRecurring ? `Recurring: ${ev.title}` : ev.title}
                        >
                          <div className="calendar-event-title">
                            {ev.title}
                            {isRecurring && ' 🔄'}
                          </div>
                          {ev.location && (
                            <div className="calendar-event-location">📍 {ev.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {popupPosition && (
        <>
          <div 
            className="popup-backdrop" 
            onClick={() => setPopupPosition(null)}
          />
          
          <div 
            className="event-popup-modern"
            style={{ 
              position: 'fixed',
              top: popupPosition.y,
              left: popupPosition.x,
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header">
              <h4>Add Event</h4>
              <button className="popup-close" onClick={() => setPopupPosition(null)}>×</button>
            </div>

            <div className="popup-content">
              <input
                type="text"
                placeholder="Event title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                autoFocus
                className="popup-input"
              />

              <div className="popup-time-row">
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="popup-time-input"
                />
                <span>→</span>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                  className="popup-time-input"
                />
              </div>

              <input
                type="text"
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="popup-input"
              />

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
                className="popup-textarea"
              />

              <div className="popup-row">
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({...formData, recurrence: e.target.value as any})}
                  className="popup-select"
                >
                  <option value="none">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <select
                  value={formData.reminderMinutes}
                  onChange={(e) => setFormData({...formData, reminderMinutes: Number(e.target.value)})}
                  className="popup-select"
                >
                  <option value={0}>No reminder</option>
                  <option value={5}>5 min before</option>
                  <option value={15}>15 min before</option>
                  <option value={30}>30 min before</option>
                  <option value={60}>1 hour before</option>
                </select>
              </div>

              {formData.recurrence !== 'none' && (
                <div className="popup-recurrence-end">
                  <div className="popup-recurrence-end-toggle">
                    <button
                      className={`recurrence-end-btn${formData.recurrenceEndType === 'count' ? ' active' : ''}`}
                      onClick={() => setFormData({...formData, recurrenceEndType: 'count'})}
                    >
                      After N times
                    </button>
                    <button
                      className={`recurrence-end-btn${formData.recurrenceEndType === 'date' ? ' active' : ''}`}
                      onClick={() => setFormData({...formData, recurrenceEndType: 'date'})}
                    >
                      By date
                    </button>
                  </div>

                  {formData.recurrenceEndType === 'count' ? (
                    <div className="popup-recurrence-count-row">
                      <label>Repeat</label>
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={formData.recurrenceCount}
                        onChange={(e) => setFormData({...formData, recurrenceCount: Math.max(1, Number(e.target.value))})}
                        className="popup-input popup-count-input"
                      />
                      <label>times</label>
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={formData.recurrenceEndDate}
                      min={formatDate(popupPosition!.date)}
                      onChange={(e) => setFormData({...formData, recurrenceEndDate: e.target.value})}
                      className="popup-input"
                    />
                  )}
                </div>
              )}

              <div className="popup-colors">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    className={`popup-color ${formData.color === color.value ? 'active' : ''}`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({...formData, color: color.value})}
                    title={color.label}
                  />
                ))}
              </div>

              <div className="popup-actions">
                <button className="popup-cancel" onClick={() => setPopupPosition(null)}>
                  Cancel
                </button>
                <button className="popup-create" onClick={createEvent}>
                  Create
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarGrid;