/**
 * Single task row — renders the checkbox, title, description, deadline, priority flag,
 * inline time tracker controls, action buttons, and the comments panel.
 *
 * Notable patterns:
 *   - `.drag-handle-area` covers the full item at z-index 1; interactive elements
 *     (checkbox, buttons, footer) are lifted to z-index 2 so clicks reach them first.
 *   - `displaySeconds` is computed live: adds the active timer's `seconds` to
 *     `task.timeSpent` only when this specific task is the one being tracked,
 *     so the displayed value ticks in real time without a DB write per tick.
 *   - Edit/delete/comment buttons are hidden (opacity:0) until the row is hovered.
 *   - The comments panel is a fixed-position modal that renders inside the task DOM tree
 *     but uses `position:fixed` so it escapes the scroll container.
 */
import React, { useState } from 'react';
import { Calendar, Play, Pause, Flag, Trash2, Pencil, MessageSquare } from 'lucide-react';
import './styles/TaskItem.css';
import EditTaskForm from './EditTaskForm';
import ConfirmDialog from '../ConfirmDialog';
import { type ITask } from '../../services/taskService';
import { type useActivityTracker } from '../../hooks/useActivityTracker';
export type { ITask } from '../../services/taskService';

/**
 * Props for the {@link TaskItem} component.
 */
interface Props {
  /** The task to render. */
  task: ITask;
  /** Called when the checkbox is toggled. */
  onToggle: () => void;
  /** Called when the task is deleted (after confirmation). */
  onDelete: (id: string) => void;
  /** Called when the task is saved via the inline edit form. */
  onUpdateTask: (task: ITask) => void | Promise<void>;
  /** Called when a comment is added to the task. */
  onAddComment: (taskId: string, comment: string) => void | Promise<void>;
  /** Called when a comment is deleted. */
  onDeleteComment: (taskId: string, commentId: number) => void | Promise<void>;
  /** Props forwarded from dnd-kit `listeners` for drag-and-drop. */
  dragHandleProps?: any;
  /** The activity tracker hook return value for starting/stopping per-task timers. */
  activityTracker: ReturnType<typeof useActivityTracker>;
}

/** Formats a number of seconds into HH:MM:SS. */
const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? '0' + v : v).join(':');
};

/**
 * Renders a single task row with checkbox, title, description, deadline, priority,
 * time tracking controls, comments section, and inline editing.
 */
const TaskItem: React.FC<Props> = ({ task, onToggle, onDelete, onUpdateTask, onAddComment, onDeleteComment, dragHandleProps, activityTracker }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const { state, currentSession, seconds, startTracking, stopTracking } = activityTracker;

  const isThisTaskRunning =
    state === 'running' &&
    currentSession?.isTask === true &&
    currentSession?.taskId === task.id;

  const displaySeconds = isThisTaskRunning ? (task.timeSpent || 0) + seconds : (task.timeSpent || 0);

  const priorityClass = task.priority ? `priority-${task.priority.toLowerCase()}` : '';

  /** Starts or stops the activity tracker for this task. */
  const handleTimerToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisTaskRunning) {
      await stopTracking();
    } else {
      if (state === 'running') {
        await stopTracking();
      }
      await startTracking(task.title, true, task.id);
    }
  };

  /** Toggles the task completion state; stops the timer if it was running. */
  const handleToggle = () => {
    if (isThisTaskRunning) stopTracking();
    onToggle();
  };

  /** Shows the delete confirmation dialog. */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  /** Switches the task row to the inline edit form. */
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  /** Opens the comments section. */
  const handleComment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowComments(true);
  };

  /** Confirms deletion; applies a brief delay for the exit animation. */
  const handleConfirmDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(task.id);
      setShowConfirm(false);
    }, 300);
  };

  /** Submits the comment input if non-empty. */
  const handleAddComment = () => {
    const normalized = newComment.trim();
    if (!normalized) return;
    void onAddComment(task.id, normalized);
    setNewComment('');
  };

  /** Delegates comment deletion to the parent handler. */
  const handleDeleteComment = (commentId: number) => {
    void onDeleteComment(task.id, commentId);
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
      <div className={`task-item ${task.isDone ? 'task-completed' : ''} ${priorityClass} ${isDeleting ? 'task-deleting' : ''} ${isThisTaskRunning ? 'task-tracking' : ''}`}>
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
            <p className="task-description">{task.description}</p>
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
              <span className={`task-timer-display ${isThisTaskRunning ? 'timer-active' : ''}`}>
                {formatTime(displaySeconds)}
              </span>
              <button
                className={`control-btn toggle-timer ${isThisTaskRunning ? 'timer-running' : ''}`}
                onClick={handleTimerToggle}
                disabled={task.isDone}
              >
                {isThisTaskRunning ? (
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
          onCancel={() => setShowConfirm(false)}
        />
      </div>

      {showComments && (
        <div className="task-comments" onClick={(e) => e.stopPropagation()}>
          <div className="comments-header">
            <span>Comments ({task.comments?.length || 0})</span>
            <button className="close-comments" onClick={() => setShowComments(false)}>✕</button>
          </div>
          <div className="comments-list">
            {task.comments?.map((comment) => (
              <div key={comment.id} className="comment-item">
                <span>{comment.content}</span>
                <button
                  className="delete-comment-btn"
                  onClick={() => handleDeleteComment(comment.id)}
                  aria-label="Delete comment"
                >
                  ✕
                </button>
              </div>
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