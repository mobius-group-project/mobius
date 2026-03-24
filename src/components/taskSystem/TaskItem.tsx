import React from 'react';
import { Calendar } from 'lucide-react';
import './styles/TaskItem.css';

export interface ITask {
  id: string;
  title: string;
  isDone: boolean;
  deadline: string;
}

interface Props {
  task: ITask;
  onToggle: () => void;
}

const TaskItem: React.FC<Props> = ({ task, onToggle }) => {
  return (
    <div className="task-item">
      <input 
        type="checkbox" 
        checked={task.isDone} 
        onChange={onToggle}
        className="task-checkbox"
      />
      
      <div className="task-info"> 
        <span className={`task-title ${task.isDone ? 'is-done' : ''}`}>
          {task.title}
        </span>
        
        <div className="task-deadline">
          <Calendar size={12} className="calendar-icon" />
          <span className="deadline-date">{task.deadline}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;