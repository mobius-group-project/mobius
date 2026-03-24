import TaskItem, { type ITask } from './components/taskSystem/TaskItem';

function App() {
  const tasks: ITask[] = [
    { id: '1', title: 'Zrobić herbatę', isDone: false },
    { id: '2', title: 'Napisać pierwszy komponent w React', isDone: true },
    { id: '3', title: 'Uruchomić projekt w Tauri', isDone: false },
  ];

  return (
    <main className="app-center" style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--color-primary)' }}>Mobius Tasks</h1>
      
      <div className="task-list">
        {tasks.map(t => (
          <TaskItem key={t.id} task={t} />
        ))}
      </div>
    </main>
  );
}

export default App;