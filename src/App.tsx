import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';
import FocusTimer from './components/focus/FocusTimer';
import ActivityTracker from './components/timer/ActivityTracker';


const DashboardPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Dashboard</h1>
      <p>Glówny ekran aplikacji.</p>
    </div>
  );
};

const TasksPage: React.FC = () => {
  const { tasks, toggleTask, addTask, deleteTask, updateTask } = useTasks();

  return (
    <div className="route-view">
      <h1 className="route-title">Tasks</h1>
      <TaskList
        tasks={tasks}
        onToggleTask={toggleTask}
        onAddTask={addTask}
        onDelete={deleteTask}  
        onUpdateTask={updateTask}
      />
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

const TrackerPage: React.FC = () => {
  return (
    <div className="route-view">
      <h1 className="route-title">Time Tracker</h1>
      <ActivityTracker />
    </div>
  );
};

function App() {
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
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;