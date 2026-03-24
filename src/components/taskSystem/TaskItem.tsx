import React from 'react';
import './styles/TaskItem.css';

export interface ITask {
  id: string;
  title: string;
  isDone: boolean;
}

interface Props {
  task: ITask;
}

const TaskItem: React.FC<Props> = ({ task }) => {
  return (
    <div className="task-item">
      <input 
        type="checkbox" 
        checked={task.isDone} 
        readOnly 
        className="task-checkbox"
      />
      
      <span className={`task-title ${task.isDone ? 'is-done' : ''}`}>
        {task.title}
      </span>
    </div>
  );
};

export default TaskItem;