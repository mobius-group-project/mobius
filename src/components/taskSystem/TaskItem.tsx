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
  comments?: string[];
}

interface Props {
  task: ITask;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
  dragHandleProps?: any;
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
};

const TaskItem: React.FC<Props> = ({ task, onToggle, onDelete, onUpdateTask, dragHandleProps }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [seconds, setSeconds] = useState(task.timeSpent || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    let interval: any;
    if (isTracking && !task.isDone) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, task.isDone]);

  useEffect(() => {
    if (!isTracking && seconds !== task.timeSpent) {
      onUpdateTask({ ...task, timeSpent: seconds });
    }
  }, [isTracking, seconds]);

  const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : '';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
  };

  const handleToggle = () => {
    setIsTracking(false);
    onToggle();
  };

  const handleTimerToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTracking(!isTracking);
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

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const updatedComments = [...(task.comments || []), newComment.trim()];
    onUpdateTask({ ...task, comments: updatedComments });
    setNewComment('');
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
    <>
      <div className={`task-item ${task.isDone ? 'task-completed' : ''} ${priorityClass} ${isDeleting ? 'task-deleting' : ''}`}>
        <div {...dragHandleProps} className="drag-handle-area" />
        
        <input 
          type="checkbox" 
          checked={task.isDone} 
          onChange={handleToggle}
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
              <button 
                className={`comment-task-btn ${task.comments && task.comments.length > 0 ? 'has-comments' : ''}`} 
                onClick={handleComment}
              >
                <MessageSquare size={16} />
                {task.comments && task.comments.length > 0 && (
                  <span className="comments-badge">{task.comments.length}</span>
                )}
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
                onClick={handleTimerToggle}
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

      {showComments && (
        <div className="task-comments" onClick={(e) => e.stopPropagation()}>
          <div className="comments-header">
            <span>Comments ({task.comments?.length || 0})</span>
            <button className="close-comments" onClick={() => setShowComments(false)}>✕</button>
          </div>
          <div className="comments-list">
            {task.comments?.map((comment, idx) => (
              <div key={idx} className="comment-item">{comment}</div>
            ))}
            {(!task.comments || task.comments.length === 0) && (
              <div className="no-comments">No comments yet</div>
            )}
          </div>
          <div className="comments-input">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            />
            <button onClick={handleAddComment}>Send</button>
          </div>
        </div>
      )}
    </>
  );
};

export default TaskItem;