import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { useActivityTracker, type ActivitySession } from '../../hooks/useActivityTracker';
import { formatDurationCompact, formatDurationDetailed } from '../../components/TimeFormatter';
import ConfirmDialog from '../../components/ConfirmDialog';
import './styles/ActivityTracker.css';

interface ActivityTrackerProps {
  activityTracker: ReturnType<typeof useActivityTracker>;
  preselectedTask?: { id: string; title: string } | null;
  onSessionComplete?: (session: any) => void;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ 
  activityTracker,
  preselectedTask = null, 
  onSessionComplete 
}) => {
  const navigate = useNavigate();
  const [activityInput, setActivityInput] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const {
    state,
    currentSession,
    sessions,
    seconds,
    toasts,
    duplicateConfirmation,
    startTracking,
    continueSession,
    stopTracking,
    resetTracking,
    getFormattedTime,
    getTotalTimeToday,
    removeToast,
    confirmDuplicateCreate,
    cancelDuplicateCreate,
    renameSession,
    deleteSession,
  } = activityTracker;

  const handleStart = () => {
    if (preselectedTask) {
      startTracking(preselectedTask.title, true, preselectedTask.id);
      setActivityInput('');
    } else if (activityInput.trim()) {
      startTracking(activityInput, false);
      setActivityInput('');
    } else {
      startTracking('', false);
    }
  };

  const handleStop = () => {
    stopTracking();
    if (currentSession && onSessionComplete) {
      onSessionComplete({
        ...currentSession,
        durationSeconds: seconds,
      });
    }
  };

  const handleDoubleClick = (session: ActivitySession) => {
    setEditingSessionId(session.id);
    setEditingName(session.activityName);
  };

  const handleRenameSubmit = (sessionId: string) => {
    if (editingName.trim()) {
      renameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(sessionId);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setEditingName('');
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirmId) {
      deleteSession(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const totalTimeToday = getTotalTimeToday();
  const totalHours = Math.floor(totalTimeToday / 3600);
  const totalMinutes = Math.floor((totalTimeToday % 3600) / 60);

  return (
    <div className="activity-tracker">
      {/* Toast notifications */}
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`toast-notification ${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}

      {/* Duplicate session confirmation dialog */}
      {duplicateConfirmation && (
        <ConfirmDialog
          isOpen={true}
          title="Session already exists"
          message={`You already have a session named "${duplicateConfirmation.existingSession.activityName}" (${formatDurationDetailed(duplicateConfirmation.existingSession.durationSeconds)}). Continue the existing one or create a new one?`}
          onConfirm={confirmDuplicateCreate}
          onCancel={cancelDuplicateCreate}
          confirmText="Create new"
          cancelText="Continue existing"
        />
      )}

      {/* Header */}
      <div className="tracker-header">
        <div className="tracker-header-right">
          <div className="today-stats">
            Today: <strong>
              {totalHours > 0 ? `${totalHours}h ` : ''}
              {totalMinutes}m
            </strong>
          </div>
          <button 
            className="stats-nav-btn"
            onClick={() => navigate('/stats')}
            title="View statistics"
          >
            <BarChart2 size={18} />
            <span>Statistics</span>
          </button>
        </div>
      </div>

      {/* Input section */}
      <div className="tracker-input-section">
        {preselectedTask ? (
          <div className="preselected-task">
            <span className="task-badge">📌 Task:</span>
            <span className="task-title">{preselectedTask.title}</span>
            <button 
              className="clear-task-btn"
              onClick={() => window.location.reload()}
            >
              ✖
            </button>
          </div>
        ) : (
          <input
            type="text"
            className="activity-input"
            placeholder="What are you working on?"
            value={activityInput}
            onChange={(e) => setActivityInput(e.target.value)}
            disabled={state === 'running'}
          />
        )}
      </div>

      {/* Current activity indicator */}
      {state === 'running' && currentSession && (
        <div className="current-activity">
          <div className="activity-indicator">
            <span className="pulse-dot"></span>
            <span className="activity-name">
              {currentSession.activityName}
              {currentSession.isTask && <span className="task-tag">(task)</span>}
            </span>
          </div>
        </div>
      )}

      {/* Timer display */}
      <div className="timer-display">
        <div className="timer-time">{getFormattedTime()}</div>
      </div>

      {/* Controls */}
      <div className="tracker-controls">
        {state === 'idle' ? (
          <button className="btn btn-start" onClick={handleStart}>
            Start
          </button>
        ) : (
          <>
            <button className="btn btn-stop" onClick={handleStop}>
              Stop
            </button>
            <button className="btn btn-reset" onClick={resetTracking}>
              Reset
            </button>
          </>
        )}
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 ? (
        <div className="recent-sessions">
          <h3>Recent sessions</h3>
          <div className="sessions-list">
            {sessions.map((session) => (
              <div key={session.id} className="session-item">
                <div className="session-info">
                  {editingSessionId === session.id ? (
                    <input
                      type="text"
                      className="rename-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleRenameSubmit(session.id)}
                      onKeyDown={(e) => handleRenameKeyDown(e, session.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      className="session-name" 
                      title={`${session.activityName} (double-click to edit)`}
                      onDoubleClick={() => handleDoubleClick(session)}
                    >
                      {session.activityName}
                      {session.isTask && <span className="session-tag">📋</span>}
                    </span>
                  )}
                  <span className="session-time" title={formatDurationDetailed(session.durationSeconds)}>
                    {formatDurationCompact(session.durationSeconds)}
                  </span>
                </div>
                <div className="session-actions">
                  <span className="session-date">
                    {session.startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    className="continue-session-btn"
                    onClick={() => continueSession(session)}
                    disabled={state === 'running'}
                    title={`Continue (${formatDurationDetailed(session.durationSeconds)})`}
                  >
                    ▶
                  </button>
                  <button 
                    className="delete-session-btn"
                    onClick={() => setDeleteConfirmId(session.id)}
                    disabled={state === 'running' && currentSession?.id === session.id}
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-sessions">
          ✨ No saved sessions. Start your first activity!
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <ConfirmDialog
          isOpen={true}
          title="Delete session"
          message="Are you sure you want to delete this session? This action cannot be undone."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirmId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};

export default ActivityTracker;