import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-grid">
        {/* Today's Task List */}
        <div className="dashboard-card task-list-card">
          <TaskListCard />
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

// Task List Card Component
const TaskListCard: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<('High' | 'Medium' | 'Low')[]>([]);

  React.useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data.slice(0, 5)))
      .catch(err => console.error(err));
  }, []);

  const handlePriorityFilter = (priority: 'High' | 'Medium' | 'Low') => {
    setPriorityFilters(prev => {
      if (prev.includes(priority)) {
        // Remove if already selected
        return prev.filter(p => p !== priority);
      } else {
        // Add if not selected and less than 2 are selected
        if (prev.length < 2) {
          return [...prev, priority];
        }
        return prev;
      }
    });
  };

  return (
    <>
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
        style={{
          background: 'linear-gradient(135deg, #f6fe9a 0%, #e8ff66 100%)',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No tasks</p>
        ) : (
          tasks
            .filter(task => priorityFilters.length === 0 || priorityFilters.includes(task.priority))
            .map(task => (
              <div
                key={task.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <input type="checkbox" defaultChecked={task.isDone} style={{ accentColor: '#f6fe9a' }} />
                  <span style={{ color: task.isDone ? 'var(--color-text-secondary)' : 'var(--color-text-primary)', textDecoration: task.isDone ? 'line-through' : 'none' }}>
                    {task.title}
                  </span>
                </div>
                <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', background: '#ff6b6b', color: 'white' }}>
                  {task.priority}
                </span>
              </div>
            ))
        )}
      </div>
    </>
  );
};

// Calendar Card Component
const CalendarCard: React.FC = () => {
  const getDays = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return { name: day, date: date.getDate() };
    });
  };

  const days = getDays();
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f6fe9a' }}>
          Weekly Calendar
        </h2>
        <button style={{ background: 'none', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '18px' }}>📅</button>
      </div>

      {/* Day headers and scrollable grid wrapper - no gap between them */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, minHeight: 0 }}>
        {/* Day headers - fixed */}
        <div style={{ display: 'grid', gridTemplateColumns: '45px ' + Array(7).fill('1fr').join(' '), gap: '0', fontSize: '11px', borderRadius: '6px 6px 0 0', background: 'rgba(0, 0, 0, 0.2)', flexShrink: 0 }}>
          <div></div>
          {days.map((day, idx) => (
            <div key={idx} style={{ textAlign: 'center', padding: '6px 2px', background: 'rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{day.name}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{day.date}</div>
            </div>
          ))}
        </div>

        {/* Scrollable hours and cells */}
        <div style={{ overflowY: 'auto', maxHeight: '430px', display: 'grid', gridTemplateColumns: '45px ' + Array(7).fill('1fr').join(' '), gap: '0', fontSize: '11px', borderRadius: '0 0 6px 6px', background: 'rgba(0, 0, 0, 0.2)' }}>
        {/* Hours and cells */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'right', padding: '8px 6px', background: 'rgba(0, 0, 0, 0.3)', fontWeight: 600, borderRight: '1px solid rgba(255, 255, 255, 0.05)', position: 'sticky', left: 0 }}>
              {hour}
            </div>
            {days.map((_, dayIdx) => (
              <div
                key={`${hour}-${dayIdx}`}
                style={{
                  minHeight: '28px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRight: dayIdx === 6 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'}
              ></div>
            ))}
          </React.Fragment>
        ))}
        </div>
      </div>
    </>
  );
};

// Focused Card Component
const FocusedCard: React.FC = () => {
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
            <circle cx="60" cy="60" r="45" fill="none" stroke="#9fff5c" strokeWidth="8" strokeDasharray="282.7" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 60 60)" />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '40px', fontWeight: 700, color: '#f6fe9a', textAlign: 'center', whiteSpace: 'nowrap' }}>
            0h 0m
          </div>
        </div>
      </div>
    </>
  );
};

// Notes Card Component
const NotesCard: React.FC = () => {
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
