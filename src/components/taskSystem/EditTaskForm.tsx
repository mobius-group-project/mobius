import React, { useState } from 'react';
import { Calendar, Flag, Clock } from 'lucide-react';
import type { ITask } from './TaskItem';
import './styles/EditTaskForm.css';

interface EditTaskFormProps {
  task: ITask;
  onSave: (updatedTask: ITask) => void;
  onCancel: () => void;
}

const EditTaskForm: React.FC<EditTaskFormProps> = ({ task, onSave, onCancel }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const parseDeadline = (deadline: string) => {
    if (!deadline || deadline === 'No deadline') return { date: '', hour: '', minute: '' };
    const [date, time] = deadline.split(' ');
    const [hour, minute] = (time || '').split(':');
    return { date: date || '', hour: hour || '', minute: minute || '' };
  };
  const parsed = parseDeadline(task.deadline);
  const [deadlineDate, setDeadlineDate] = useState(parsed.date);
  const [deadlineHour, setDeadlineHour] = useState(parsed.hour);
  const [deadlineMinute, setDeadlineMinute] = useState(parsed.minute);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | null>(task.priority || null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let formattedDeadline = 'No deadline';
    if (deadlineDate) {
      const time = deadlineHour ? `${deadlineHour}:${deadlineMinute || '00'}` : '23:59';
      formattedDeadline = `${deadlineDate} ${time}`;
    }

    const updatedTask: ITask = {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: formattedDeadline,
      priority: priority || task.priority || 'Low'
    };

    onSave(updatedTask);
  };

  const handlePriorityClick = (value: 'High' | 'Medium' | 'Low') => {
    if (priority === value) {
      setPriority(null);
    } else {
      setPriority(value);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date';
    const [_year, month, day] = dateString.split('-');
    return `${day}.${month}`;
  };

  const handleHourChange = (val: string) => {
    setDeadlineHour(val);
    if (val && !deadlineMinute) setDeadlineMinute('00');
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="edit-task-form">
      <input
        autoFocus
        className="edit-task-input-title"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="edit-task-input-description"
        placeholder="Add a description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div className="edit-task-form-row">
        <div className="edit-task-date-wrapper">
          <Calendar size={16} className="edit-calendar-icon-styled" />
          <span className="edit-selected-date-label" style={{ color: deadlineDate ? 'var(--color-primary)' : '#888' }}>
            {formatDate(deadlineDate)}
          </span>
          <input
            type="date"
            className="edit-task-date-picker"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            min={today}
          />
        </div>

        <div className="edit-task-time-wrapper">
          <Clock size={16} className="edit-clock-icon-styled" />
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

        <div className="edit-task-priority-buttons">
          <button
            type="button"
            className={`edit-priority-flag ${priority === 'High' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('High')}
          >
            <Flag size={16} fill={priority === 'High' ? 'var(--priority-high)' : 'none'} color="var(--priority-high)" />
          </button>
          <button
            type="button"
            className={`edit-priority-flag ${priority === 'Medium' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('Medium')}
          >
            <Flag size={16} fill={priority === 'Medium' ? 'var(--priority-medium)' : 'none'} color="var(--priority-medium)" />
          </button>
          <button
            type="button"
            className={`edit-priority-flag ${priority === 'Low' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('Low')}
          >
            <Flag size={16} fill={priority === 'Low' ? 'var(--priority-low)' : 'none'} color="var(--priority-low)" />
          </button>
        </div>

      </div>

      <div className="edit-task-actions">
        <button type="submit" className="edit-save-btn">Save</button>
        <button type="button" onClick={onCancel} className="edit-cancel-btn">Cancel</button>
      </div>
    </form>
  );
};

export default EditTaskForm;