import express from "express";
import cors from "cors";
import { initializeDatabase, getDatabase } from "./db.js";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

initializeDatabase();

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Mobius API is running",
    endpoints: ["/api/tasks", "/api/focus-session/active", "/api/focus-sessions"],
  });
});

// ─── FOCUS SESSIONS ───────────────────────────────────────────────────────────

app.get("/api/focus-sessions", (req, res) => {
  try {
    const db = getDatabase();
    const sessions = db.prepare(`SELECT * FROM focus_sessions ORDER BY created_at DESC, id DESC`).all();
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching focus sessions:", error);
    res.status(500).json({ error: "Failed to fetch focus sessions" });
  }
});

app.get("/api/focus-session/active", (req, res) => {
  try {
    const db = getDatabase();
    const activeSession = db.prepare(`
      SELECT * FROM focus_sessions
      WHERE state IN ('running', 'paused')
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `).get();
    res.json(activeSession || null);
  } catch (error) {
    console.error("Error fetching active focus session:", error);
    res.status(500).json({ error: "Failed to fetch active focus session" });
  }
});

app.post("/api/focus-session/start", (req, res) => {
  try {
    const db = getDatabase();
    const { duration_seconds } = req.body;
    const duration = Number(duration_seconds);
    if (!Number.isFinite(duration) || duration <= 0) {
      res.status(400).json({ error: "duration_seconds must be a positive number" });
      return;
    }
    const result = db.prepare(`
      INSERT INTO focus_sessions (duration_planned, total_seconds, remaining_seconds, state, is_completed, updated_at, created_at)
      VALUES (?, ?, ?, 'running', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(duration, duration, duration);
    const session = db.prepare("SELECT * FROM focus_sessions WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(session);
  } catch (error) {
    console.error("Error starting focus session:", error);
    res.status(500).json({ error: "Failed to start focus session" });
  }
});

app.patch("/api/focus-session/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { remaining_seconds, state, is_completed } = req.body;
    db.prepare(`
      UPDATE focus_sessions
      SET remaining_seconds = COALESCE(?, remaining_seconds),
          state = COALESCE(?, state),
          is_completed = COALESCE(?, is_completed),
          ended_at = CASE WHEN COALESCE(?, state) = 'finished' THEN CURRENT_TIMESTAMP ELSE ended_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      remaining_seconds !== undefined ? remaining_seconds : null,
      state || null,
      is_completed !== undefined ? (is_completed ? 1 : 0) : null,
      state || null,
      id,
    );
    const session = db.prepare("SELECT * FROM focus_sessions WHERE id = ?").get(id);
    if (!session) { res.status(404).json({ error: "Focus session not found" }); return; }
    res.json(session);
  } catch (error) {
    console.error("Error updating focus session:", error);
    res.status(500).json({ error: "Failed to update focus session" });
  }
});

// ─── FOCUS PLANTS ─────────────────────────────────────────────────────────────

app.get('/api/focus-plants', (req, res) => {
  try {
    const db = getDatabase();
    const plants = db.prepare('SELECT * FROM focus_plants ORDER BY planted_at DESC').all();
    res.json(plants);
  } catch (error) {
    console.error('Error fetching focus plants:', error);
    res.status(500).json({ error: 'Failed to fetch focus plants' });
  }
});

