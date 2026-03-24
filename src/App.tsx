import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';

function App() {
const { tasks, toggleTask } = useTasks();

  return (
    <main className="app-center" style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--color-primary)' }}>Mobius Tasks</h1>
      
      <div className="task-list">
       <TaskList 
        tasks={tasks} 
        onToggleTask={toggleTask} 
      />
      </div>
    </main>
  );
}

export default App;