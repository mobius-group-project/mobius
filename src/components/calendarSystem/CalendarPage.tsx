import React from "react";
import CalendarGrid from "../calendarSystem/CalendarGrid";

const CalendarPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Calendar</h1>
      <CalendarGrid />
    </div>
  );
};

export default CalendarPage;
