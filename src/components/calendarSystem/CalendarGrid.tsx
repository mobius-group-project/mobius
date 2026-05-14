import React, { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "./eventTypes";
import { sampleEvents } from "./sampleEvents";
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
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);

  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    time: string;
    x: number;
    y: number;
  } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

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

  const createEvent = () => {
    if (!selectedSlot) return;
    const newEvent: CalendarEvent = {
      id: Date.now(),
      title: newTitle || "New Event",
      date: formatDate(selectedSlot.date),
      startTime: newStart,
      endTime: newEnd,
      color: "#A7C7E7",
    };
    setEvents((prev) => [...prev, newEvent]);
    setSelectedSlot(null);
    setNewTitle("");
    setNewStart("");
    setNewEnd("");
  };

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
                return (
                  <div
                    key={day + slot}
                    className={"calendar-cell" + (isCurrentWeek && index === todayIndex ? " is-today" : "")}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setSelectedSlot({ date: cellDate, time: slot, x: rect.right + 8, y: rect.top });
                      setNewStart(slot);
                      setNewEnd(`${String(Number(slot.split(":")[0]) + 1).padStart(2, "0")}:00`);
                    }}
                  >
                    {events
                      .filter((ev) => {
                        const evHour = ev.startTime.split(":")[0];
                        const slotHour = slot.split(":")[0];
                        return (
                          formatDate(new Date(ev.date)) === formatDate(cellDate) &&
                          evHour === slotHour
                        );
                      })
                      .map((ev) => {
                        const duration = getDurationInMinutes(ev.startTime, ev.endTime);
                        const rowHeight = 80;
                        const startMinutes = Number(ev.startTime.split(":")[1]);
                        const topOffset = (startMinutes / 60) * rowHeight;
                        const height = (duration / 60) * rowHeight;
                        return (
                          <div
                            key={ev.id}
                            className="calendar-event"
                            style={{
                              backgroundColor: ev.color,
                              height: `${height}px`,
                              top: `${topOffset}px`,
                            }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {selectedSlot && (
          <div className="event-popup" style={{ top: selectedSlot.y, left: selectedSlot.x }}>
            <input
              type="text"
              placeholder="Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            <button onClick={createEvent}>Add</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarGrid;