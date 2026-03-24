import { useState } from 'react';
import { type ITask } from '../components/taskSystem/TaskItem';

export const useTasks = () => {
  const [tasks, setTasks] = useState<ITask[]>([
    { id: '1', title: 'Zrobić herbatę', isDone: false, deadline: '24 Mar' },
    { id: '2', title: 'Napisać pierwszy komponent', isDone: true, deadline: '25 Mar' },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t)
    );
  };

  const addTask = (title: string, deadline: string) => {
    const newTask: ITask = {
      id: Date.now().toString(), 
      title,
      isDone: false,
      deadline
    };
    setTasks(prev => [...prev, newTask]);
  };

  return { tasks, toggleTask, addTask };
};