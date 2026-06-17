import React, { useState, useEffect, useRef, useCallback } from 'react';
import TaskForm from '../taskSystem/AddTaskForm';
import { useNavigate } from 'react-router-dom';
import { Flag, Calendar, Clock } from 'lucide-react';
import type { ITask } from '../../services/taskService';
import { calendarService, type CalendarEvent } from '../../services/calendarService';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { PixelPlant, type PlantType } from '../focus/FocusTimer';
import { useNotes } from '../../hooks/useNotes';
import { type useActivityTracker } from '../../hooks/useActivityTracker';
import './Dashboard.css';

interface DashboardProps {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderTasks: (tasks: ITask[]) => void;
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  activityTracker: ReturnType<typeof useActivityTracker>;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onToggleTask,
  onDelete,
  onReorderTasks,
  onAddTask,
  activityTracker,
}) => {
  const navigate = useNavigate();
  const [priorityFilters, setPriorityFilters] = useState<('High' | 'Medium' | 'Low')[]>([]);
  const [isAdding, setIsAdding] = useState(false);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex === toIndex) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorderTasks(reordered);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const filteredTasks = priorityFilters.length === 0
    ? tasks
    : tasks.filter(task => priorityFilters.includes(task.priority));

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Today's Task List */}
        <div className="dashboard-card task-list-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
              Tasks
            </h2>
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
                    {/* Circular priority checkbox */}
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

                    {/* Task info */}
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
        </div>

        {/* Focused Widget */}
        <div className="dashboard-card focused-card">
          <FocusedCard />
        </div>

        {/* Notes Card */}
        <div className="dashboard-card notes-card">
          <NotesCard />
        </div>
      </div>
    </div>
  );
};

