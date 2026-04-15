import { useState } from 'react';
import { type ITask } from '../components/taskSystem/TaskItem';

export const useTasks = () => {
  const [tasks, setTasks] = useState<ITask[]>([
    { id: '1', title: 'Zrobić herbatę', isDone: false, deadline: '24 Mar', description: 'Opis blablablablablabalablablaabl', timeSpent: 0, priority: 'High'},
    { id: '2', title: 'Napisać pierwszy komponent', isDone: true, deadline: '25 Mar', timeSpent: 0, priority: 'Medium' },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t)
    );
  };

const addTask = (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
  const newTask: ITask = {
    id: Date.now().toString(), 
    title,
    isDone: false,
    deadline,
    timeSpent: 0,
    description,
    priority: priority
  };
  setTasks(prev => [...prev, newTask]);
};

  return { tasks, toggleTask, addTask };
};