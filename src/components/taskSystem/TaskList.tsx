import React from 'react';
import TaskItem, { type ITask } from './TaskItem';
import './styles/TaskList.css';

interface Props {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onToggleTask }) => {
  return (
    <div className="task-list">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onToggle={() => onToggleTask(task.id)} 
          />
        ))
      ) : (
        <>
          <div className="task-item-empty" />
          <div className="task-item-empty" />
        </>
      )}
    </div>
  );
};

export default TaskList;