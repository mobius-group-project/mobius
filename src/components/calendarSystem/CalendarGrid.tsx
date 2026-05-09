import React from "react";
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
  // Определяем индекс сегодняшнего дня (0 = Mon)
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="calendar-grid">
      {/* Header */}
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
            {day}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="calendar-body">
        {timeSlots.map((slot) => (
          <div key={slot} className="calendar-row">
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
