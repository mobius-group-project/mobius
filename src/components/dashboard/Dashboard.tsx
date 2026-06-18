/**
 * Main dashboard screen, composed of four cards in a CSS grid:
 *   - Task list (with priority filters and drag-to-reorder)
 *   - Weekly calendar (CalendarGrid + three MiniMonthCalendar previews)
 *   - Focus timer (FocusTimer in compact mode)
 *   - Notes (rich-text notes with formatting toolbar)
 *
 * All sub-components that are only used here (MiniMonthCalendar, CalendarCard, NotesCard)
 * are defined in this file rather than split into separate files, since they have no
 * other consumers.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TaskForm from '../taskSystem/AddTaskForm';
import { Flag, Calendar } from 'lucide-react';
import type { ITask } from '../../services/taskService';
import { calendarService, type CalendarEvent } from '../../services/calendarService';
import FocusTimer from '../focus/FocusTimer';
import { useNotes } from '../../hooks/useNotes';
import { type useActivityTracker } from '../../hooks/useActivityTracker';
import './Dashboard.css';

/** Props passed down from the root App component. */
interface DashboardProps {
  /** Full task list — filtering is done locally inside Dashboard. */
  tasks: ITask[];
  /** Toggles the done state of a task by ID. */
  onToggleTask: (id: string) => void;
  /** Permanently deletes a task by ID. */
  onDelete: (id: string) => void;
  /** Replaces the task list with a reordered version after drag-and-drop. */
  onReorderTasks: (tasks: ITask[]) => void;
  /** Creates a new task with the given fields. */
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  /** Activity tracker instance from the parent — passed through but not used directly in this component. */
  activityTracker: ReturnType<typeof useActivityTracker>;
}

/**
 * Root dashboard component.
 * Renders a 2×2 grid of cards and manages local UI state for task filtering,
 * calendar colour filtering, and the inline task creation form.
 */
