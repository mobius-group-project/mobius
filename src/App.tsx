import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';

function App() {
const { tasks, toggleTask, addTask } = useTasks();

  return (
    <main className="app-center" style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--color-primary)' }}>Mobius Tasks</h1>
     <TaskList 
        tasks={tasks} 
        onToggleTask={toggleTask} 
        onAddTask={addTask} 
      />
    </main>
  );
}

export default App;