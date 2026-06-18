/**
 * Standalone task list widget — legacy component, not currently rendered in the dashboard.
 * The dashboard renders its own task list inline inside Dashboard.tsx instead.
 * This component is kept as a self-contained alternative with comment support.
 */
import React, { useState } from 'react';
import type { ITask } from '../../services/taskService';
import TaskForm from '../taskSystem/AddTaskForm';
import './DashboardTaskList.css';

/** Props for the DashboardTaskList component. */
interface DashboardTaskListProps {
  /** Full list of tasks to display. */
  tasks: ITask[];
  /** Toggles the done state of a task by ID. */
  onToggleTask: (id: string) => void;
  /** Creates a new task with the given fields. */
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  /** Permanently deletes a task by ID. */
  onDelete: (id: string) => void;
  /** Adds a comment to the given task. */
  onAddComment: (taskId: string, content: string) => void;
  /** Deletes a specific comment from a task. */
  onDeleteComment: (taskId: string, commentId: number) => void;
  /** Activity tracker instance — accepted as a prop for future integration but not used in rendering. */
  activityTracker: any;
}

/**
 * Task list card showing all tasks with priority badges and elapsed time.
 * Includes an inline task creation form toggled by the "+ Add Task" button.
 */
const DashboardTaskList: React.FC<DashboardTaskListProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDelete,
  onAddComment,
  onDeleteComment,
  activityTracker,
}) => {
  /** Controls whether the inline task creation form is visible. */
  const [showAddForm, setShowAddForm] = useState(false);

  /**
   * Returns the CSS colour for a task priority level.
   * Falls back to muted gray for any unrecognised priority string.
   *
   * @param priority - 'High', 'Medium', or 'Low'.
   */
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: '#ff6b6b',
      Medium: '#ffa500',
      Low: '#51cf66',
    };
    return colors[priority] || '#a0aec0';
  };

  /**
   * Converts a duration in seconds to a HH:MM display string.
   *
   * @param seconds - Total elapsed seconds.
   * @returns Zero-padded string such as "01:30".
   */
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  return (
    <div className="dashboard-task-list">
      <div className="task-list-header">
        <h2 className="task-list-title">Today's Task List</h2>
        <div className="task-list-actions">
          <button className="task-pin-btn" title="Pin tasks">📌</button>
          <button className="task-pin-btn" title="More actions">📌</button>
          <button className="task-pin-btn" title="More actions">📌</button>
        </div>
      </div>

      <button
        className="add-task-btn"
        onClick={() => setShowAddForm(!showAddForm)}
      >
        + Add Task
      </button>

      {showAddForm && (
        <div className="add-task-form-container">
          <TaskForm
            onAdd={(title, deadline, description, priority) => {
              onAddTask(title, deadline, description, priority);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      )}

      <div className="task-items">
        {tasks.length === 0 ? (
          <div className="empty-state">No tasks for today</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="dashboard-task-item">
              <div className="task-item-left">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={task.isDone}
                  onChange={() => onToggleTask(task.id)}
                />
                <div className="task-info">
                  <h4 className={`task-title ${task.isDone ? 'completed' : ''}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                </div>
              </div>

              <div className="task-item-right">
                <span className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                  {task.priority}
                </span>
                <span className="task-time">
                  <span className="clock-icon">🕐</span>
                  {formatTime(task.timeSpent || 0)}
                </span>
                <button
                  className="task-menu-btn"
                  onClick={() => onDelete(task.id)}
                  title="Delete task"
                >
                  ⋮
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DashboardTaskList;
