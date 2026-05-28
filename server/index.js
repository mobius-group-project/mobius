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
    endpoints: [
      "/api/tasks",
      "/api/focus-session/active",
      "/api/focus-sessions",
    ],
  });
});

app.get("/api/focus-sessions", (req, res) => {
  try {
    const db = getDatabase();
    const sessions = db
      .prepare(
        `SELECT *
         FROM focus_sessions
         ORDER BY created_at DESC, id DESC`,
      )
      .all();

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching focus sessions:", error);
    res.status(500).json({ error: "Failed to fetch focus sessions" });
  }
});

app.get("/api/focus-session/active", (req, res) => {
  try {
    const db = getDatabase();
    const activeSession = db
      .prepare(
        `SELECT *
         FROM focus_sessions
         WHERE state IN ('running', 'paused')
         ORDER BY updated_at DESC, id DESC
         LIMIT 1`,
      )
      .get();

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
      res
        .status(400)
        .json({ error: "duration_seconds must be a positive number" });
      return;
    }

    const insertSession = db.prepare(`
      INSERT INTO focus_sessions (
        duration_planned,
        total_seconds,
        remaining_seconds,
        state,
        is_completed,
        updated_at,
        created_at
      )
      VALUES (?, ?, ?, 'running', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const result = insertSession.run(duration, duration, duration);
    const session = db
      .prepare("SELECT * FROM focus_sessions WHERE id = ?")
      .get(result.lastInsertRowid);

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

    const updateSession = db.prepare(`
      UPDATE focus_sessions
      SET remaining_seconds = COALESCE(?, remaining_seconds),
          state = COALESCE(?, state),
          is_completed = COALESCE(?, is_completed),
          ended_at = CASE
            WHEN COALESCE(?, state) = 'finished' THEN CURRENT_TIMESTAMP
            ELSE ended_at
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateSession.run(
      remaining_seconds !== undefined ? remaining_seconds : null,
      state || null,
      is_completed !== undefined ? (is_completed ? 1 : 0) : null,
      state || null,
      id,
    );

    const session = db
      .prepare("SELECT * FROM focus_sessions WHERE id = ?")
      .get(id);

    if (!session) {
      res.status(404).json({ error: "Focus session not found" });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error("Error updating focus session:", error);
    res.status(500).json({ error: "Failed to update focus session" });
  }
});

app.get("/api/tasks", (req, res) => {
  try {
    const db = getDatabase();
    const tasks = db
      .prepare("SELECT * FROM tasks ORDER BY order_index ASC")
      .all();
    const comments = db
      .prepare(
        `SELECT id, task_id, content, created_at
         FROM comments
         ORDER BY created_at ASC, id ASC`,
      )
      .all();

    const commentsByTask = new Map();
    comments.forEach((comment) => {
      const list = commentsByTask.get(comment.task_id) || [];
      list.push({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
      });
      commentsByTask.set(comment.task_id, list);
    });

    const tasksWithComments = tasks.map((task) => ({
      ...task,
      comments: commentsByTask.get(task.id) || [],
    }));

    res.json(tasksWithComments);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

app.get("/api/tasks/:id/comments", (req, res) => {
  try {
    const db = getDatabase();

    const comments = db
      .prepare(
        `SELECT id, content, created_at
         FROM comments
         WHERE task_id = ?
         ORDER BY created_at ASC, id ASC`,
      )
      .all(req.params.id);

    res.json(comments);
  } catch (error) {
    console.error("Error fetching task comments:", error);
    res.status(500).json({ error: "Failed to fetch task comments" });
  }
});

app.post("/api/tasks/:id/comments", (req, res) => {
  try {
    const db = getDatabase();
    const { content } = req.body;
    const normalizedContent = typeof content === "string" ? content.trim() : "";

    if (!normalizedContent) {
      res.status(400).json({ error: "Comment content is required" });
      return;
    }

    const task = db
      .prepare("SELECT id FROM tasks WHERE id = ?")
      .get(req.params.id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    const insertComment = db.prepare(`
      INSERT INTO comments (task_id, content, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);

    const result = insertComment.run(req.params.id, normalizedContent);
    const newComment = db
      .prepare(
        "SELECT id, task_id, content, created_at FROM comments WHERE id = ?",
      )
      .get(result.lastInsertRowid);

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error creating task comment:", error);
    res.status(500).json({ error: "Failed to create task comment" });
  }
});

app.delete("/api/tasks/:taskId/comments/:commentId", (req, res) => {
  try {
    const db = getDatabase();
    const { taskId, commentId } = req.params;

    const comment = db
      .prepare("SELECT id FROM comments WHERE id = ? AND task_id = ?")
      .get(commentId, taskId);

    if (!comment) {
      res.status(404).json({ error: "Comment not found" });
      return;
    }

    db.prepare("DELETE FROM comments WHERE id = ? AND task_id = ?").run(
      commentId,
      taskId,
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task comment:", error);
    res.status(500).json({ error: "Failed to delete task comment" });
  }
});

app.patch("/api/tasks/reorder", (req, res) => {
  try {
    const db = getDatabase();
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      res.status(400).json({ error: "ids must be an array" });
      return;
    }

    const update = db.prepare("UPDATE tasks SET order_index = ? WHERE id = ?");
    const updateAll = db.transaction((orderedIds) => {
      orderedIds.forEach((id, index) => update.run(index, id));
    });
    updateAll(ids);

    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering tasks:", error);
    res.status(500).json({ error: "Failed to reorder tasks" });
  }
});

app.get("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();
    const task = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(req.params.id);

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

app.post("/api/tasks", (req, res) => {
  try {
    const db = getDatabase();
    const {
      id,
      title,
      isDone,
      isRunning,
      deadline,
      description,
      priority,
      time_spent,
      project_id,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, isDone, isRunning, deadline, description, priority, time_spent, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const taskId = id || Date.now().toString();
    insertTask.run(
      taskId,
      title,
      isDone ? 1 : 0,
      isRunning ? 1 : 0,
      deadline || null,
      description || null,
      priority || "Low",
      time_spent || 0,
      project_id || null,
    );

    const newTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

app.put("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();
    const {
      title,
      isDone,
      isRunning,
      deadline,
      description,
      priority,
      time_spent,
    } = req.body;

    const updateTask = db.prepare(`
      UPDATE tasks 
      SET title = COALESCE(?, title),
          isDone = COALESCE(?, isDone),
          isRunning = COALESCE(?, isRunning),
          deadline = COALESCE(?, deadline),
          description = COALESCE(?, description),
          priority = COALESCE(?, priority),
          time_spent = COALESCE(?, time_spent)
      WHERE id = ?
    `);

    updateTask.run(
      title || null,
      isDone !== undefined ? (isDone ? 1 : 0) : null,
      isRunning !== undefined ? (isRunning ? 1 : 0) : null,
      deadline || null,
      description || null,
      priority || null,
      time_spent !== undefined ? time_spent : null,
      req.params.id,
    );

    const updatedTask = db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(req.params.id);

    if (!updatedTask) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

app.delete("/api/tasks/:id", (req, res) => {
  try {
    const db = getDatabase();

    db.prepare("DELETE FROM comments WHERE task_id = ?").run(req.params.id);

    const deleteTask = db.prepare("DELETE FROM tasks WHERE id = ?");
    const result = deleteTask.run(req.params.id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

app.listen(PORT, () => {});

process.on("SIGINT", () => {
  console.log("\nShutting down server");
  process.exit(0);
});

// Pobierz wszystkie sesje aktywności
app.get("/api/activity-sessions", (req, res) => {
  try {
    const db = getDatabase();
    const sessions = db
      .prepare(`
        SELECT * FROM activity_sessions 
        ORDER BY created_at DESC, start_time DESC
      `)
      .all();
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching activity sessions:", error);
    res.status(500).json({ error: "Failed to fetch activity sessions" });
  }
});

// Pobierz aktywną sesję (bez zakończonej end_time)
app.get("/api/activity-sessions/active", (req, res) => {
  try {
    const db = getDatabase();
    const activeSession = db
      .prepare(`
        SELECT * FROM activity_sessions 
        WHERE end_time IS NULL
        ORDER BY start_time DESC 
        LIMIT 1
      `)
      .get();
    res.json(activeSession || null);
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ error: "Failed to fetch active session" });
  }
});

// Rozpocznij nową sesję aktywności
app.post("/api/activity-sessions/start", (req, res) => {
  try {
    const db = getDatabase();
    const { id, activity_name, is_task, task_id, duration_seconds } = req.body;

    if (!activity_name) {
      res.status(400).json({ error: "activity_name is required" });
      return;
    }

    const now = new Date().toISOString();
    
    // Sprawdź czy istnieje już aktywna sesja
    const activeSession = db
      .prepare("SELECT * FROM activity_sessions WHERE end_time IS NULL")
      .get();
    
    if (activeSession) {
      res.status(400).json({ error: "An active session already exists" });
      return;
    }

    const insertSession = db.prepare(`
      INSERT INTO activity_sessions (
        id, activity_name, start_time, duration_seconds, 
        is_task, task_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sessionId = id || Date.now().toString();
    insertSession.run(
      sessionId,
      activity_name,
      now,
      duration_seconds || 0,
      is_task ? 1 : 0,
      task_id || null,
      now,
      now
    );

    // Jeśli to sesja związana z zadaniem, zaktualizuj isRunning w tasks
    if (is_task && task_id) {
      db.prepare(`
        UPDATE tasks SET isRunning = 1
        WHERE id = ?
      `).run(task_id);
    }

    const session = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(sessionId);

    res.status(201).json(session);
  } catch (error) {
    console.error("Error starting activity session:", error);
    res.status(500).json({ error: "Failed to start activity session" });
  }
});

// Zakończ sesję aktywności
app.patch("/api/activity-sessions/:id/stop", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { duration_seconds } = req.body;

    const now = new Date().toISOString();

    // Pobierz sesję przed aktualizacją
    const session = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Aktualizuj sesję
    const updateSession = db.prepare(`
      UPDATE activity_sessions 
      SET end_time = ?,
          duration_seconds = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const finalDuration = duration_seconds !== undefined ? duration_seconds : session.duration_seconds;
    updateSession.run(now, finalDuration, now, id);

    // Jeśli to sesja związana z zadaniem, zaktualizuj time_spent
    if (session.is_task && session.task_id) {
      const task = db
        .prepare("SELECT time_spent FROM tasks WHERE id = ?")
        .get(session.task_id);
      
      const newTimeSpent = (task?.time_spent || 0) + finalDuration;
      
      db.prepare(`
          UPDATE tasks 
          SET time_spent = ?, isRunning = 0
          WHERE id = ?
        `).run(newTimeSpent, session.task_id);
    }

    const updatedSession = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(id);

    res.json(updatedSession);
  } catch (error) {
    console.error("Error stopping activity session:", error);
    res.status(500).json({ error: "Failed to stop activity session" });
  }
});

// Zaktualizuj trwającą sesję (aktualizacja czasu)
app.patch("/api/activity-sessions/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { duration_seconds } = req.body;

    const updateSession = db.prepare(`
      UPDATE activity_sessions 
      SET duration_seconds = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND end_time IS NULL
    `);

    updateSession.run(duration_seconds, id);

    const session = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    res.json(session);
  } catch (error) {
    console.error("Error updating activity session:", error);
    res.status(500).json({ error: "Failed to update activity session" });
  }
});

// Usuń sesję aktywności
app.delete("/api/activity-sessions/:id", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Sprawdź czy sesja istnieje
    const session = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(id);

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    // Jeśli sesja była aktywna i związana z zadaniem, zresetuj isRunning
    if (session.end_time === null && session.is_task && session.task_id) {
      db.prepare(`
        UPDATE tasks SET isRunning = 0 WHERE id = ?
      `).run(session.task_id);
    }

    const deleteSession = db.prepare("DELETE FROM activity_sessions WHERE id = ?");
    deleteSession.run(id);

    res.json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("Error deleting activity session:", error);
    res.status(500).json({ error: "Failed to delete activity session" });
  }
});

// Zmień nazwę sesji
app.patch("/api/activity-sessions/:id/rename", (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { activity_name } = req.body;

    if (!activity_name) {
      res.status(400).json({ error: "activity_name is required" });
      return;
    }

    const updateSession = db.prepare(`
      UPDATE activity_sessions 
      SET activity_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateSession.run(activity_name, id);

    const session = db
      .prepare("SELECT * FROM activity_sessions WHERE id = ?")
      .get(id);

    res.json(session);
  } catch (error) {
    console.error("Error renaming session:", error);
    res.status(500).json({ error: "Failed to rename session" });
  }
});

// Pobierz statystyki dzisiejszego dnia
app.get("/api/activity-stats/today", (req, res) => {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    
    const stats = db
      .prepare(`
        SELECT 
          COALESCE(SUM(duration_seconds), 0) as total_seconds,
          COUNT(*) as session_count
        FROM activity_sessions 
        WHERE date(start_time) = ?
      `)
      .get(today);
    
    res.json(stats);
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET all events
app.get('/api/events', (req, res) => {
  try {
    const db = getDatabase();
    const events = db.prepare('SELECT * FROM calendar_events ORDER BY date, start_time').all();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST new event
app.post('/api/events', (req, res) => {
  try {
    const db = getDatabase();
    const { title, date, start_time, end_time, color, location, description, is_all_day, recurrence, reminder_minutes, task_id } = req.body;
    const result = db.prepare(`
      INSERT INTO calendar_events 
        (title, date, start_time, end_time, color, location, description, is_all_day, recurrence, reminder_minutes, task_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, date, start_time, end_time,
      color ?? '#A7C7E7',
      location ?? null,
      description ?? null,
      is_all_day ? 1 : 0,
      recurrence ?? 'none',
      reminder_minutes ?? null,
      task_id ?? null
    );
    const created = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE an event
app.delete('/api/events/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});