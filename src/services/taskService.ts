import { getDb } from './db';

export interface ITaskComment {
  id: number;
  content: string;
  created_at?: string;
}

export interface ITask {
  id: string;
  title: string;
  isDone: boolean;
  isRunning: boolean;
  deadline: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  timeSpent: number;
  comments?: ITaskComment[];
  created_at?: string;
  project_id?: number;
}

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

export const taskService = {
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

  async updateTask(task: ITask): Promise<ITask> {
    const db = await getDb();
    await db.execute(
      `UPDATE tasks SET title=?, isDone=?, isRunning=?, deadline=?, description=?, priority=?, time_spent=? WHERE id=?`,
      [task.title, task.isDone ? 1 : 0, task.isRunning ? 1 : 0, task.deadline, task.description ?? null, task.priority, task.timeSpent, task.id]
    );
    const rows = await db.select<any[]>('SELECT * FROM tasks WHERE id = ?', [task.id]);
    return { ...mapTask(rows[0]), comments: task.comments ?? [] };
  },

  async deleteTask(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM comments WHERE task_id = ?', [id]);
    await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
  },

  async reorderTasks(ids: string[]): Promise<void> {
    const db = await getDb();
    for (let i = 0; i < ids.length; i++) {
      await db.execute('UPDATE tasks SET order_index = ? WHERE id = ?', [i, ids[i]]);
    }
  },

  async addComment(taskId: string, content: string): Promise<ITaskComment> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO comments (task_id, content) VALUES (?, ?)',
      [taskId, content.trim()]
    );
    const rows = await db.select<any[]>('SELECT * FROM comments WHERE id = ?', [result.lastInsertId]);
    return { id: Number(rows[0].id), content: rows[0].content, created_at: rows[0].created_at };
  },

  async deleteComment(taskId: string, commentId: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM comments WHERE id = ? AND task_id = ?', [commentId, taskId]);
  },
};
