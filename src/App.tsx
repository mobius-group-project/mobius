import TaskItem, { type ITask } from './components/taskSystem/TaskItem';
import { useTasks } from './hooks/useTasks';

function App() {
const { tasks, toggleTask } = useTasks();

  return (
    <main className="app-center" style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--color-primary)' }}>Mobius Tasks</h1>
      
      <div className="task-list">
        {tasks.map(t => (
          <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t.id)} />
        ))}
      </div>
    </main>
  );
}

export default App;