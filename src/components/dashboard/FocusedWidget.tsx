/**
 * Focused activity widget — legacy component, not currently rendered in the dashboard.
 * The dashboard's focus card uses `<FocusTimer compact />` instead.
 * This component shows a circular progress ring based on combined activity time,
 * and provides a simple in-memory quick-note list.
 */
import React, { useState } from 'react';
import './FocusedWidget.css';

/** Props for the FocusedWidget component. */
interface FocusedWidgetProps {
  /** Activity tracker hook return value — typed as `any` because the shape is consumed loosely via optional chaining. */
  activityTracker: any;
}

/**
 * Activity summary card with a circular progress ring and quick-note form.
 * The ring represents total active time (focus sessions + activity) relative to a 24-hour goal.
 * Quick notes are kept in local React state and are not persisted between sessions.
 */
const FocusedWidget: React.FC<FocusedWidgetProps> = ({ activityTracker }) => {
  /** Current value of the note title input field. */
  const [note, setNote] = useState('');
  /** In-memory list of saved quick notes — not persisted to storage. */
  const [notes, setNotes] = useState<string[]>([]);
  /** Controls whether the note creation form is visible. */
  const [showNoteForm, setShowNoteForm] = useState(false);

  /**
   * Formats a duration in seconds to a human-readable "Xh Ym" string.
   *
   * @param seconds - Total elapsed seconds.
   * @returns String such as "1h 30m".
   */
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  /** Appends the current note to the list if non-empty, then resets the form. */
  const handleAddNote = () => {
    if (note.trim()) {
      setNotes([...notes, note]);
      setNote('');
      setShowNoteForm(false);
    }
  };

  /** Combined focus + general activity time in seconds from the activity tracker. */
  const totalSeconds = (activityTracker?.focusSessionTime || 0) + (activityTracker?.totalActivityTime || 0);
  /** Daily goal is fixed at 24 hours so the ring represents a fraction of the full day. */
  const dailyGoal = 24 * 3600;
  const percentage = Math.min((totalSeconds / dailyGoal) * 100, 100);

  /**
   * Computes SVG stroke-dasharray / stroke-dashoffset values for a circular progress ring.
   * strokeDashoffset shrinks from the full circumference (0%) down to 0 (100%).
   * The SVG circle is rotated -90° so the arc starts at the top (12 o'clock) instead of the right.
   *
   * @param percentage - Progress value from 0 to 100.
   */
  const drawCircle = (percentage: number) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    return { offset, circumference };
  };

  const { offset, circumference } = drawCircle(percentage);

  return (
    <div className="focused-widget">
      <div className="focused-header">
        <h2 className="focused-title">Focused</h2>
        <select className="focused-period-select">
          <option>This month</option>
          <option>Last week</option>
          <option>This week</option>
          <option>Today</option>
        </select>
      </div>

      {/* Circular progress */}
      <div className="focused-circle-container">
        <svg className="focused-circle-svg" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#2d3748"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#9fff5c"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            className="focused-circle-progress"
          />
        </svg>
        <div className="focused-time">
          {formatTime(totalSeconds)}
        </div>
      </div>

      {/* Add note section */}
      <div className="focused-note-section">
        <div className="note-header">
          <h3 className="note-title">Add a quick note</h3>
          <button
            className="note-add-btn"
            onClick={() => setShowNoteForm(!showNoteForm)}
          >
            +
          </button>
        </div>

        {showNoteForm && (
          <div className="note-form">
            <input
              type="text"
              className="note-input-header"
              placeholder="Header for note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
            />
            <textarea
              className="note-input-body"
              placeholder="Write some ideas..."
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddNote();
                }
              }}
            ></textarea>
            <div className="note-actions">
              <button className="note-btn-cancel" onClick={() => setShowNoteForm(false)}>
                Cancel
              </button>
              <button className="note-btn-save" onClick={handleAddNote}>
                Save
              </button>
            </div>
          </div>
        )}

        {notes.length > 0 && (
          <div className="notes-list">
            {notes.map((n, idx) => (
              <div key={idx} className="note-item">
                {n}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="focused-stats">
        <div className="stat">
          <span className="stat-label">Sessions</span>
          <span className="stat-value">{activityTracker?.sessionCount || 0}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Goal</span>
          <span className="stat-value">24h</span>
        </div>
      </div>
    </div>
  );
};

export default FocusedWidget;
