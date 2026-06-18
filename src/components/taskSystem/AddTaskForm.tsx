import React, { useState } from 'react';
import { Calendar, Flag, Clock } from 'lucide-react';
import './styles/AddTaskForm.css';

/**
 * Props for the {@link TaskForm} component.
 */
interface Props {
  /** Called when the user submits a valid task. Receives title, deadline, optional description and priority. */
  onAdd: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  /** Called when the user cancels creating a task. */
  onCancel: () => void;
  /** If true renders a smaller variant for use inline (e.g., inside the TaskList header). */
  compact?: boolean;
}

/**
 * Form component for creating a new task.
 *
 * Provides inputs for title, description, deadline date/time, and priority.
 * Calls `onAdd` on submit and `onCancel` when the user cancels.
 */
const TaskForm: React.FC<Props> = ({ onAdd, onCancel, compact = false }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('');
  const [deadlineMinute, setDeadlineMinute] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | null>(null);

  /** Validates and submits the form, formatting the deadline and resetting state. */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    let formattedDeadline = 'No deadline';
    if (deadlineDate || deadlineHour) {
      const date = deadlineDate || new Date().toISOString().split('T')[0];
      const time = deadlineHour ? `${deadlineHour}:${deadlineMinute || '00'}` : '23:59';
      formattedDeadline = `${date} ${time}`;
    }
    
    onAdd(title.trim(), formattedDeadline, description.trim() || undefined, priority || undefined);
    
    setTitle('');
    setDescription('');
    setDeadlineDate('');
    setDeadlineHour('');
    setDeadlineMinute('');
    setPriority(null);
  };

  /** Toggles a priority value on/off. */
  const handlePriorityClick = (value: 'High' | 'Medium' | 'Low') => {
    if (priority === value) {
      setPriority(null);
    } else {
      setPriority(value);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  /** Formats a "YYYY-MM-DD" string to "DD.MM" for compact display. */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date';
    const [_year, month, day] = dateString.split('-');
    return `${day}.${month}`;
  };

  /** Ensures minutes default to "00" when an hour is entered without minutes. */
  const handleHourChange = (val: string) => {
    setDeadlineHour(val);
    if (val && !deadlineMinute) setDeadlineMinute('00');
  };

  return (
    <form onSubmit={handleSubmit} className={`task-form${compact ? ' task-form--compact' : ''}`}>
      <input
        autoFocus
        className="task-input-title"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="task-input-description"
        placeholder="Add a description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={compact ? 2 : 3}
      />
      
      <div className="task-form-row">
        <div className="task-date-wrapper">
          <Calendar size={16} className="calendar-icon-styled" />
          <span className="selected-date-label" style={{ color: deadlineDate ? 'var(--color-primary)' : '#888' }}>
            {formatDate(deadlineDate)}
          </span>
          <input
            type="date"
            className="task-date-picker"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            min={today}
          />
        </div>

        <div className="task-time-wrapper">
          <Clock size={16} className="clock-icon-styled" />
          <input
            type="number"
            className="task-time-number"
            min={0}
            max={23}
            placeholder="HH"
            value={deadlineHour}
            onChange={(e) => handleHourChange(e.target.value.padStart(2, '0').slice(-2))}
            onBlur={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) handleHourChange(Math.min(23, Math.max(0, v)).toString().padStart(2, '0'));
            }}
            style={{ color: deadlineHour ? 'var(--color-primary)' : '#888' }}
          />
          <span className="task-time-colon">:</span>
          <input
            type="number"
            className="task-time-number"
            min={0}
            max={59}
            step={5}
            placeholder="MM"
            value={deadlineMinute}
            onChange={(e) => setDeadlineMinute(e.target.value.padStart(2, '0').slice(-2))}
            onBlur={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v)) setDeadlineMinute(Math.min(59, Math.max(0, v)).toString().padStart(2, '0'));
            }}
            style={{ color: deadlineMinute ? 'var(--color-primary)' : '#888' }}
          />
        </div>

        {!compact && (
          <div className="task-priority-buttons">
            <button type="button" className={`priority-flag ${priority === 'High' ? 'active' : ''}`} onClick={() => handlePriorityClick('High')} title="High priority">
              <Flag size={16} fill={priority === 'High' ? 'var(--priority-high)' : 'none'} color="var(--priority-high)" />
            </button>
            <button type="button" className={`priority-flag ${priority === 'Medium' ? 'active' : ''}`} onClick={() => handlePriorityClick('Medium')} title="Medium priority">
              <Flag size={16} fill={priority === 'Medium' ? 'var(--priority-medium)' : 'none'} color="var(--priority-medium)" />
            </button>
            <button type="button" className={`priority-flag ${priority === 'Low' ? 'active' : ''}`} onClick={() => handlePriorityClick('Low')} title="Low priority">
              <Flag size={16} fill={priority === 'Low' ? 'var(--priority-low)' : 'none'} color="var(--priority-low)" />
            </button>
          </div>
        )}
      </div>

      <div className="form-actions">
        {compact && (
          <div className="task-priority-buttons compact-priority-cell">
            <button type="button" className={`priority-flag ${priority === 'High' ? 'active' : ''}`} onClick={() => handlePriorityClick('High')} title="High priority">
              <Flag size={14} fill={priority === 'High' ? 'var(--priority-high)' : 'none'} color="var(--priority-high)" />
            </button>
            <button type="button" className={`priority-flag ${priority === 'Medium' ? 'active' : ''}`} onClick={() => handlePriorityClick('Medium')} title="Medium priority">
              <Flag size={14} fill={priority === 'Medium' ? 'var(--priority-medium)' : 'none'} color="var(--priority-medium)" />
            </button>
            <button type="button" className={`priority-flag ${priority === 'Low' ? 'active' : ''}`} onClick={() => handlePriorityClick('Low')} title="Low priority">
              <Flag size={14} fill={priority === 'Low' ? 'var(--priority-low)' : 'none'} color="var(--priority-low)" />
            </button>
          </div>
        )}
        <button type="submit" className="save-btn">Add</button>
        <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
      </div>
    </form>
  );
};

export default TaskForm;