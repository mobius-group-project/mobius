import React, { useState } from 'react';
import TaskItem, { type ITask } from './TaskItem';
import TaskForm from './AddTaskForm';
import { Plus } from 'lucide-react';
import './styles/TaskList.css';

interface Props {
  tasks: ITask[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => void;
  onDelete: (id: string) => void;
  onUpdateTask: (task: ITask) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onToggleTask, onAddTask, onDelete, onUpdateTask }) => {
  const [isAdding, setIsAdding] = useState(false);

const handleAdd = (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
  onAddTask(title, deadline, description, priority);
  setIsAdding(false); 
};

  return (
    <div className="task-list">
      {tasks.length > 0 ? (
        tasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onToggle={() => onToggleTask(task.id)}
            onDelete={onDelete}
            onUpdateTask={onUpdateTask}
          />
        ))
      ) : (
        <>
          <div className="task-item-empty" />
          <div className="task-item-empty" />
        </>
      )}

      <div className="task-list-footer">
        {isAdding ? (
          <TaskForm 
            onAdd={handleAdd} 
            onCancel={() => setIsAdding(false)} 
          />
        ) : (
          <button className="add-task-btn" onClick={() => setIsAdding(true)}>
            <Plus size={18} className="plus-icon" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskList;