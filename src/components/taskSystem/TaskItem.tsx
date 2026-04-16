import React, { useState, useEffect } from 'react';
import { Calendar, Play, Pause, Flag, Trash2, Pencil, MessageSquare } from 'lucide-react';
import './styles/TaskItem.css';
import EditTaskForm from './EditTaskForm';
import ConfirmDialog from '../ConfirmDialog';

export interface ITask {
  id: string;
  title: string;
  isDone: boolean;
  deadline: string;
  description?: string;
  timeSpent: number;
  priority?: 'High' | 'Medium' | 'Low';
}

interface Props {
  task: ITask;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
};

const TaskItem: React.FC<Props> = ({ task, onToggle, onDelete, onUpdateTask }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [seconds, setSeconds] = useState(task.timeSpent || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isTracking && !task.isDone) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, task.isDone]);

  const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : '';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleEdit = () => {
  setIsEditing(true);
};

const handleComment = () => {
  console.log('Comments - will be implemented later');
};

  const handleConfirmDelete = () => {
  setIsDeleting(true); 
  setTimeout(() => {
    onDelete(task.id); 
    setShowConfirm(false);
  }, 300); 
};

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

    if (isEditing) {
    return (
      <div className={`task-item ${priorityClass}`}>
        <EditTaskForm
          task={task}
          onSave={(updatedTask) => {
            onUpdateTask(updatedTask);
            setIsEditing(false);
          }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

return (
    <div className={`task-item ${task.isDone ? 'task-completed' : ''} ${priorityClass} ${isDeleting ? 'task-deleting' : ''}`}>
      <input 
        type="checkbox" 
        checked={task.isDone} 
        onChange={() => {
          setIsTracking(false); 
          onToggle();
        }}
        className="task-checkbox"
      />
      
      <div className="task-info">
        <div className="task-header">
          <span className={`task-title ${task.isDone ? 'is-done' : ''}`}>
            {task.title}
          </span>
          <div className="task-actions">
            <button className="edit-task-btn" onClick={handleEdit}>
              <Pencil size={16} />
            </button>
            <button className="comment-task-btn" onClick={handleComment}>
              <MessageSquare size={16} />
            </button>
            <button className="delete-task-btn" onClick={handleDelete}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {task.description && (
          <p className="task-description">
            {task.description}
          </p>
        )}
        
        <div className="task-footer">
          <div className="task-meta-left">
            <div className="task-deadline">
              <Calendar size={12} className="calendar-icon" />
              <span className="deadline-date">{task.deadline}</span>
            </div>

            {task.priority && (
              <Flag 
                size={14} 
                className={`priority-icon ${task.priority.toLowerCase()}`} 
                fill="currentColor" 
              />
            )}
          </div>

          <div className="task-time-controls">
            <span className="task-timer-display">{formatTime(seconds)}</span>
            <button 
              className="control-btn toggle-timer" 
              onClick={() => setIsTracking(!isTracking)}
              disabled={task.isDone}
            >
              {isTracking ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"?`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default TaskItem;