import React from 'react';
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

const FocusPage: React.FC = () => {
  return (
    <div className="route-view">
      <FocusTimer />
    </div>
  );
};

const StatsPageRoute: React.FC = () => (
  <div className="route-view">
    <StatsPage />
  </div>
);

const TrackerPage: React.FC<{ activityTracker: ReturnType<typeof useActivityTracker> }> = ({ activityTracker }) => {
  return (
    <div className="route-view">
      <ActivityTracker activityTracker={activityTracker} />
    </div>
  );
};

function App() {
  const tracker = useActivityTracker();
  const { tasks, loading, error, toggleTask, addTask, deleteTask, updateTask, reorderTasks, addComment, deleteComment } = useTasks();

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