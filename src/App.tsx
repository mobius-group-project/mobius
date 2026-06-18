/**
 * Root application component.
 *
 * Route map:
 *   /          → Dashboard (task list, calendar, focus timer, notes)
 *   /tasks     → Full task list with comments and time tracking
 *   /focus     → Full-screen focus timer with garden
 *   /tracker   → Activity tracker
 *   /stats     → Statistics page
 *   /calendar  → Calendar page
 *
 * useTasks and useActivityTracker are initialised once here at the root level
 * so their state survives route changes. Both hooks are passed as props to avoid
 * re-fetching data or losing the active timer when navigating between pages.
 *
 * Each route is wrapped in a thin page component (DashboardPage, TasksPage, etc.)
 * to keep prop drilling scoped per route and make the Routes block readable.
 */
import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TaskList from './components/taskSystem/TaskList';
import { useTasks } from './hooks/useTasks';
import FocusTimer from './components/focus/FocusTimer';
import ActivityTracker from './components/timer/ActivityTracker';
import { useActivityTracker } from './hooks/useActivityTracker';
import CalendarPage from './components/calendarSystem/CalendarPage';
import StatsPage from './components/stats/StatsPage';
import Dashboard from './components/dashboard/Dashboard';

/** Route wrapper for `/` — passes shared task and tracker state into the Dashboard. */
const DashboardPage: React.FC<{
  tasks: ReturnType<typeof useTasks>['tasks'];
  onToggleTask: ReturnType<typeof useTasks>['toggleTask'];
  onDelete: ReturnType<typeof useTasks>['deleteTask'];
  onReorderTasks: ReturnType<typeof useTasks>['reorderTasks'];
  onAddTask: ReturnType<typeof useTasks>['addTask'];
  activityTracker: ReturnType<typeof useActivityTracker>;
}> = ({ tasks, onToggleTask, onDelete, onReorderTasks, onAddTask, activityTracker }) => {
  return (
    <Dashboard
      tasks={tasks}
      onToggleTask={onToggleTask}
      onDelete={onDelete}
      onReorderTasks={onReorderTasks}
      onAddTask={onAddTask}
      activityTracker={activityTracker}
    />
  );
};

/**
 * Route wrapper for `/tasks`.
 * Shows a loading spinner while tasks are being fetched and an inline error banner on failure.
 */
const TasksPage: React.FC<{
  tasks: ReturnType<typeof useTasks>['tasks'];
  loading: boolean;
  error: string | null;
  onToggleTask: ReturnType<typeof useTasks>['toggleTask'];
  onAddTask: ReturnType<typeof useTasks>['addTask'];
  onDelete: ReturnType<typeof useTasks>['deleteTask'];
  onUpdateTask: ReturnType<typeof useTasks>['updateTask'];
  onAddComment: ReturnType<typeof useTasks>['addComment'];
  onDeleteComment: ReturnType<typeof useTasks>['deleteComment'];
  onReorderTasks: ReturnType<typeof useTasks>['reorderTasks'];
  activityTracker: ReturnType<typeof useActivityTracker>;
}> = ({ tasks, loading, error, onToggleTask, onAddTask, onDelete, onUpdateTask, onAddComment, onDeleteComment, onReorderTasks, activityTracker }) => {
  return (
    <div className="route-view">
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
          onToggleTask={onToggleTask}
          onAddTask={onAddTask}
          onDelete={onDelete}
          onUpdateTask={onUpdateTask}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onReorderTasks={onReorderTasks}
          activityTracker={activityTracker}
        />
      )}
    </div>
  );
};

/** Route wrapper for `/focus` — renders FocusTimer in full-screen (non-compact) mode. */
const FocusPage: React.FC = () => {
  return (
    <div className="route-view">
      <FocusTimer />
    </div>
  );
};

/** Route wrapper for `/stats`. Named StatsPageRoute to avoid collision with the imported StatsPage component. */
const StatsPageRoute: React.FC = () => (
  <div className="route-view">
    <StatsPage />
  </div>
);

/** Route wrapper for `/tracker` — passes the shared tracker instance so the session survives navigation. */
const TrackerPage: React.FC<{ activityTracker: ReturnType<typeof useActivityTracker> }> = ({ activityTracker }) => {
  return (
    <div className="route-view">
      <ActivityTracker activityTracker={activityTracker} />
    </div>
  );
};

/**
 * Root component. Initialises shared hooks and renders the shell layout:
 * a fixed hamburger button, a slide-in Sidebar, and the route outlet.
 */
function App() {
  const tracker = useActivityTracker();
  const { tasks, loading, error, toggleTask, addTask, deleteTask, updateTask, reorderTasks, addComment, deleteComment } = useTasks();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--color-background)',
        color: '#ffffff',
      }}
    >
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        style={{
          flex: 1,
          padding: '32px 40px 32px 70px',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            background: 'var(--color-card-background)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            color: 'var(--color-primary)',
            cursor: 'pointer',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            lineHeight: 1,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'background 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a2b34')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-card-background)')}
          aria-label="Open menu"
        >
          ☰
        </button>
        <Routes>
          <Route path="/" element={
            <DashboardPage
              tasks={tasks}
              onToggleTask={toggleTask}
              onDelete={deleteTask}
              onReorderTasks={reorderTasks}
              onAddTask={addTask}
              activityTracker={tracker}
            />
          } />
          <Route path="/tasks" element={
            <TasksPage
              tasks={tasks}
              loading={loading}
              error={error}
              onToggleTask={toggleTask}
              onAddTask={addTask}
              onDelete={deleteTask}
              onUpdateTask={updateTask}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onReorderTasks={reorderTasks}
              activityTracker={tracker}
            />
          } />
          <Route path="/focus" element={<FocusPage />} />
          <Route path="/tracker" element={<TrackerPage activityTracker={tracker} />} />
          <Route path="/stats" element={<StatsPageRoute />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;