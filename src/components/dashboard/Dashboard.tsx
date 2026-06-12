import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Calendar } from 'lucide-react';
import type { ITask } from '../../services/taskService';
import { calendarService, type CalendarEvent } from '../../services/calendarService';
import './Dashboard.css';

interface DashboardProps {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onDelete: (id: string) => void;
  onReorderTasks: (tasks: ITask[]) => void;
  activityTracker: any;
}

const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onToggleTask,
  onDelete,
  onReorderTasks,
  activityTracker,
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
          <FocusedCard activityTracker={activityTracker} />
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
const FocusedCard: React.FC<{ activityTracker: any }> = ({ activityTracker }) => {
  const totalSeconds = activityTracker?.getTotalTimeToday() || 0;
  const dailyGoal = 24 * 3600;
  const percentage = Math.min((totalSeconds / dailyGoal) * 100, 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Focused
        </h2>
        <div style={{ fontSize: '20px' }}>⏱️</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '0' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ width: '220px', height: '220px' }} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="45" fill="none" stroke="#2d3748" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="45" fill="none" stroke="#9fff5c" strokeWidth="8"
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 60 60)"
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '40px', fontWeight: 700, color: '#f6fe9a', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {formatTime(totalSeconds)}
          </div>
        </div>
      </div>
    </>
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
