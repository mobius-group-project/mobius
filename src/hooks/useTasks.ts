import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';
export type { ITask } from '../services/taskService';

export const useTasks = () => {
  const [tasks, setTasks] = useState<import('../services/taskService').ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskService.getTasks();
      setTasks(data);
    } catch {
      setError('Nie można połączyć się z bazą danych. Sprawdź czy serwer działa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const optimistic = tasks.map(t => t.id === id ? { ...t, isDone: !t.isDone } : t);
    setTasks(optimistic);
    try {
      await taskService.updateTask({ ...task, isDone: !task.isDone });
    } catch {
      setTasks(tasks);
      setError('Nie udało się zaktualizować zadania.');
    }
  };

  const addTask = async (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
    try {
      const newTask = await taskService.createTask(title, deadline, description, priority);
      setTasks(prev => [newTask, ...prev]);
    } catch {
      setError('Nie udało się dodać zadania.');
    }
  };

  const deleteTask = async (id: string) => {
    const prev = tasks;
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await taskService.deleteTask(id);
    } catch {
      setTasks(prev);
      setError('Nie udało się usunąć zadania.');
    }
  };

  const updateTask = async (updatedTask: import('../services/taskService').ITask) => {
    const prev = tasks;
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    try {
      await taskService.updateTask(updatedTask);
    } catch {
      setTasks(prev);
      setError('Nie udało się zaktualizować zadania.');
    }
  };

  const reorderTasks = async (reorderedTasks: import('../services/taskService').ITask[]) => {
    const prev = tasks;
    setTasks(reorderedTasks);
    try {
      await taskService.reorderTasks(reorderedTasks.map(t => t.id));
    } catch {
      setTasks(prev);
      setError('Nie udało się zapisać kolejności zadań.');
    }
  };

  return {
    tasks,
    loading,
    error,
    toggleTask,
    addTask,
    deleteTask,
    updateTask,
    reorderTasks,
  };
};