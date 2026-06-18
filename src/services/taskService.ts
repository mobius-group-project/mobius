import { getDb } from './db';

/**
 * Represents a single comment attached to a task.
 */
export interface ITaskComment {
  /** Unique comment identifier. */
  id: number;
  /** Comment body text. */
  content: string;
  /** ISO timestamp of when the comment was created. */
  created_at?: string;
}

/**
 * Represents a task with its full metadata, deadline, priority, time tracking, and comments.
 */
export interface ITask {
  /** Unique task identifier (millisecond timestamp string). */
  id: string;
  /** Task title / short description. */
  title: string;
  /** Whether the task has been marked as completed. */
  isDone: boolean;
  /** Whether the task timer is currently running. */
  isRunning: boolean;
  /** Deadline string in the format "YYYY-MM-DD HH:MM" or "No deadline". */
  deadline: string;
  /** Optional longer description of the task. */
  description?: string;
  /** Priority level: High, Medium, or Low. */
  priority: 'High' | 'Medium' | 'Low';
  /** Accumulated time spent on the task in seconds. */
  timeSpent: number;
  /** List of comments attached to the task. */
  comments?: ITaskComment[];
  /** ISO timestamp of when the task was created. */
  created_at?: string;
  /** Optional foreign key referencing a project. */
  project_id?: number;
}

/**
 * Maps a raw database row to the {@link ITask} interface.
 * @param task - Raw row from the `tasks` table.
 * @returns Normalised task object.
 */
function mapTask(task: any): ITask {
  return {
    id: task.id,
    title: task.title,
    isDone: Boolean(task.isDone),
    isRunning: Boolean(task.isRunning),
    deadline: task.deadline ?? '',
    description: task.description,
    priority: task.priority ?? 'Low',
    timeSpent: task.time_spent ?? 0,
    comments: [],
    created_at: task.created_at,
    project_id: task.project_id,
  };
}

/** Service for CRUD operations on tasks and their comments via the local SQLite database. */
export const taskService = {
  /**
   * Fetches all tasks (ordered by `order_index`) along with their comments.
   * @returns Promise resolving to an array of tasks, each with a `comments` array.
   */
  async getTasks(): Promise<ITask[]> {
    const db = await getDb();
    const tasks = await db.select<any[]>('SELECT * FROM tasks ORDER BY order_index ASC');
    const comments = await db.select<any[]>(
      'SELECT id, task_id, content, created_at FROM comments ORDER BY created_at ASC, id ASC'
    );
    const byTask = new Map<string, ITaskComment[]>();
    for (const c of comments) {
      const list = byTask.get(c.task_id) ?? [];
      list.push({ id: Number(c.id), content: c.content, created_at: c.created_at });
      byTask.set(c.task_id, list);
    }
    return tasks.map(t => ({ ...mapTask(t), comments: byTask.get(t.id) ?? [] }));
  },

  /**
   * Creates a new task in the database.
   * @param title    - Task title.
   * @param deadline - Deadline string ("YYYY-MM-DD HH:MM" or "No deadline").
   * @param description - Optional task description.
   * @param priority - Priority level (High, Medium, Low); defaults to "Low".
   * @returns Promise resolving to the newly created task.
   */
  async createTask(title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low'): Promise<ITask> {
    const db = await getDb();
    const id = Date.now().toString();
    await db.execute(
      `INSERT INTO tasks (id, title, isDone, isRunning, deadline, description, priority, time_spent)
       VALUES (?, ?, 0, 0, ?, ?, ?, 0)`,
      [id, title, deadline, description ?? null, priority ?? 'Low']
    );
    const rows = await db.select<any[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    return mapTask(rows[0]);
  },

  /**
   * Updates an existing task by replacing all of its fields.
   * @param task - The updated task object (must include a valid `id`).
   * @returns Promise resolving to the updated task with its comments preserved.
   */
  async updateTask(task: ITask): Promise<ITask> {
    const db = await getDb();
    await db.execute(
      `UPDATE tasks SET title=?, isDone=?, isRunning=?, deadline=?, description=?, priority=?, time_spent=? WHERE id=?`,
      [task.title, task.isDone ? 1 : 0, task.isRunning ? 1 : 0, task.deadline, task.description ?? null, task.priority, task.timeSpent, task.id]
    );
    const rows = await db.select<any[]>('SELECT * FROM tasks WHERE id = ?', [task.id]);
    return { ...mapTask(rows[0]), comments: task.comments ?? [] };
  },

  /**
   * Deletes a task and its associated comments, then cleans up references
   * in `activity_sessions` and `calendar_events`.
   * @param id - The ID of the task to delete.
   */
  async deleteTask(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM comments WHERE task_id = ?', [id]);
    await db.execute('UPDATE activity_sessions SET task_id = NULL, is_task = 0 WHERE task_id = ?', [id]);
    await db.execute('UPDATE calendar_events SET task_id = NULL WHERE task_id = ?', [id]);
    await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
  },

  /**
   * Reorders tasks by updating their `order_index` column.
   * @param ids - Array of task IDs in the desired order.
   */
  async reorderTasks(ids: string[]): Promise<void> {
    const db = await getDb();
    for (let i = 0; i < ids.length; i++) {
      await db.execute('UPDATE tasks SET order_index = ? WHERE id = ?', [i, ids[i]]);
    }
  },

  /**
   * Adds a comment to a task.
   * @param taskId  - ID of the parent task.
   * @param content - Comment text (will be trimmed).
   * @returns Promise resolving to the saved comment.
   */
  async addComment(taskId: string, content: string): Promise<ITaskComment> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO comments (task_id, content) VALUES (?, ?)',
      [taskId, content.trim()]
    );
    const rows = await db.select<any[]>('SELECT * FROM comments WHERE id = ?', [result.lastInsertId]);
    return { id: Number(rows[0].id), content: rows[0].content, created_at: rows[0].created_at };
  },

  /**
   * Deletes a comment by its ID, scoped to the given task.
   * @param taskId    - ID of the parent task.
   * @param commentId - ID of the comment to delete.
   */
  async deleteComment(taskId: string, commentId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM comments WHERE id = ? AND task_id = ?', [commentId, taskId]);
  },
};