app.post('/api/focus-plants', (req, res) => {
  try {
    const db = getDatabase();
    const { plant_type, session_duration } = req.body;
    if (!plant_type) { return res.status(400).json({ error: 'plant_type is required' }); }
    const result = db.prepare(`INSERT INTO focus_plants (plant_type, session_duration) VALUES (?, ?)`).run(plant_type, session_duration || 0);
    const plant = db.prepare('SELECT * FROM focus_plants WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(plant);
  } catch (error) {
    console.error('Error planting focus plant:', error);
    res.status(500).json({ error: 'Failed to plant focus plant' });
  }
});

// ─── TASKS ────────────────────────────────────────────────────────────────────

app.get("/api/tasks", (req, res) => {
  try {
    const db = getDatabase();
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY order_index ASC").all();
    const comments = db.prepare(`SELECT id, task_id, content, created_at FROM comments ORDER BY created_at ASC, id ASC`).all();
    const commentsByTask = new Map();
    comments.forEach((comment) => {
      const list = commentsByTask.get(comment.task_id) || [];
      list.push({ id: comment.id, content: comment.content, created_at: comment.created_at });
      commentsByTask.set(comment.task_id, list);
    });
    res.json(tasks.map((task) => ({ ...task, comments: commentsByTask.get(task.id) || [] })));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.get("/api/tasks/:id/comments", (req, res) => {
  try {
    const db = getDatabase();
    const comments = db.prepare(`SELECT id, content, created_at FROM comments WHERE task_id = ? ORDER BY created_at ASC, id ASC`).all(req.params.id);
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task comments" });
  }
});

app.post("/api/tasks/:id/comments", (req, res) => {
  try {
    const db = getDatabase();
    const normalizedContent = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (!normalizedContent) { res.status(400).json({ error: "Comment content is required" }); return; }
    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    const result = db.prepare(`INSERT INTO comments (task_id, content, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).run(req.params.id, normalizedContent);
    const newComment = db.prepare("SELECT id, task_id, content, created_at FROM comments WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task comment" });
  }
});

app.delete("/api/tasks/:taskId/comments/:commentId", (req, res) => {
  try {
    const db = getDatabase();
    const { taskId, commentId } = req.params;
    const comment = db.prepare("SELECT id FROM comments WHERE id = ? AND task_id = ?").get(commentId, taskId);
    if (!comment) { res.status(404).json({ error: "Comment not found" }); return; }
    db.prepare("DELETE FROM comments WHERE id = ? AND task_id = ?").run(commentId, taskId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task comment" });
  }
});

app.patch("/api/tasks/reorder", (req, res) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;
    if (!Array.isArray(ids)) { res.status(400).json({ error: "ids must be an array" }); return; }
    const update = db.prepare("UPDATE tasks SET order_index = ? WHERE id = ?");
    db.transaction((orderedIds) => { orderedIds.forEach((id, index) => update.run(index, id)); })(ids);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder tasks" });
  }
});

app.get("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const db = getDatabase();
    const { id, title, isDone, isRunning, deadline, description, priority, time_spent, project_id } = req.body;
    if (!title) { res.status(400).json({ error: "Title is required" }); return; }
    const taskId = id || Date.now().toString();
    db.prepare(`INSERT INTO tasks (id, title, isDone, isRunning, deadline, description, priority, time_spent, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(taskId, title, isDone ? 1 : 0, isRunning ? 1 : 0, deadline || null, description || null, priority || "Low", time_spent || 0, project_id || null);
    res.status(201).json(db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { title, isDone, isRunning, deadline, description, priority, time_spent } = req.body;
    db.prepare(`
      UPDATE tasks
      SET title = COALESCE(?, title), isDone = COALESCE(?, isDone), isRunning = COALESCE(?, isRunning),
          deadline = COALESCE(?, deadline), description = COALESCE(?, description),
          priority = COALESCE(?, priority), time_spent = COALESCE(?, time_spent)
      WHERE id = ?
    `).run(title || null, isDone !== undefined ? (isDone ? 1 : 0) : null, isRunning !== undefined ? (isRunning ? 1 : 0) : null,
      deadline || null, description || null, priority || null, time_spent !== undefined ? time_spent : null, req.params.id);
    const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
    if (!updatedTask) { res.status(404).json({ error: "Task not found" }); return; }
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();
    db.prepare("DELETE FROM comments WHERE task_id = ?").run(req.params.id);
    const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    if (result.changes === 0) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// ─── ACTIVITY SESSIONS ────────────────────────────────────────────────────────

app.get("/api/activity-sessions", (req, res) => {
  try {
    const db = getDatabase();
    res.json(db.prepare(`SELECT * FROM activity_sessions ORDER BY created_at DESC, start_time DESC`).all());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity sessions" });
  }
});

app.get("/api/activity-sessions/active", (req, res) => {
  try {
    const db = getDatabase();
    res.json(db.prepare(`SELECT * FROM activity_sessions WHERE end_time IS NULL ORDER BY start_time DESC LIMIT 1`).get() || null);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch active session" });
  }
});

app.post("/api/activity-sessions/start", (req, res) => {
  try {
    const db = getDatabase();
    const { id, activity_name, is_task, task_id, duration_seconds } = req.body;
    if (!activity_name) { res.status(400).json({ error: "activity_name is required" }); return; }
    const activeSession = db.prepare("SELECT * FROM activity_sessions WHERE end_time IS NULL").get();
    if (activeSession) { res.status(400).json({ error: "An active session already exists" }); return; }
    const now = new Date().toISOString();
    const sessionId = id || Date.now().toString();
    db.prepare(`INSERT INTO activity_sessions (id, activity_name, start_time, duration_seconds, is_task, task_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(sessionId, activity_name, now, duration_seconds || 0, is_task ? 1 : 0, task_id || null, now, now);
    if (is_task && task_id) { db.prepare(`UPDATE tasks SET isRunning = 1 WHERE id = ?`).run(task_id); }
    res.status(201).json(db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(sessionId));
  } catch (error) {
    res.status(500).json({ error: "Failed to start activity session" });
  }
});

app.patch("/api/activity-sessions/:id/stop", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { duration_seconds } = req.body;
    const session = db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(id);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    const now = new Date().toISOString();
    const finalDuration = duration_seconds !== undefined ? duration_seconds : session.duration_seconds;
    db.prepare(`UPDATE activity_sessions SET end_time = ?, duration_seconds = ?, updated_at = ? WHERE id = ?`).run(now, finalDuration, now, id);
    if (session.is_task && session.task_id) {
      const task = db.prepare("SELECT time_spent FROM tasks WHERE id = ?").get(session.task_id);
      db.prepare(`UPDATE tasks SET time_spent = ?, isRunning = 0 WHERE id = ?`).run((task?.time_spent || 0) + finalDuration, session.task_id);
    }
    res.json(db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(id));
  } catch (error) {
    res.status(500).json({ error: "Failed to stop activity session" });
  }
});

app.patch("/api/activity-sessions/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.prepare(`UPDATE activity_sessions SET duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND end_time IS NULL`).run(req.body.duration_seconds, id);
    const session = db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(id);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to update activity session" });
  }
});

app.delete("/api/activity-sessions/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const session = db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(id);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    if (session.end_time === null && session.is_task && session.task_id) {
      db.prepare(`UPDATE tasks SET isRunning = 0 WHERE id = ?`).run(session.task_id);
    }
    db.prepare("DELETE FROM activity_sessions WHERE id = ?").run(id);
    res.json({ success: true, message: "Session deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete activity session" });
  }
});

app.patch("/api/activity-sessions/:id/rename", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { activity_name } = req.body;
    if (!activity_name) { res.status(400).json({ error: "activity_name is required" }); return; }
    db.prepare(`UPDATE activity_sessions SET activity_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(activity_name, id);
    res.json(db.prepare("SELECT * FROM activity_sessions WHERE id = ?").get(id));
  } catch (error) {
    res.status(500).json({ error: "Failed to rename session" });
  }
});

// ─── ACTIVITY STATS ───────────────────────────────────────────────────────────

app.get("/api/activity-stats/today", (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    res.json(db.prepare(`SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds, COUNT(*) as session_count FROM activity_sessions WHERE date(start_time) = ?`).get(today));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/activity-stats/range", (req, res) => {
  try {
    const db = getDatabase();
    const { from, to } = req.query;
    if (!from || !to) { return res.status(400).json({ error: "from and to query params are required" }); }
    const summary = db.prepare(`
      SELECT COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count,
             COALESCE(MAX(duration_seconds), 0) AS longest_session, COALESCE(AVG(duration_seconds), 0) AS avg_session
      FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?
    `).get(from, to);
    const daily = db.prepare(`
      SELECT date(start_time) AS date, COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count
      FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?
      GROUP BY date(start_time) ORDER BY date(start_time) ASC
    `).all(from, to);
    const topActivities = db.prepare(`
      SELECT activity_name, COALESCE(SUM(duration_seconds), 0) AS total_seconds, COUNT(*) AS session_count
      FROM activity_sessions WHERE end_time IS NOT NULL AND date(start_time) >= ? AND date(start_time) <= ?
      GROUP BY activity_name ORDER BY total_seconds DESC LIMIT 10
    `).all(from, to);
    res.json({ summary, daily, topActivities });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch range stats" });
  }
});

app.get("/api/activity-stats/weekly", (req, res) => {
  try {
    const db = getDatabase();
    const weeks = Math.min(parseInt(req.query.weeks) || 8, 52);
    res.json(db.prepare(`
      SELECT strftime('%Y-W%W', start_time) AS week, COALESCE(SUM(duration_seconds), 0) AS total_seconds,
             COUNT(*) AS session_count, COUNT(DISTINCT date(start_time)) AS active_days
      FROM activity_sessions WHERE end_time IS NOT NULL AND start_time >= datetime('now', ? || ' days')
      GROUP BY strftime('%Y-W%W', start_time) ORDER BY week ASC
    `).all(`-${weeks * 7}`));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch weekly stats" });
  }
});

// ─── CALENDAR EVENTS ──────────────────────────────────────────────────────────

app.get('/api/events', (req, res) => {
  try {
    const db = getDatabase();
    res.json(db.prepare('SELECT * FROM calendar_events ORDER BY date, start_time').all());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const db = getDatabase();
    const { title, date, start_time, end_time, color, location, description, is_all_day, recurrence, recurrence_count, recurrence_end_date, reminder_minutes, task_id } = req.body;
    const result = db.prepare(`
      INSERT INTO calendar_events (title, date, start_time, end_time, color, location, description, is_all_day, recurrence, recurrence_count, recurrence_end_date, reminder_minutes, task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, date, start_time, end_time, color ?? '#A7C7E7', location ?? null, description ?? null,
      is_all_day ? 1 : 0, recurrence ?? 'none', recurrence_count ?? null, recurrence_end_date ?? null, reminder_minutes ?? null, task_id ?? null);
    res.status(201).json(db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid));
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { title, date, start_time, end_time, color, location, description, is_all_day, recurrence, recurrence_count, recurrence_end_date, reminder_minutes } = req.body;
    db.prepare(`
      UPDATE calendar_events SET title=?, date=?, start_time=?, end_time=?, color=?, location=?, description=?,
        is_all_day=?, recurrence=?, recurrence_count=?, recurrence_end_date=?, reminder_minutes=? WHERE id=?
    `).run(title, date, start_time, end_time, color ?? '#A7C7E7', location ?? null, description ?? null,
      is_all_day ? 1 : 0, recurrence ?? 'none', recurrence_count ?? null, recurrence_end_date ?? null, reminder_minutes ?? null, req.params.id);
    res.json(db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(req.params.id));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.delete('/api/events/all', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM calendar_events').run();
    res.json({ success: true, deletedCount: result.changes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete events' });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {});

process.on("SIGINT", () => {
  console.log("\nShutting down server");
  process.exit(0);
});