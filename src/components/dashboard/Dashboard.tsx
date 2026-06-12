import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Calendar, Clock } from 'lucide-react';
import type { ITask } from '../../services/taskService';
import { calendarService, type CalendarEvent } from '../../services/calendarService';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { PixelPlant, type PlantType } from '../focus/FocusTimer';
import './Dashboard.css';

interface DashboardProps {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderTasks: (tasks: ITask[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onToggleTask,
  onDelete,
  onReorderTasks,
}) => {
  const navigate = useNavigate();
  const [priorityFilters, setPriorityFilters] = useState<('High' | 'Medium' | 'Low')[]>([]);

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
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-grid">
        {/* Today's Task List */}
        <div className="dashboard-card task-list-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
              Today's Task List
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

          <button
            onClick={() => navigate('/tasks')}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {filteredTasks.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'left' }}>No tasks</p>
            ) : (
              filteredTasks.map((task, idx) => {
                const priorityColor = task.priority === 'High' ? '#ff6b6b' : task.priority === 'Medium' ? '#ffa500' : '#51cf66';
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      handleDragStart(e, idx);
                      e.currentTarget.style.opacity = '0.5';
                      e.currentTarget.style.transform = 'scale(0.97)';
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragOver={handleDragOver}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.draggable) return;
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={task.isDone}
                        onChange={() => onToggleTask(task.id)}
                        style={{ accentColor: '#f6fe9a', flexShrink: 0 }}
                      />
                      <span style={{
                        fontSize: '15px',
                        color: task.isDone ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        textDecoration: task.isDone ? 'line-through' : 'none',
                        textAlign: 'left',
                        wordBreak: 'break-word',
                      }}>
                        {task.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatTime(task.timeSpent || 0)}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          background: priorityColor,
                          color: 'white',
                          fontWeight: 600,
                          lineHeight: '16px',
                        }}
                      >
                        {task.priority}
                      </span>
                      <span
                        style={{ cursor: 'grab', color: 'var(--color-text-secondary)', fontSize: '16px', userSelect: 'none', lineHeight: 1 }}
                        title="Drag to reorder"
                      >
                        ⋮
                      </span>
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
  const [notes] = React.useState<string[]>([]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Notes
        </h2>
        <button style={{ background: '#f6fe9a', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', color: '#1a1a1a' }}>
          +
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', minHeight: '0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Today</div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>No notes yet</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
