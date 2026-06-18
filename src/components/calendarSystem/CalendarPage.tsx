import React, { useState, useEffect } from "react";
import CalendarGrid from "../calendarSystem/CalendarGrid";
import { taskService, type ITask } from "../../services/taskService";

type CalendarView = 'day' | 'week' | 'month' | 'year';

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'High': return '#FF6B6B';
    case 'Medium': return '#FFB347';
    case 'Low': return '#98D8AA';
    default: return '#AAAAAA';
  }
};

function daysBetween(a: Date, b: Date) {
  const ms = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
           - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round(ms / 86400000);
}

interface MonthViewProps {
  monthOffset: number;
  onDayClick: (dayOffset: number) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ monthOffset, onDayClick }) => {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = current.getFullYear();
  const month = current.getMonth();
  const [tasks, setTasks] = useState<ITask[]>([]);

  useEffect(() => {
    taskService.getTasks().then(setTasks).catch(() => {});
  }, []);

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'current' });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' });

  const isToday = (cell: typeof cells[0]) =>
    cell.type === 'current' &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    cell.day === today.getDate();

  const getDotsForCell = (cell: typeof cells[0]) => {
    if (cell.type !== 'current') return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr) && !t.isDone);
    const priorities = (['High', 'Medium', 'Low'] as const).filter(p => dayTasks.some(t => t.priority === p));
    return priorities.map(p => ({ priority: p }));
  };

  const handleClick = (cell: typeof cells[0]) => {
    let date: Date;
    if (cell.type === 'prev') date = new Date(year, month - 1, cell.day);
    else if (cell.type === 'next') date = new Date(year, month + 1, cell.day);
    else date = new Date(year, month, cell.day);
    onDayClick(daysBetween(date, today));
  };

  return (
    <div className="month-view">
      <div className="month-weekdays">
        {WEEK_DAYS.map((d, i) => <div key={i} className="month-weekday">{d}</div>)}
      </div>
      <div className="month-grid">
        {cells.map((cell, i) => {
          const dots = getDotsForCell(cell);
          return (
            <div
              key={i}
              className={`month-day${cell.type !== 'current' ? ' month-day--faded' : ''}${isToday(cell) ? ' month-day--today' : ''}`}
              onClick={() => handleClick(cell)}
            >
              <span className="month-day-num">{cell.day}</span>
              {dots.length > 0 && (
                <div className="month-day-dots">
                  {dots.map((d, di) => (
                    <span key={di} className="month-day-dot" style={{ background: priorityColor(d.priority) }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface MiniMonthProps {
  year: number;
  month: number;
  onDayClick: (dayOffset: number) => void;
}

const MiniMonth: React.FC<MiniMonthProps> = ({ year, month, onDayClick }) => {
  const today = new Date();
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, type: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, type: 'current' });
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, type: 'next' });

  const isToday = (cell: typeof cells[0]) =>
    cell.type === 'current' &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    cell.day === today.getDate();

  const handleClick = (cell: typeof cells[0]) => {
    let date: Date;
    if (cell.type === 'prev') date = new Date(year, month - 1, cell.day);
    else if (cell.type === 'next') date = new Date(year, month + 1, cell.day);
    else date = new Date(year, month, cell.day);
    onDayClick(daysBetween(date, today));
  };

  return (
    <div className="year-mini-month">
      <div className="year-mini-month-name">{MONTH_NAMES[month]}</div>
      <div className="month-weekdays year-mini-weekdays">
        {WEEK_DAYS.map((d, i) => <div key={i} className="month-weekday">{d}</div>)}
      </div>
      <div className="year-mini-grid">
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`year-mini-day${cell.type !== 'current' ? ' month-day--faded' : ''}${isToday(cell) ? ' month-day--today' : ''}`}
            onClick={() => handleClick(cell)}
          >
            {cell.day}
          </div>
        ))}
      </div>
    </div>
  );
};

interface YearViewProps {
  yearOffset: number;
  onDayClick: (dayOffset: number) => void;
}

const YearView: React.FC<YearViewProps> = ({ yearOffset, onDayClick }) => {
  const year = new Date().getFullYear() + yearOffset;
  return (
    <div className="year-view">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth key={i} year={year} month={i} onDayClick={onDayClick} />
      ))}
    </div>
  );
};

const CalendarPage: React.FC = () => {
  const [view, setView] = useState<CalendarView>('week');
  const [offset, setOffset] = useState(0);

  const getDisplayDate = () => {
    const d = new Date();
    if (view === 'day') {
      d.setDate(d.getDate() + offset);
      return d.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (view === 'week') {
      d.setDate(d.getDate() + offset * 7);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    if (view === 'month') {
      d.setMonth(d.getMonth() + offset);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    }
    d.setFullYear(d.getFullYear() + offset);
    return d.getFullYear().toString();
  };

  const goToDay = (dayOffset: number) => {
    setView('day');
    setOffset(dayOffset);
  };

  return (
    <div className="route-view" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {(view === 'day' || view === 'week') && <div style={{ width: 40, flexShrink: 0 }} />}
          <div className="calendar-nav">
            <button className="calendar-nav-btn" onClick={() => setOffset(o => o - 1)}>←</button>
            <button className="calendar-nav-btn is-active" onClick={() => setOffset(0)}>Today</button>
            <button className="calendar-nav-btn" onClick={() => setOffset(o => o + 1)}>→</button>
          </div>
        </div>

        <span style={{ fontSize: "18px", fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>
          {getDisplayDate()}
        </span>

        <div className="calendar-view-switcher">
          {VIEWS.map(v => (
            <button
              key={v.key}
              className={`calendar-view-btn${view === v.key ? ' is-active' : ''}`}
              onClick={() => { setView(v.key); setOffset(0); }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {(view === 'day' || view === 'week') && (
        <CalendarGrid
          weekOffset={view === 'week' ? offset : 0}
          dayOffset={view === 'day' ? offset : undefined}
          view={view}
        />
      )}

      {view === 'month' && <MonthView monthOffset={offset} onDayClick={goToDay} />}

      {view === 'year' && <YearView yearOffset={offset} onDayClick={goToDay} />}
    </div>
  );
};

export default CalendarPage;
