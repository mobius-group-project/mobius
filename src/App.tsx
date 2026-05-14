import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';
import FocusTimer from './components/focus/FocusTimer';
import ActivityTracker from './components/timer/ActivityTracker';
import { useActivityTracker } from './hooks/useActivityTracker';

const DashboardPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Dashboard</h1>
      <p>Glówny ekran aplikacji.</p>
    </div>
  );
};

const TasksPage: React.FC<{ activityTracker: ReturnType<typeof useActivityTracker> }> = ({ activityTracker }) => {
  const { tasks, toggleTask, addTask, deleteTask, updateTask, reorderTasks, loading, error } = useTasks();

  return (
    <div className="route-view">
      <h1 className="route-title">Tasks</h1>
      {error && (
        <div style={{ color: '#ff6b6b', background: '#2a1a1a', border: '1px solid #ff6b6b', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ color: 'var(--color-text-secondary)', padding: '32px 0', textAlign: 'center' }}>
          Ładowanie zadań...
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onToggleTask={toggleTask}
          onAddTask={addTask}
          onDelete={deleteTask}
          onUpdateTask={updateTask}
          onReorderTasks={reorderTasks}
          activityTracker={activityTracker}
        />
      )}
    </div>
  );
};

const FocusPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Focus</h1>
      <FocusTimer />
    </div>
  );
};

const StatsPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Statystyki</h1>
      <p>Widok statystyk zostanie dodany w kolejnych iteracjach.</p>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Ustawienia</h1>
      <p>Konfiguracja aplikacji pojawi się tutaj w przyszłości.</p>
    </div>
  );
};

const TrackerPage: React.FC<{ activityTracker: ReturnType<typeof useActivityTracker> }> = ({ activityTracker }) => {
  return (
    <div className="route-view">
      <h1 className="route-title">Time Tracker</h1>
      <ActivityTracker activityTracker={activityTracker} />
    </div>
  );
};

function App() {
  const tracker = useActivityTracker();

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        color: '#ffffff',
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          padding: '32px 40px',
          overflow: 'hidden',
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage activityTracker={tracker} />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/tracker" element={<TrackerPage activityTracker={tracker} />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;