// Calendar Card Component
const CalendarCard: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    calendarService.getEvents().then(setEvents).catch(() => {});
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
        date: date.getDate(),
        dateStr: date.toISOString().split('T')[0],
      };
    });
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const getEventsForCell = (dateStr: string, hour: string) => {
    return events.filter((ev: CalendarEvent) =>
      ev.date === dateStr && ev.startTime && ev.startTime.startsWith(hour.substring(0, 2))
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Weekly Calendar
        </h2>
        <button
          onClick={() => navigate('/calendar')}
          style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
          title="Open Calendar"
        >
          <Calendar size={18} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '45px ' + Array(7).fill('1fr').join(' '), gap: '0', fontSize: '11px', borderRadius: '6px 6px 0 0', background: 'rgba(0, 0, 0, 0.2)', flexShrink: 0 }}>
          <div></div>
          {weekDays.map((day, idx) => (
            <div key={idx} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{day.name}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{day.date}</div>
            </div>
          ))}
        </div>

        <div style={{ overflowY: 'auto', maxHeight: '430px', display: 'grid', gridTemplateColumns: '45px ' + Array(7).fill('1fr').join(' '), gap: '0', fontSize: '11px', borderRadius: '0 0 6px 6px', background: 'rgba(0, 0, 0, 0.2)' }}>
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right', padding: '8px 6px', background: 'rgba(0, 0, 0, 0.3)', fontWeight: 600, borderRight: '1px solid rgba(255, 255, 255, 0.05)', position: 'sticky', left: 0 }}>
                {hour}
              </div>
              {weekDays.map((day, dayIdx) => {
                const cellEvents = getEventsForCell(day.dateStr, hour);
                return (
                  <div
                    key={`${hour}-${dayIdx}`}
                    style={{
                      minHeight: '28px',
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRight: dayIdx === 6 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.2s',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'}
                  >
                    {cellEvents.map((ev: CalendarEvent) => (
                      <div
                        key={ev.id}
                        title={ev.title}
                        style={{
                          position: 'absolute',
                          inset: '1px',
                          background: ev.color || '#a7c7e7',
                          borderRadius: '3px',
                          padding: '1px 4px',
                          fontSize: '9px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          zIndex: 1,
                        }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};

// Focused Card Component
const FocusedCard: React.FC = () => {
  const navigate = useNavigate();
  const { state, remainingSeconds, totalSeconds, progress } = useFocusTimer(25);
  const [plantType, setPlantType] = useState<PlantType>('flower');

  useEffect(() => {
    const saved = localStorage.getItem('mobius.focusPlantType.v1') as PlantType | null;
    if (saved) setPlantType(saved);
  }, []);

  const isActive = state === 'running' || state === 'paused';

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // sad face pixel art: 9x9 grid, same style as plants
  const sadPixels: [number, number, string][] = [
    [3,1,'#3a3a4a'],[4,1,'#3a3a4a'],[5,1,'#3a3a4a'],
    [2,2,'#3a3a4a'],[3,2,'#ffe0bd'],[4,2,'#ffe0bd'],[5,2,'#ffe0bd'],[6,2,'#3a3a4a'],
    [1,3,'#3a3a4a'],[2,3,'#ffe0bd'],[3,3,'#ffe0bd'],[4,3,'#ffe0bd'],[5,3,'#ffe0bd'],[6,3,'#ffe0bd'],[7,3,'#3a3a4a'],
    [1,4,'#3a3a4a'],[2,4,'#ffe0bd'],[3,4,'#212121'],[4,4,'#ffe0bd'],[5,4,'#212121'],[6,4,'#ffe0bd'],[7,4,'#3a3a4a'],
    [1,5,'#3a3a4a'],[2,5,'#ffe0bd'],[3,5,'#ffe0bd'],[4,5,'#ffe0bd'],[5,5,'#ffe0bd'],[6,5,'#ffe0bd'],[7,5,'#3a3a4a'],
    [1,6,'#3a3a4a'],[2,6,'#ffe0bd'],[3,6,'#3a3a4a'],[4,6,'#3a3a4a'],[5,6,'#3a3a4a'],[6,6,'#ffe0bd'],[7,6,'#3a3a4a'],
    [2,7,'#3a3a4a'],[3,7,'#ffe0bd'],[4,7,'#ffe0bd'],[5,7,'#ffe0bd'],[6,7,'#3a3a4a'],
    [3,8,'#3a3a4a'],[4,8,'#3a3a4a'],[5,8,'#3a3a4a'],
  ];

  const SadFace: React.FC = () => {
    const cols = 9, rows = 9, cellSize = 22, gap = 2;
    const grid: Record<string, string> = {};
    sadPixels.forEach(([c, r, color]) => { grid[`${r},${c}`] = color; });
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = grid[`${r},${c}`];
        cells.push(
          <div key={`${r},${c}`} style={{
            width: cellSize, height: cellSize,
            background: color ?? 'transparent',
          }} />
        );
      }
    }
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`, gap: `${gap}px`,
        background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px',
      }}>
        {cells}
      </div>
    );
  };

  return (
    <div
      onClick={() => navigate('/focus')}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Focused
        </h2>
        <Clock size={18} color="var(--color-text-primary)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', minHeight: 0 }}>
        {isActive ? (
          <>
            <PixelPlant type={plantType} progress={progress} pixelSize={14} gap={2} />
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f6fe9a', fontVariantNumeric: 'tabular-nums' }}>
              {formatTimer(remainingSeconds)}
            </div>
            <div style={{
              width: '80%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden',
            }}>
              <div style={{ width: `${progress * 100}%`, height: '100%', background: '#9fff5c', borderRadius: '2px', transition: 'width 1s linear' }} />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {state === 'paused' ? 'Paused' : 'Focusing'}
            </span>
          </>
        ) : (
          <>
            <SadFace />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              No active focus
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// Notes Card Component
const NotesCard: React.FC = () => {
  const { notes, loading, addNote, deleteNote } = useNotes();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const insertCheckbox = () => {
    const sel = window.getSelection();
    if (!sel || !editorRef.current) return;
    sel.deleteFromDocument();
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    const range = sel.getRangeAt(0);
    range.insertNode(cb);
    range.setStartAfter(cb);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    editorRef.current.focus();
  };

  const handleSave = async () => {
    const content = editorRef.current?.innerHTML || '';
    if (!title.trim() && !content.trim()) return;
    await addNote(title, content);
    setTitle('');
    if (editorRef.current) editorRef.current.innerHTML = '';
    setShowForm(false);
  };

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
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Notes
        </h2>
        <button
          onClick={() => setShowForm(prev => !prev)}
          style={{ background: '#f6fe9a', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: '#1a1a1a' }}
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
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none', marginBottom: '6px' }}
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
            style={{ width: '100%', minHeight: '60px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', padding: '8px', color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none', cursor: 'text' }}
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
        {loading ? (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Loading...</p>
        ) : notes.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>No notes yet</div>
          </div>
        ) : (
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
                  <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', lineHeight: '1.5', textAlign: 'left' }} dangerouslySetInnerHTML={{ __html: note.content }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Dashboard;
