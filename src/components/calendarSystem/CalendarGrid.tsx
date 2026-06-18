import React, { useEffect, useRef, useState } from "react";
import { Calendar, Flag } from "lucide-react";
import { calendarService, type CalendarEvent } from "../../services/calendarService";
import { taskService, type ITask } from "../../services/taskService";
import "./CalendarGrid.css";

interface CalendarGridProps {
  weekOffset: number;
  dayOffset?: number;
  view?: 'day' | 'week';
  compactHeader?: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ROW_HEIGHT = 68;

function generateTimeSlots(stepMinutes: number = 60) {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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

const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

interface DragState {
  dayIndex: number;
  startMinutes: number;
  currentMinutes: number;
}

interface GhostEvent {
  dayIndex: number;
  date: Date;
  startMinutes: number;
  endMinutes: number;
  title: string;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({ weekOffset, dayOffset = 0, view = 'week', compactHeader = false }) => {
  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const isCurrentWeek = weekOffset === 0 && view === 'week';
  const isToday = dayOffset === 0 && view === 'day';

  const weekDates = view === 'day'
    ? (() => {
        const d = new Date();
        d.setDate(today.getDate() + dayOffset);
        return [d];
      })()
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() + i - todayIndex + weekOffset * 7);
        return d;
      });

  const displayDays = view === 'day' ? [''] : DAYS;

  const bodyRef = useRef<HTMLDivElement | null>(null);
  const firstRowRef = useRef<HTMLDivElement | null>(null);
  const ghostInputRef = useRef<HTMLInputElement | null>(null);
  const [linePosition, setLinePosition] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [ghostEvent, setGhostEvent] = useState<GhostEvent | null>(null);
  const isDragging = useRef(false);

  const [activeColors, setActiveColors] = useState<Set<string>>(new Set());

