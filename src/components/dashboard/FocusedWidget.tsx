import React, { useState } from 'react';
import './FocusedWidget.css';

interface FocusedWidgetProps {
  activityTracker: any;
}

const FocusedWidget: React.FC<FocusedWidgetProps> = ({ activityTracker }) => {
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleAddNote = () => {
    if (note.trim()) {
      setNotes([...notes, note]);
      setNote('');
      setShowNoteForm(false);
    }
  };

  // Вычисляем процент заполнения окружности (23h 25m из 24h)
  const totalSeconds = (activityTracker?.focusSessionTime || 0) + (activityTracker?.totalActivityTime || 0);
  const dailyGoal = 24 * 3600; // 24 часа как целевое значение
  const percentage = Math.min((totalSeconds / dailyGoal) * 100, 100);

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
