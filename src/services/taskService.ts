const API_URL = 'http://localhost:3001/api';

export interface ITask {
  id: string;
  title: string;
  isDone: boolean;
  isRunning: boolean;
  deadline: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  timeSpent?: number;
  created_at?: string;
  project_id?: number;
}

function mapTask(task: any, priority?: 'High' | 'Medium' | 'Low'): ITask {
  return {
    id: task.id,
    title: task.title,
    isDone: Boolean(task.isDone),
    isRunning: Boolean(task.isRunning),
    deadline: task.deadline,
    description: task.description,
    priority: priority ?? task.priority ?? 'Low',
    timeSpent: 0,
    created_at: task.created_at,
    project_id: task.project_id,
  };
}

export const taskService = {
  async getTasks(): Promise<ITask[]> {
    const response = await fetch(`${API_URL}/tasks`);
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const tasks = await response.json();
    return tasks.map((task: any) => mapTask(task));
  },

  async getTask(id: string): Promise<ITask> {
    const response = await fetch(`${API_URL}/tasks/${id}`);
    if (!response.ok) throw new Error('Failed to fetch task');
    return mapTask(await response.json());
  },

  async createTask(title: string, deadline: string, description?: string, priority?: 'High' | 'Medium' | 'Low'): Promise<ITask> {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now().toString(),
        title,
        isDone: false,
        isRunning: false,
        deadline,
        description,
        priority: priority ?? 'Low',
      }),
    });
    if (!response.ok) throw new Error('Failed to create task');
    return mapTask(await response.json(), priority);
  },

  async updateTask(task: ITask): Promise<ITask> {
    const response = await fetch(`${API_URL}/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        isDone: task.isDone,
        isRunning: task.isRunning,
        deadline: task.deadline,
        description: task.description,
        priority: task.priority,
      }),
    });
    if (!response.ok) throw new Error('Failed to update task');
    return mapTask(await response.json(), task.priority);
  },

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete task');
  },
};