const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onToggleTask,
  onDelete,
  onReorderTasks,
  onAddTask,
  activityTracker,
}) => {
  /**
   * Active priority filters for the task list. Up to 2 priorities can be active at once.
   * An empty array means "show all".
   */
  const [priorityFilters, setPriorityFilters] = useState<('High' | 'Medium' | 'Low')[]>([]);

  /** Controls whether the inline task creation form is visible. */
  const [isAdding, setIsAdding] = useState(false);

  /**
   * Toggles a priority filter on or off.
   * A maximum of 2 priorities can be active simultaneously to avoid an empty list
   * when the user selects conflicting combinations.
   */
  const handlePriorityFilter = (priority: 'High' | 'Medium' | 'Low') => {
    setPriorityFilters(prev => {
      if (prev.includes(priority)) {
        return prev.filter(p => p !== priority);
      } else {
        if (prev.length < 2) {
          return [...prev, priority];
        }
        return prev;
      }
    });
  };

  /** Stores the source index in the drag payload so handleDrop knows where to move from. */
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  /** Reorders the task list by moving the dragged item to the drop target's position. */
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex === toIndex) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderTasks(reordered);
  };

  /** Required to allow drop events to fire on drag targets. */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  /** Tasks after applying the active priority filters. */
  const filteredTasks = priorityFilters.length === 0
    ? tasks
    : tasks.filter(task => priorityFilters.includes(task.priority));

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Today's Task List */}
        <div className="dashboard-card task-list-card">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handlePriorityFilter('High')}
                style={{
                  background: priorityFilters.includes('High') ? 'rgba(255, 71, 71, 0.15)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Flag size={16} fill={priorityFilters.includes('High') ? '#FF4747' : 'none'} color="#FF4747" />
              </button>
              <button
                onClick={() => handlePriorityFilter('Medium')}
                style={{
                  background: priorityFilters.includes('Medium') ? 'rgba(255, 157, 71, 0.15)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Flag size={16} fill={priorityFilters.includes('Medium') ? '#FF9D47' : 'none'} color="#FF9D47" />
              </button>
              <button
                onClick={() => handlePriorityFilter('Low')}
                style={{
                  background: priorityFilters.includes('Low') ? 'rgba(95, 191, 143, 0.15)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <Flag size={16} fill={priorityFilters.includes('Low') ? '#5FBF8F' : 'none'} color="#5FBF8F" />
              </button>
            </div>
          </div>

          {isAdding ? (
            <TaskForm
              compact
              onAdd={(title, deadline, description, priority) => {
                onAddTask(title, deadline, description, priority);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              style={{
                background: '#f6fe9a',
                color: '#1a1a1a',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '24px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              + Add Task
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {filteredTasks.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'left', padding: '8px 0' }}>No tasks</p>
            ) : (
              filteredTasks.map((task, idx) => {
                const priorityColor = task.priority === 'High' ? '#ff6b6b' : task.priority === 'Medium' ? '#ffa500' : '#51cf66';
                const flagColor = task.priority === 'High' ? 'var(--color-negative)' : task.priority === 'Medium' ? 'var(--color-secondary)' : 'var(--color-positive)';
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => { handleDragStart(e, idx); e.currentTarget.style.opacity = '0.5'; }}
                    onDragEnd={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragOver={handleDragOver}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 4px',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      opacity: task.isDone ? 0.5 : 1,
                    }}
                  >
                    {/* Circular priority checkbox — colour matches the task's priority level. */}
                    <div
                      onClick={() => onToggleTask(task.id)}
                      style={{
                        width: '18px', height: '18px', borderRadius: '50%',
                        border: `2px solid ${priorityColor}`,
                        background: task.isDone ? priorityColor : 'transparent',
                        flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      {task.isDone && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>

                    {/* Task title + deadline + priority flag */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 500,
                        color: task.isDone ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        textDecoration: task.isDone ? 'line-through' : 'none',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        textAlign: 'left',
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Calendar size={10} style={{ color: task.deadline ? flagColor : 'var(--color-text-secondary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', color: task.deadline ? flagColor : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {task.deadline || 'No deadline'}
                        </span>
                        <Flag size={10} fill={flagColor} style={{ color: flagColor, flexShrink: 0 }} />
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Weekly Calendar */}
        <div className="dashboard-card calendar-card">
          <CalendarCard />
          <div style={{ display: 'flex', padding: '8px 0', flexShrink: 0, justifyContent: 'space-between' }}>
            <MiniMonthCalendar year={new Date(new Date().getFullYear(), new Date().getMonth() - 1).getFullYear()} month={(new Date().getMonth() + 11) % 12} />
            <MiniMonthCalendar year={new Date().getFullYear()} month={new Date().getMonth()} />
            <MiniMonthCalendar year={new Date(new Date().getFullYear(), new Date().getMonth() + 1).getFullYear()} month={(new Date().getMonth() + 1) % 12} />
          </div>
        </div>

        {/* Focus Timer Widget */}
        <div className="dashboard-card focused-card">
          <FocusTimer compact />
        </div>

        {/* Notes Card */}
        <div className="dashboard-card notes-card">
          <NotesCard />
        </div>
      </div>
    </div>
  );
};

// ─── MiniMonthCalendar ────────────────────────────────────────────────────────

/** Size of each day cell in CSS px. */
const MINI_CELL = 15;
/** Gap between cells in CSS px. */
const MINI_GAP = 2;

/**
 * Compact read-only month calendar showing a single month.
 * Always renders 42 cells (6 rows × 7 columns) so the grid height is fixed
 * regardless of how many days the month has. Cells outside the current month
 * are shown in a dimmed colour.
 *
 * @param year - Full 4-digit year.
 * @param month - Zero-based month index (0 = January).
 */
const MiniMonthCalendar: React.FC<{ year: number; month: number }> = ({ year, month }) => {
  const today = new Date();
  const monthName = new Date(year, month, 1).toLocaleString('en-US', { month: 'long' });
  // (getDay() + 6) % 7 converts Sunday-first (JS default) to Monday-first week layout.
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  type Cell = { day: number; current: boolean };
  const cells: Cell[] = [];
  // Fill leading cells with the tail of the previous month.
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  // Fill trailing cells with the start of the next month to reach 42 total.
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) cells.push({ day: d, current: false });

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const gridWidth = MINI_CELL * 7 + MINI_GAP * 6;

  return (
    <div style={{ width: `${gridWidth}px`, flexShrink: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '5px' }}>
        {monthName}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${MINI_CELL}px)`, gap: `${MINI_GAP}px` }}>
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} style={{ width: MINI_CELL, height: MINI_CELL, fontSize: '9px', fontWeight: 700, color: '#f6fe9a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div key={i} style={{
            width: MINI_CELL, height: MINI_CELL,
            fontSize: '9px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: cell.current && isToday(cell.day) ? '#f6fe9a' : 'transparent',
            color: cell.current && isToday(cell.day) ? '#000'
              : cell.current ? 'rgba(255,255,255,0.8)'
              : 'rgba(255,255,255,0.2)',
            fontWeight: cell.current && isToday(cell.day) ? 700 : 400,
          }}>{cell.day}</div>
        ))}
      </div>
    </div>
  );
};

// ─── CalendarCard ─────────────────────────────────────────────────────────────

/** First visible hour in the weekly calendar grid (inclusive). */
const HOUR_START = 0;
/** Last visible hour in the weekly calendar grid (exclusive). */
const HOUR_END = 24;

/** Predefined colours the user can assign to calendar events. */
const CALENDAR_COLOR_OPTIONS = [
  "#A7C7E7", "#FFB3BA", "#B5EAD7", "#FFDAC1", "#E2F0CB", "#C7CEE6",
];

/**
 * Weekly calendar card showing events for the current week in a time-grid layout.
 * Hours are displayed from HOUR_START to HOUR_END; events are matched by date and
 * the first two characters of their start time (e.g. "09" matches "09:30").
 * Colour filter buttons in the header let the user show/hide events by colour.
 */
const CalendarCard: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  /** Set of colours currently shown. Empty = all colours visible. */
  const [activeColors, setActiveColors] = useState<Set<string>>(new Set());

  useEffect(() => {
    calendarService.getEvents().then(setEvents).catch(() => {});
  }, []);

  /** Toggles a colour on/off in the active filter set. */
  const toggleColor = (color: string) => {
    setActiveColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color); else next.add(color);
      return next;
    });
  };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  /** Array of 7 day descriptors for the current week, starting on Monday. */
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i);
    return {
      letter: ['M','T','W','T','F','S','S'][i],
      date: d.getDate(),
      dateStr: d.toISOString().split('T')[0],
    };
  });

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) =>
    `${String(i + HOUR_START).padStart(2, '0')}:00`
  );

  /**
   * Returns events for a specific date and hour slot.
   * Matches by hour prefix so e.g. "09:00" catches an event starting at "09:30".
   */
  const getEventsForCell = (dateStr: string, hour: string) =>
    events.filter(ev =>
      ev.date === dateStr &&
      ev.startTime?.startsWith(hour.substring(0, 2)) &&
      (activeColors.size === 0 || activeColors.has(ev.color))
    );

  /** CSS grid-template-columns: fixed 44px time label column + 7 equal day columns. */
  const COL = '44px ' + Array(7).fill('1fr').join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: 'var(--font-main)' }}>
      {/* Month label + colour filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 6px', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
          {today.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {CALENDAR_COLOR_OPTIONS.map(color => (
            <button
              key={color}
              onClick={() => toggleColor(color)}
              style={{
                width: 12, height: 12,
                borderRadius: '50%',
                background: color,
                border: activeColors.has(color) ? '2px solid rgba(255,255,255,0.85)' : '2px solid transparent',
                padding: 0, cursor: 'pointer',
                opacity: activeColors.has(color) ? 1 : 0.45,
                transition: 'opacity 0.15s, border-color 0.15s, transform 0.12s',
                transform: activeColors.has(color) ? 'scale(1.2)' : 'scale(1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: COL, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div />
        {weekDays.map((d, i) => {
          const isToday = d.dateStr === todayStr;
          return (
            <div key={i} style={{ textAlign: 'center', padding: '6px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: isToday ? 'var(--color-primary)' : 'rgba(255,255,255,0.4)' }}>{d.letter}</span>
              <span style={{
                fontSize: '13px', fontWeight: 700,
                color: isToday ? '#000' : 'rgba(255,255,255,0.85)',
                background: isToday ? 'var(--color-primary)' : 'transparent',
                borderRadius: '50%', width: '22px', height: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{d.date}</span>
            </div>
          );
        })}
      </div>

      {/* Scrollable time-grid body */}
      <div className="calendar-scroll" style={{ overflowY: 'auto', flex: 1, minHeight: 0, maxHeight: 360 }}>
        <div style={{ display: 'grid', gridTemplateColumns: COL }}>
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'right', padding: '4px 6px 0', borderRight: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {hour}
              </div>
              {weekDays.map((d, di) => {
                const cellEvents = getEventsForCell(d.dateStr, hour);
                const isToday = d.dateStr === todayStr;
                return (
                  <div key={di} style={{
                    height: '36px', position: 'relative',
                    borderRight: di < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: isToday ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}>
                    {cellEvents.map(ev => (
                      <div key={ev.id} title={ev.title} style={{
                        position: 'absolute', inset: '2px',
                        background: ev.color || '#a7c7e7',
                        borderRadius: '3px', padding: '1px 4px',
                        fontSize: '9px', fontWeight: 600, color: '#1a1a1a',
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>{ev.title}</div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── NotesCard ────────────────────────────────────────────────────────────────

/**
 * Notes panel with a list of saved notes and an inline rich-text editor.
 * The editor uses a contentEditable div with document.execCommand for formatting
 * (bold, italic, underline, strikethrough) and a custom checkbox insertion.
 * Ctrl/Cmd+Enter saves the note without clicking the Save button.
 */
const NotesCard: React.FC = () => {
  const { notes, loading, addNote, deleteNote } = useNotes();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  /** Executes a document.execCommand formatting command and returns focus to the editor. */
  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  /**
   * Inserts a non-editable checkbox at the current cursor position in the editor.
   * A zero-width space is inserted after the checkbox so the cursor has a text node to land in,
   * otherwise browsers may collapse the selection into the non-editable element.
   */
  const insertCheckbox = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return;

    let range: Range;
    if (sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      sel.deleteFromDocument();
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
    }

    const wrapper = document.createElement('span');
    wrapper.setAttribute('contenteditable', 'false');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    wrapper.appendChild(cb);
    range.insertNode(wrapper);

    // Place cursor after the checkbox using a zero-width space text node.
    const afterWrapper = document.createRange();
    afterWrapper.setStartAfter(wrapper);
    afterWrapper.collapse(true);
    const textNode = document.createTextNode('​');
    afterWrapper.insertNode(textNode);
    afterWrapper.setStart(textNode, 1);
    afterWrapper.collapse(true);
    sel.removeAllRanges();
    sel.addRange(afterWrapper);
  };

  /** Saves the current editor content as a new note and resets the form. */
  const handleSave = async () => {
    const content = editorRef.current?.innerHTML || '';
    if (!title.trim() && !content.trim()) return;
    await addNote(title.trim() || 'New note', content);
    setTitle('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setShowForm(false);
  };

  /** Reusable formatting toolbar button that prevents default mousedown to keep editor focus. */
  const ToolBtn: React.FC<{ onClick: () => void; label: React.ReactNode }> = ({ onClick, label }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '4px', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '13px', padding: '4px 8px', lineHeight: 1 }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>Notes</h2>
        <button
          onClick={() => setShowForm(prev => !prev)}
          style={{ background: '#f6fe9a', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          +
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title..."
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none', marginBottom: '6px' }}
          />
          <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
            <ToolBtn onClick={() => exec('bold')} label={<b>B</b>} />
            <ToolBtn onClick={() => exec('italic')} label={<i>I</i>} />
            <ToolBtn onClick={() => exec('underline')} label={<u>U</u>} />
            <ToolBtn onClick={() => exec('strikeThrough')} label={<s>S</s>} />
            <ToolBtn onClick={insertCheckbox} label="☐" />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your note..."
            className="note-editor"
            style={{ width: '100%', boxSizing: 'border-box', minHeight: '60px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', padding: '8px', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none', cursor: 'text' }}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSave(); }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '6px' }}>
            <button
              onClick={() => { setShowForm(false); setTitle(''); if (editorRef.current) editorRef.current.innerHTML = ''; }}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--color-text-secondary)', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{ background: '#f6fe9a', border: 'none', color: '#1a1a1a', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', minHeight: '0' }}>
        {!showForm && loading ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Loading...</p>
        ) : !showForm && notes.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>No notes yet</div>
          </div>
        ) : !showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map(note => (
              <div key={note.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px', textAlign: 'left' }}>{note.title}</div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                {note.content && (
                  <div className="note-content" style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5', textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: note.content }} />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
};

export default Dashboard;
