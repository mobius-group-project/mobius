import React, { useState } from 'react';
import { Calendar, Flag, Paperclip, Clock } from 'lucide-react';
import './styles/AddTaskForm.css';

interface Props {
  onAdd: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  onCancel: () => void;
}

const TaskForm: React.FC<Props> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    let formattedDeadline = 'No deadline';
    if (deadlineDate) {
      const time = deadlineTime || '23:59';
      formattedDeadline = `${deadlineDate} ${time}`;
    }
    
    onAdd(title.trim(), formattedDeadline, description.trim() || undefined, priority || undefined);
    
    setTitle('');
    setDescription('');
    setDeadlineDate('');
    setDeadlineTime('');
    setPriority(null);
  };

  const handlePriorityClick = (value: 'High' | 'Medium' | 'Low') => {
    if (priority === value) {
      setPriority(null);
    } else {
      setPriority(value);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date';
    const [_year, month, day] = dateString.split('-');
    return `${day}.${month}`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Time';
    return timeString;
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
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
        rows={3}
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
          <span className="selected-time-label" style={{ color: deadlineTime ? 'var(--color-primary)' : '#888' }}>
            {formatTime(deadlineTime)}
          </span>
          <input
            type="time"
            className="task-time-picker"
            value={deadlineTime}
            onChange={(e) => setDeadlineTime(e.target.value)}
            step="60"
          />
        </div>
        
        <div className="task-priority-buttons">
          <button
            type="button"
            className={`priority-flag ${priority === 'High' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('High')}
            title="High priority"
          >
            <Flag size={16} fill={priority === 'High' ? 'var(--priority-high)' : 'none'} color="var(--priority-high)" />
          </button>
          <button
            type="button"
            className={`priority-flag ${priority === 'Medium' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('Medium')}
            title="Medium priority"
          >
            <Flag size={16} fill={priority === 'Medium' ? 'var(--priority-medium)' : 'none'} color="var(--priority-medium)" />
          </button>
          <button
            type="button"
            className={`priority-flag ${priority === 'Low' ? 'active' : ''}`}
            onClick={() => handlePriorityClick('Low')}
            title="Low priority"
          >
            <Flag size={16} fill={priority === 'Low' ? 'var(--priority-low)' : 'none'} color="var(--priority-low)" />
          </button>
        </div>

        <button 
          type="button"
          className="task-attachment-btn"
          onClick={() => console.log('Attachments - future implementation')}
          title="Attach files (coming soon)"
        >
          <Paperclip size={16} />
        </button>
      </div>
      
      <div className="form-actions">
        <button type="submit" className="save-btn">Add</button>
        <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
      </div>
    </form>
  );
};

export default TaskForm;