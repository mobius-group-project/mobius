import React, { useEffect, useRef, useState } from "react";

import "./CalendarGrid.css";

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

const CalendarGrid: React.FC = () => {
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const todayDate = today.getDate();

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const diff = i - todayIndex;
    d.setDate(today.getDate() + diff);
    return d.getDate();
  });

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const [linePosition, setLinePosition] = useState(0);


  useEffect(() => {
    if (!bodyRef.current || !firstRowRef.current) return;

    const now = new Date();
    const currentHour = now.getHours();

    const rowHeight = firstRowRef.current.getBoundingClientRect().height;
    const headerHeight = 60;

    const target =
      currentHour * rowHeight -
      bodyRef.current.clientHeight / 2 +
      headerHeight;

    bodyRef.current.scrollTo({
      top: Math.max(target, 0),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
  if (!firstRowRef.current) return;

  const update = () => {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const rowHeight = firstRowRef.current!.getBoundingClientRect().height;
    const pos = hour * rowHeight + (minutes / 60) * rowHeight;
    setLinePosition(pos);
  };

  update();
  const interval = setInterval(update, 60000);
  return () => clearInterval(interval);
}, []);


  return (
    <div className="calendar-grid">
      <div className="calendar-header">
        <div className="calendar-header-empty" />

        {DAYS.map((day, index) => (
          <div
            key={day}
            className={
              "calendar-header-cell" +
              (index === todayIndex ? " is-today" : "")
            }
          >
            <div className="day-name">{day}</div>

            <div
              className={
                "day-number" +
                (index === todayIndex ? " today-number" : "")
              }
            >
              {weekDates[index]}
            </div>
          </div>
        ))}
      </div>

      <div className="calendar-body" ref={bodyRef}>
          <div
             className="current-time-line"
             style={{ top: `${linePosition}px` }}
             />
        {timeSlots.map((slot, i) => (
          <div
            key={slot}
            className="calendar-row"
            ref={i === 0 ? firstRowRef : null}
          >
            <div className="calendar-time-label">{slot}</div>

            <div className="calendar-row-cells">
              {DAYS.map((day, index) => (
                <div
                  key={day + slot}
                  className={
                    "calendar-cell" +
                    (index === todayIndex ? " is-today" : "")
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarGrid;
