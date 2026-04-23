import React, { useState, useRef } from 'react';
import { Calendar, Flag, Paperclip, Clock } from 'lucide-react';
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
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | null>(task.priority || null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let formattedDeadline = 'No deadline';
    if (deadlineDate) {
      const time = deadlineTime || '23:59';
      formattedDeadline = `${deadlineDate} ${time}`;
    } else if (task.deadline && task.deadline !== 'No deadline') {
      formattedDeadline = task.deadline;
    }

    const updatedTask: ITask = {
      ...task,
      title: title.trim(),
      description: description.trim() || undefined,
      deadline: formattedDeadline,
      priority: priority || undefined
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

  const handleDateWrapperClick = () => {
    dateInputRef.current?.showPicker();
  };

  const handleTimeWrapperClick = () => {
    timeInputRef.current?.showPicker();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Time';
    return timeString;
  };

  const getCurrentDeadlineDisplay = () => {
    if (deadlineDate) {
      return formatDate(deadlineDate);
    }
    if (task.deadline && task.deadline !== 'No deadline') {
      const parts = task.deadline.split(' ');
      if (parts[0]) {
        const [year, month, day] = parts[0].split('-');
        return `${day}.${month}`;
      }
    }
    return 'Date';
  };

  const getCurrentTimeDisplay = () => {
    if (deadlineTime) {
      return formatTime(deadlineTime);
    }
    if (task.deadline && task.deadline !== 'No deadline') {
      const parts = task.deadline.split(' ');
      if (parts[1]) {
        return parts[1];
      }
    }
    return 'Time';
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
        <div className="edit-task-date-wrapper" onClick={handleDateWrapperClick}>
          <Calendar size={16} className="edit-calendar-icon-styled" />
          <span className="edit-selected-date-label" style={{ color: deadlineDate ? 'var(--color-primary)' : '#888' }}>
            {getCurrentDeadlineDisplay()}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            className="edit-task-date-picker"
            value={deadlineDate}
            onChange={(e) => setDeadlineDate(e.target.value)}
            min={today}
          />
        </div>

        <div className="edit-task-time-wrapper" onClick={handleTimeWrapperClick}>
          <Clock size={16} className="edit-clock-icon-styled" />
          <span className="edit-selected-time-label" style={{ color: deadlineTime ? 'var(--color-primary)' : '#888' }}>
            {getCurrentTimeDisplay()}
          </span>
          <input
            ref={timeInputRef}
            type="time"
            className="edit-task-time-picker"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            step="60"
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

        <button 
          type="button"
          className="edit-task-attachment-btn"
          onClick={() => console.log('Attachments - future implementation')}
          title="Attach files (coming soon)"
        >
          <Paperclip size={16} />
        </button>
      </div>

      <div className="edit-task-actions">
        <button type="submit" className="edit-save-btn">Save</button>
        <button type="button" onClick={onCancel} className="edit-cancel-btn">Cancel</button>
      </div>
    </form>
  );
};

export default EditTaskForm;