  const toggleColor = (color: string) => {
    setActiveColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color); else next.add(color);
      return next;
    });
  };

  const [taskPreview, setTaskPreview] = useState<{ task: ITask; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);

  // popup state (for create / edit flow)
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
    const rowHeight = firstRowRef.current.getBoundingClientRect().height;
    const target = now.getHours() * rowHeight - bodyRef.current.clientHeight / 2 + 60;
    bodyRef.current.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
  }, []);

  useEffect(() => { loadEvents(); loadTasks(); }, []);

  const loadEvents = async () => {
    try {
      setEvents(await calendarService.getEvents());
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const all = await taskService.getTasks();
      setTasks(all.filter(t => t.deadline && t.deadline !== 'No deadline'));
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const getTasksForCell = (date: Date, slot: string) => {
    const dateStr = formatDate(date);
    const slotHour = slot.split(':')[0];
    return tasks.filter(t => {
      const [taskDate, taskTime] = t.deadline.split(' ');
      return taskDate === dateStr && taskTime?.split(':')[0] === slotHour;
    });
  };

  const handleTaskClick = (e: React.MouseEvent, task: ITask) => {
    e.stopPropagation();
    const popupW = 280;
    const popupH = 200;
    let x = e.clientX + 12;
    let y = e.clientY;
    if (x + popupW > window.innerWidth) x = e.clientX - popupW - 12;
    if (y + popupH > window.innerHeight) y = window.innerHeight - popupH - 10;
    setTaskPreview({ task, x, y });
  };

  const handleToggleTaskDone = async () => {
    if (!taskPreview) return;
    const updated = { ...taskPreview.task, isDone: !taskPreview.task.isDone };
    await taskService.updateTask(updated);
    setTaskPreview({ ...taskPreview, task: updated });
    window.dispatchEvent(new CustomEvent('taskToggled', { detail: { taskId: updated.id, isDone: updated.isDone } }));
    await loadTasks();
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#FF6B6B';
      case 'Medium': return '#FFB347';
      case 'Low': return '#98D8AA';
      default: return '#AAAAAA';
    }
  };

  useEffect(() => {
    if (!firstRowRef.current) return;
    const update = () => {
      const now = new Date();
      const rowHeight = firstRowRef.current!.getBoundingClientRect().height;
      setLinePosition(now.getHours() * rowHeight + (now.getMinutes() / 60) * rowHeight);
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const getMinutesFromClientY = (clientY: number, snap: 'floor' | 'round' = 'floor'): number => {
    if (!bodyRef.current || !firstRowRef.current) return 0;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const rowHeight = firstRowRef.current.getBoundingClientRect().height;
    const relativeY = clientY - bodyRect.top + bodyRef.current.scrollTop;
    const raw = relativeY / rowHeight * 60;
    const snapped = snap === 'floor' ? Math.floor(raw / 15) * 15 : Math.round(raw / 15) * 15;
    return Math.max(0, Math.min(23 * 60 + 45, snapped));
  };

  const getColumnLayout = () => {
    const bodyWidth = bodyRef.current?.clientWidth ?? 640;
    const colWidth = (bodyWidth - 80) / 7;
    return { colWidth, colLeft: (i: number) => 80 + i * colWidth };
  };

  const dragStartClient = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleCellMouseDown = (dayIndex: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setGhostEvent(null);
    setPopupPosition(null);
    dragStartClient.current = { x: e.clientX, y: e.clientY };
    const startMinutes = getMinutesFromClientY(e.clientY, 'floor');
    setDragState({ dayIndex, startMinutes, currentMinutes: startMinutes });
  };

  const handleBodyMouseMove = (e: React.MouseEvent) => {
    if (!dragState) return;
    const current = getMinutesFromClientY(e.clientY, 'round');
    const currentMinutes = Math.max(current, dragState.startMinutes + 15);
    if (currentMinutes !== dragState.currentMinutes)
      setDragState({ ...dragState, currentMinutes });
  };

  const handleBodyMouseUp = (e: React.MouseEvent) => {
    if (!dragState) return;
    const dy = e.clientY - dragStartClient.current.y;
    const isClick = dy < 25;

    if (isClick) {
      // open popup at the clicked cell position
      const popupWidth = 320;
      const popupHeight = 500;
      const { colWidth, colLeft } = getColumnLayout();
      const cellRight = (bodyRef.current?.getBoundingClientRect().left ?? 0) + colLeft(dragState.dayIndex) + colWidth;
      let x = cellRight + 10;
      let y = e.clientY;
      if (x + popupWidth > window.innerWidth) x = (bodyRef.current?.getBoundingClientRect().left ?? 0) + colLeft(dragState.dayIndex) - popupWidth - 10;
      if (y + popupHeight > window.innerHeight) y = window.innerHeight - popupHeight - 10;
      if (y < 10) y = 10;
      const startTime = minutesToTime(dragState.startMinutes);
      const endTime = minutesToTime(dragState.startMinutes + 60);
      setFormData({ title: "", startTime, endTime, location: "", description: "", recurrence: "none", recurrenceEndType: "count", recurrenceCount: 1, recurrenceEndDate: "", color: "#A7C7E7", isAllDay: false, reminderMinutes: 0 });
      setPopupPosition({ x, y, date: weekDates[dragState.dayIndex], time: startTime });
      setDragState(null);
      return;
    }

    const endMinutes = dragState.currentMinutes;
    setGhostEvent({
      dayIndex: dragState.dayIndex,
      date: weekDates[dragState.dayIndex],
      startMinutes: dragState.startMinutes,
      endMinutes,
      title: '',
    });
    setDragState(null);
    isDragging.current = false;
    setTimeout(() => ghostInputRef.current?.focus(), 50);
  };

  const createEventFromGhost = async () => {
    if (!ghostEvent) return;
    try {
      await calendarService.createEvent({
        title: ghostEvent.title || 'New Event',
        date: formatDate(ghostEvent.date),
        startTime: minutesToTime(ghostEvent.startMinutes),
        endTime: minutesToTime(ghostEvent.endMinutes),
        color: '#A7C7E7',
        recurrence: 'none',
        isAllDay: false,
      });
      await loadEvents();
      setGhostEvent(null);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const openMoreOptions = () => {
    if (!ghostEvent || !bodyRef.current) return;
    const bodyRect = bodyRef.current.getBoundingClientRect();
    const scrollTop = bodyRef.current.scrollTop;
    const { colLeft, colWidth } = getColumnLayout();
    const ghostTop = (ghostEvent.startMinutes / 60) * ROW_HEIGHT - scrollTop + bodyRect.top;
    const popupWidth = 320;
    const popupHeight = 500;
    let x = bodyRect.left + colLeft(ghostEvent.dayIndex) + colWidth + 10;
    let y = ghostTop;
    if (x + popupWidth > window.innerWidth) x = bodyRect.left + colLeft(ghostEvent.dayIndex) - popupWidth - 10;
    if (y + popupHeight > window.innerHeight) y = window.innerHeight - popupHeight - 10;
    if (y < 10) y = 10;

    setFormData({
      title: ghostEvent.title,
      startTime: minutesToTime(ghostEvent.startMinutes),
      endTime: minutesToTime(ghostEvent.endMinutes),
      location: "", description: "", recurrence: "none",
      recurrenceEndType: "count", recurrenceCount: 1, recurrenceEndDate: "",
      color: "#A7C7E7", isAllDay: false, reminderMinutes: 0
    });
    setGhostEvent(null);
    setPopupPosition({ x, y, date: ghostEvent.date, time: minutesToTime(ghostEvent.startMinutes) });
  };

  const saveEvent = async () => {
    if (!popupPosition) return;
    try {
      const isRepeating = formData.recurrence !== 'none';
      const payload = {
        title: formData.title || 'New Event',
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
      };
      if (editingEventId !== null) {
        await calendarService.updateEvent(editingEventId, payload);
      } else {
        await calendarService.createEvent(payload);
      }
      await loadEvents();
      setPopupPosition(null);
      setEditingEventId(null);
    } catch (e) {
      console.error('Failed to save event:', e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, event: ev });
  };

  const handleEditEvent = () => {
    if (!contextMenu) return;
    const ev = contextMenu.event;
    const realId = ev.originalEventId ?? ev.id;
    const realEvent = events.find(e => e.id === realId) ?? ev;
    setEditingEventId(realId);
    setFormData({
      title: realEvent.title,
      startTime: realEvent.startTime,
      endTime: realEvent.endTime,
      location: realEvent.location ?? "",
      description: realEvent.description ?? "",
      recurrence: realEvent.recurrence ?? "none",
      recurrenceEndType: realEvent.recurrenceEndDate ? "date" : "count",
      recurrenceCount: realEvent.recurrenceCount ?? 1,
      recurrenceEndDate: realEvent.recurrenceEndDate ?? "",
      color: realEvent.color,
      isAllDay: realEvent.isAllDay ?? false,
      reminderMinutes: realEvent.reminderMinutes ?? 0,
    });
    const popupWidth = 320;
    const popupHeight = 500;
    let x = contextMenu.x + 8;
    let y = contextMenu.y;
    if (x + popupWidth > window.innerWidth) x = contextMenu.x - popupWidth - 8;
    if (y + popupHeight > window.innerHeight) y = window.innerHeight - popupHeight - 10;
    if (y < 10) y = 10;
    setPopupPosition({ x, y, date: new Date(realEvent.date), time: realEvent.startTime });
    setContextMenu(null);
  };

  const handleDeleteEvent = async () => {
    if (!contextMenu) return;
    const realId = contextMenu.event.originalEventId ?? contextMenu.event.id;
    setContextMenu(null);
    try {
      await calendarService.deleteEvent(realId);
      await loadEvents();
    } catch (e) {
      console.error('Failed to delete event:', e);
    }
  };

  const getEventsForCell = (date: Date, slot: string) => {
    const dateStr = formatDate(date);
    const slotHour = slot.split(":")[0];
    return events.filter(ev =>
      ev.date === dateStr &&
      ev.startTime.split(":")[0] === slotHour &&
      (activeColors.size === 0 || activeColors.has(ev.color))
    );
  };

  const isRecurringCopy = (eventId: number, originalDate: string, currentDate: string) =>
    eventId.toString().length > 6 && currentDate !== originalDate;

  const colorOptions = [
    { value: "#A7C7E7", label: "Blue" },
    { value: "#FFB3BA", label: "Pink" },
    { value: "#B5EAD7", label: "Green" },
    { value: "#FFDAC1", label: "Orange" },
    { value: "#E2F0CB", label: "Light Green" },
    { value: "#C7CEE6", label: "Purple" },
  ];

  const { colWidth, colLeft } = getColumnLayout();

  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-color-filter">
        {colorOptions.map(color => (
          <button
            key={color.value}
            className={`color-filter-dot${activeColors.has(color.value) ? ' active' : ''}`}
            style={{ backgroundColor: color.value }}
            title={color.label}
            onClick={() => toggleColor(color.value)}
          />
        ))}
      </div>
    <div className="calendar-grid">
      <div className="calendar-header" style={{ gridTemplateColumns: `80px repeat(${weekDates.length}, 1fr)` }}>
        <div className="calendar-header-empty" />
        {displayDays.map((day, index) => {
          const isHighlight = view === 'day' ? isToday : (isCurrentWeek && index === todayIndex);
          return (
            <div key={index} className={"calendar-header-cell" + (isHighlight ? " is-today" : "") + (compactHeader ? " compact" : "")}>
              <div className="day-name">{compactHeader ? day[0] : day}</div>
              <div className={"day-number" + (isHighlight ? " today-number" : "")}>
                {weekDates[index].getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={"calendar-body" + (dragState ? " is-dragging" : "")}
        ref={bodyRef}
        onMouseMove={handleBodyMouseMove}
        onMouseUp={handleBodyMouseUp}
        onMouseLeave={() => {
          if (dragState) {
            setDragState(null);
            isDragging.current = false;
          }
        }}
      >
        {isCurrentWeek && <div className="current-time-line" style={{ top: `${linePosition}px` }} />}

        {/* drag preview overlay — only show when dragged far enough */}
        {dragState && dragState.currentMinutes - dragState.startMinutes >= 15 && (() => {
          const startMin = dragState.startMinutes;
          const endMin = dragState.currentMinutes;
          return (
            <div
              className="drag-preview"
              style={{
                left: colLeft(dragState.dayIndex) + 2,
                width: colWidth - 4,
                top: (startMin / 60) * ROW_HEIGHT,
                height: Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 20),
              }}
            >
              <span className="drag-preview-time">
                {minutesToTime(startMin)} – {minutesToTime(endMin)}
              </span>
            </div>
          );
        })()}

        {/* ghost event (after mouse up) */}
        {ghostEvent && (
          <div
            className="ghost-event"
            style={{
              left: colLeft(ghostEvent.dayIndex) + 2,
              width: colWidth - 4,
              top: (ghostEvent.startMinutes / 60) * ROW_HEIGHT,
              height: Math.max(((ghostEvent.endMinutes - ghostEvent.startMinutes) / 60) * ROW_HEIGHT, 48),
            }}
          >
            <input
              ref={ghostInputRef}
              className="ghost-event-input"
              placeholder="New Event"
              value={ghostEvent.title}
              onChange={(e) => setGhostEvent({ ...ghostEvent, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') createEventFromGhost();
                if (e.key === 'Escape') setGhostEvent(null);
              }}
            />
            <div className="ghost-event-footer">
              <span className="ghost-event-time">
                {minutesToTime(ghostEvent.startMinutes)} – {minutesToTime(ghostEvent.endMinutes)}
              </span>
              <button className="ghost-more-btn" onClick={openMoreOptions}>More</button>
            </div>
          </div>
        )}

        {timeSlots.map((slot, i) => (
          <div key={slot} className="calendar-row" ref={i === 0 ? firstRowRef : null} style={{ gridTemplateColumns: `80px repeat(${weekDates.length}, 1fr)` }}>
            <div className="calendar-time-label">{slot}</div>
            <div className="calendar-row-cells">
              {displayDays.map((_day, index) => {
                const cellDate = weekDates[index];
                const cellEvents = getEventsForCell(cellDate, slot);
                return (
                  <div
                    key={index + slot}
                    className={"calendar-cell" + ((view === 'day' ? isToday : isCurrentWeek && index === todayIndex) ? " is-today" : "")}
                    onMouseDown={(e) => handleCellMouseDown(index, e)}
                  >
                    {(() => {
                      const cellTasks = getTasksForCell(cellDate, slot);
                      if (!cellTasks.length) return null;
                      const count = cellTasks.length;
                      const minTop = Math.min(...cellTasks.map(t => {
                        const minutes = Number(t.deadline.split(' ')[1]?.split(':')[1] ?? 0);
                        return Math.round((minutes / 60) * ROW_HEIGHT);
                      }));
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, right: '2px', bottom: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                          {cellTasks.map((task, idx) => {
                            const w = `calc(100% / ${count} - 2px)`;
                            const l = `calc(100% / ${count} * ${idx} + 1px)`;
                            return (
                              <div
                                key={`task-${task.id}`}
                                className="calendar-task-deadline"
                                style={{ backgroundColor: priorityColor(task.priority), top: `${minTop}px`, opacity: task.isDone ? 0.5 : 1, left: l, width: w, right: 'auto', pointerEvents: 'auto' }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => handleTaskClick(e, task)}
                              >
                                <span className="calendar-task-deadline-title">⬦ {task.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    {cellEvents.map((ev) => {
                      const duration = getDurationInMinutes(ev.startTime, ev.endTime);
                      const startMinutes = Number(ev.startTime.split(":")[1]);
                      const topOffset = (startMinutes / 60) * ROW_HEIGHT;
                      const height = (duration / 60) * ROW_HEIGHT;
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
                          onMouseDown={(e) => e.stopPropagation()}
                          onContextMenu={(e) => handleContextMenu(e, ev)}
                        >
                          <div className="calendar-event-title">
                            {ev.title}{isRecurring && ' 🔄'}
                          </div>
                          {ev.location && <div className="calendar-event-location">📍 {ev.location}</div>}
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

      {/* backdrop to close ghost on outside click */}
      {ghostEvent && (
        <div className="ghost-backdrop" onClick={() => setGhostEvent(null)} />
      )}

      {popupPosition && (
        <>
          <div className="popup-backdrop" onClick={() => setPopupPosition(null)} />
          <div
            className="event-popup-modern"
            style={{ position: 'fixed', top: popupPosition.y, left: popupPosition.x, maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header">
              <h4>Add Event</h4>
              <button className="popup-close" onClick={() => setPopupPosition(null)}>×</button>
            </div>
            <div className="popup-content">
              <input
                type="text" placeholder="Event title" value={formData.title} autoFocus
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="popup-input"
              />
              <div className="popup-time-row">
                <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="popup-time-input" />
                <span>→</span>
                <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="popup-time-input" />
              </div>
              <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="popup-input" />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="popup-textarea" />
              <div className="popup-row">
                <select value={formData.recurrence} onChange={(e) => setFormData({...formData, recurrence: e.target.value as any})} className="popup-select">
                  <option value="none">No repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <select value={formData.reminderMinutes} onChange={(e) => setFormData({...formData, reminderMinutes: Number(e.target.value)})} className="popup-select">
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
                    <button className={`recurrence-end-btn${formData.recurrenceEndType === 'count' ? ' active' : ''}`} onClick={() => setFormData({...formData, recurrenceEndType: 'count'})}>After N times</button>
                    <button className={`recurrence-end-btn${formData.recurrenceEndType === 'date' ? ' active' : ''}`} onClick={() => setFormData({...formData, recurrenceEndType: 'date'})}>By date</button>
                  </div>
                  {formData.recurrenceEndType === 'count' ? (
                    <div className="popup-recurrence-count-row">
                      <label>Repeat</label>
                      <input type="number" min={1} max={365} value={formData.recurrenceCount} onChange={(e) => setFormData({...formData, recurrenceCount: Math.max(1, Number(e.target.value))})} className="popup-input popup-count-input" />
                      <label>times</label>
                    </div>
                  ) : (
                    <input type="date" value={formData.recurrenceEndDate} min={formatDate(popupPosition.date)} onChange={(e) => setFormData({...formData, recurrenceEndDate: e.target.value})} className="popup-input" />
                  )}
                </div>
              )}
              <div className="popup-colors">
                {colorOptions.map(color => (
                  <button key={color.value} className={`popup-color ${formData.color === color.value ? 'active' : ''}`} style={{ backgroundColor: color.value }} onClick={() => setFormData({...formData, color: color.value})} title={color.label} />
                ))}
              </div>
              <div className="popup-actions">
                <button className="popup-cancel" onClick={() => { setPopupPosition(null); setEditingEventId(null); }}>Cancel</button>
                <button className="popup-create" onClick={saveEvent}>{editingEventId !== null ? 'Save' : 'Create'}</button>
              </div>
            </div>
          </div>
        </>
      )}

      {taskPreview && (
        <>
          <div className="popup-backdrop" onClick={() => setTaskPreview(null)} />
          <div
            className="task-preview-popup"
            style={{ position: 'fixed', top: taskPreview.y, left: taskPreview.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="task-preview-row">
              <input
                type="checkbox"
                className={`task-preview-checkbox priority-${taskPreview.task.priority?.toLowerCase()}`}
                checked={taskPreview.task.isDone}
                onChange={handleToggleTaskDone}
              />
              <span className={`task-preview-title ${taskPreview.task.isDone ? 'done' : ''}`}>
                {taskPreview.task.title}
              </span>
            </div>
            {taskPreview.task.description && (
              <p className="task-preview-desc">{taskPreview.task.description}</p>
            )}
            <div className="task-preview-meta">
              <Calendar size={12} className="task-preview-meta-icon" />
              <span className="task-preview-deadline">{taskPreview.task.deadline}</span>
              {taskPreview.task.priority && (
                <Flag
                  size={13}
                  style={{ color: priorityColor(taskPreview.task.priority), marginLeft: 6 }}
                  fill={priorityColor(taskPreview.task.priority)}
                />
              )}
            </div>
          </div>
        </>
      )}

      {contextMenu && (
        <>
          <div className="context-backdrop" onClick={() => setContextMenu(null)} />
          <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
            <button className="context-menu-item" onClick={handleEditEvent}>Edit</button>
            <button className="context-menu-item context-menu-item--danger" onClick={handleDeleteEvent}>
              {contextMenu.event.originalEventId ? 'Delete series' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  );
};

export default CalendarGrid;
