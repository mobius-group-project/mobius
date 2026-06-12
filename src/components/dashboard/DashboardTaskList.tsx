import React, { useState } from 'react';
import type { ITask } from '../../services/taskService';
import TaskForm from '../taskSystem/AddTaskForm';
import './DashboardTaskList.css';

interface DashboardTaskListProps {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  onDelete: (id: string) => void;
  onAddComment: (taskId: string, content: string) => void;
  onDeleteComment: (taskId: string, commentId: number) => void;
  activityTracker: any;
}

const DashboardTaskList: React.FC<DashboardTaskListProps> = ({
  tasks,
  onToggleTask,
  onAddTask,
  onDelete,
  onAddComment,
  onDeleteComment,
  activityTracker,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      High: '#ff6b6b',
      Medium: '#ffa500',
      Low: '#51cf66',
    };
    return colors[priority] || '#a0aec0';
  };

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
