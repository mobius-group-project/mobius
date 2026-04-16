import React, { useState, useRef } from 'react';
import { Calendar, Flag, Paperclip } from 'lucide-react';
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
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | null>(task.priority || null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let formattedDeadline = 'No deadline';
    if (deadline) {
      const date = new Date(deadline);
      formattedDeadline = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
      }).replace(',', '');
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

  const handleWrapperClick = () => {
    dateInputRef.current?.showPicker();
  };

  const getCurrentDeadlineLabel = () => {
  if (deadline) {
    return deadline;
  }
  if (task.deadline && task.deadline !== 'No deadline') {
    return task.deadline;
  }
  return "Deadline";
};

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
        <div className="edit-task-deadline-wrapper" onClick={handleWrapperClick}>
          <Calendar size={16} />
          <span className="selected-date-label">
            {getCurrentDeadlineLabel()}
          </span>
          <input
            ref={dateInputRef}
            type="date"
            className="edit-task-deadline-picker"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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