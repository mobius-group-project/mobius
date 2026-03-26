//import { Focus } from 'lucide-react';
import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';
//import FocusTimer from './components/focus/FocusTimer';
import React, { useState } from 'react';

type View = 'tasks' | 'focus';

function App() {
//const { tasks, toggleTask, addTask } = useTasks();
const [activeView, setActiveView] = useState<View>('tasks');


  return (
    <main className="app-center" style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--color-primary)' }}>Mobius</h1>

      <div style={{marginBottom: '24px', display: 'flex', gap: '12px'}}>
        <button onClick={() => setActiveView('tasks')}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: activeView === 'tasks' ? '2px solid var(--color-primary)' : '1px solid #ccc',
            background: activeView === 'tasks' ? 'var(--color-primary-soft)' : '#fff',
            cursor: 'pointer'
          }}
        >
          Tasks
        </button>

        <button onClick={() => setActiveView('focus')}
          style={{
            padding: '8px 16px',
            borderRadius: '999px',
            border: activeView === 'focus' ? '2px solid var(--color-primary)' : '1px solid #ccc',
            background: activeView === 'focus' ? 'var(--color-primary-soft)' : '#fff',
            cursor: 'pointer'
          }}
        >
          Focus
        </button>

      </div>

      {/* {activeView === 'tasks' ? (
     <TaskList 
        tasks={tasks} 
        onToggleTask={toggleTask} 
        onAddTask={addTask} 
      />
      ) : (
        <FocusTimer />
      )} */}
    </main>
  );
}

export default App;