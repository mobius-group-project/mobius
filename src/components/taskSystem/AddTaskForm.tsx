import React, { useState } from 'react';
import './styles/AddTaskForm.css';


interface Props {
  onAdd: (title: string, deadline: string, description?: string) => void;
  onCancel: () => void;
}

const TaskForm: React.FC<Props> = ({ onAdd, onCancel }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd(title, '26 Mar', ''); 
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <input 
        autoFocus
        className="task-input-title"
        placeholder="What needs to be done?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="form-actions">
        <button type="submit" className="save-btn">Add</button>
        <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
      </div>
    </form>
  );
};

export default TaskForm;