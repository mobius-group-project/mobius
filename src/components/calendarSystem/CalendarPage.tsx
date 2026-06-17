import React, { useState } from "react";
import CalendarGrid from "../calendarSystem/CalendarGrid";

const CalendarPage: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + weekOffset * 7);
  const monthYear = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="route-view" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexShrink: 0 }}>
        <div className="calendar-nav">
          <button className="calendar-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>←</button>
          <button className="calendar-nav-btn is-active" onClick={() => setWeekOffset(0)}>Today</button>
          <button className="calendar-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>→</button>
        </div>
        <span style={{ fontSize: "20px", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
          {monthYear}
        </span>
      </div>
      <CalendarGrid weekOffset={weekOffset} />
    </div>
  );
};

export default CalendarPage;