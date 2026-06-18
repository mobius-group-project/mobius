import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';
export type { ITask } from '../services/taskService';

/**
 * Custom React hook for managing the full lifecycle of tasks.
 *
 * Provides optimistic updates on toggle, create, delete, update, reorder,
 * and comment operations.  Listens for `taskTimeUpdated` and `taskToggled`
 * custom events emitted by other parts of the app (e.g. the activity tracker).
 *
 * @returns An object containing the tasks array, loading/error state, and action methods.
 */
export const useTasks = () => {
  const [tasks, setTasks] = useState<import('../services/taskService').ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Fetches all tasks from the database via {@link taskService.getTasks}. */
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

  /** Listens for the `taskTimeUpdated` custom event to update task time in real time. */
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { taskId, timeSpent } = e.detail;
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, timeSpent } : t)
      );
    };
    window.addEventListener('taskTimeUpdated', handler as EventListener);
    return () => window.removeEventListener('taskTimeUpdated', handler as EventListener);
  }, []);

  /** Listens for the `taskToggled` custom event (emitted e.g. from the calendar). */
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const { taskId, isDone } = e.detail;
      setTasks(prev =>
        prev.map(t => t.id === taskId ? { ...t, isDone } : t)
      );
    };
    window.addEventListener('taskToggled', handler as EventListener);
    return () => window.removeEventListener('taskToggled', handler as EventListener);
  }, []);

  /**
   * Toggles a task's `isDone` flag optimistically.
   * @param id - The ID of the task to toggle.
   */
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

  /**
   * Creates a new task and prepends it to the list optimistically.
   * @param title       - Task title.
   * @param deadline    - Deadline string.
   * @param description - Optional description.
   * @param priority    - High, Medium, or Low.
   */
  const addTask = async (title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low') => {
    try {
      const newTask = await taskService.createTask(title, deadline, description, priority);
      setTasks(prev => [newTask, ...prev]);
    } catch {
      setError('Nie udało się dodać zadania.');
    }
  };

  /**
   * Deletes a task optimistically.
   * @param id - ID of the task to delete.
   */
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

  /**
   * Updates an existing task optimistically.
   * @param updatedTask - The full task object with updated fields.
   */
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

  /**
   * Reorders tasks after a drag-and-drop operation optimistically.
   * @param reorderedTasks - The full task array in the new order.
   */
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

  /**
   * Adds a comment to a task with optimistic UI update.
   * Uses a temporary negative ID that is replaced when the server responds.
   * @param taskId  - ID of the task.
   * @param comment - Comment text.
   */
  const addComment = async (taskId: string, comment: string) => {
    const normalizedComment = comment.trim();
    if (!normalizedComment) return;

    const prev = tasks;
    const tempId = -Date.now();
    const optimistic = tasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            comments: [
              ...(t.comments || []),
              { id: tempId, content: normalizedComment },
            ],
          }
        : t
    );
    setTasks(optimistic);

    try {
      const savedComment = await taskService.addComment(taskId, normalizedComment);
      setTasks(current =>
        current.map(t => {
          if (t.id !== taskId) return t;

          const comments = (t.comments || []).map(commentItem =>
            commentItem.id === tempId ? savedComment : commentItem,
          );

          return { ...t, comments };
        })
      );
    } catch {
      setTasks(prev);
      setError('Nie udało się dodać komentarza.');
    }
  };

  /**
   * Deletes a comment optimistically.
   * Negative IDs (temporary optimistic comments) are silently skipped.
   * @param taskId    - ID of the parent task.
   * @param commentId - ID of the comment to remove.
   */
  const deleteComment = async (taskId: string, commentId: number) => {
    const prev = tasks;
    const optimistic = tasks.map(t =>
      t.id === taskId
        ? { ...t, comments: (t.comments || []).filter(comment => comment.id !== commentId) }
        : t
    );
    setTasks(optimistic);

    // Negative ids are temporary optimistic comments that were not saved yet.
    if (commentId < 0) {
      return;
    }

    try {
      await taskService.deleteComment(taskId, commentId);
    } catch {
      setTasks(prev);
      setError('Nie udało się usunąć komentarza.');
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
    addComment,
    deleteComment,
  };
};