import React, { useState, useEffect } from 'react';
import { Calendar, Play, Pause, Flag } from 'lucide-react';
import './styles/TaskItem.css';

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
}

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
};

const TaskItem: React.FC<Props> = ({ task, onToggle }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [seconds, setSeconds] = useState(task.timeSpent || 0);

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

  return (
  <div className={`task-item ${task.isDone ? 'task-completed' : ''} ${priorityClass}`}>
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
      <span className={`task-title ${task.isDone ? 'is-done' : ''}`}>
        {task.title}
      </span>

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
  </div>
);
};

export default TaskItem;