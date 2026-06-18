/**
 * Activity tracker UI — full-page view rendered at /tracker.
 *
 * Displays a stopwatch timer, a text input for naming the current activity,
 * and a list of completed sessions for today. Session state and persistence
 * are managed entirely by useActivityTracker, which is instantiated in App
 * and passed in as a prop so the timer survives route changes.
 *
 * Inline rename: double-clicking a session name switches it to a text input.
 * Delete: clicking the ✕ button opens a ConfirmDialog before the session is removed.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { useActivityTracker, type ActivitySession } from '../../hooks/useActivityTracker';
import { formatDurationCompact, formatDurationDetailed } from '../../components/TimeFormatter';
import ConfirmDialog from '../../components/ConfirmDialog';
import './styles/ActivityTracker.css';

/** Props for the ActivityTracker component. */
interface ActivityTrackerProps {
  /** Shared tracker instance from App — contains all session state and control functions. */
  activityTracker: ReturnType<typeof useActivityTracker>;
  /**
   * When set, the tracker starts in task-linked mode: the text input is replaced by
   * a task badge and the session is linked to the task ID in the database.
   */
  preselectedTask?: { id: string; title: string } | null;
  /** Optional callback fired when a running session is stopped. Receives the session with final duration. */
  onSessionComplete?: (session: any) => void;
}

/**
 * Renders the activity tracker interface.
 * All timer logic is delegated to the `activityTracker` prop — this component
 * only manages local UI state for the text input and inline rename flow.
 */
const ActivityTracker: React.FC<ActivityTrackerProps> = ({
  activityTracker,
  preselectedTask = null,
  onSessionComplete
}) => {
  const navigate = useNavigate();
  /** Current value of the free-text activity name input. Cleared after start. */
  const [activityInput, setActivityInput] = useState('');
  /** ID of the session currently being renamed inline, or null when not renaming. */
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  /** Draft name value while inline rename is active. */
  const [editingName, setEditingName] = useState('');
  /** ID of the session pending deletion (shows the ConfirmDialog), or null. */
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

  /**
   * Starts a session using either the preselected task or the free-text input.
   * Passes `is_task=true` and the task ID when a task is preselected so the tracker
   * links elapsed time back to tasks.time_spent on stop.
   */
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

  /** Stops the running session and notifies the parent via onSessionComplete if provided. */
  const handleStop = () => {
    stopTracking();
    if (currentSession && onSessionComplete) {
      onSessionComplete({
        ...currentSession,
        durationSeconds: seconds,
      });
    }
  };

  /** Enters inline rename mode for a session on double-click. */
  const handleDoubleClick = (session: ActivitySession) => {
    setEditingSessionId(session.id);
    setEditingName(session.activityName);
  };

  /** Submits the rename if the new name is non-empty, then exits rename mode. */
  const handleRenameSubmit = (sessionId: string) => {
    if (editingName.trim()) {
      renameSession(sessionId, editingName.trim());
    }
    setEditingSessionId(null);
    setEditingName('');
  };

  /** Submits on Enter, cancels on Escape. */
  const handleRenameKeyDown = (e: React.KeyboardEvent, sessionId: string) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(sessionId);
    } else if (e.key === 'Escape') {
      setEditingSessionId(null);
      setEditingName('');
    }
  };

  /** Confirmed deletion handler — called when the user clicks "Delete" in the ConfirmDialog. */
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