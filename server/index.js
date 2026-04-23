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
    endpoints: ["/api/tasks"],
  });
});

app.get("/api/tasks", (req, res) => {
  try {
    const db = getDatabase();
    const tasks = db
      .prepare("SELECT * FROM tasks ORDER BY order_index ASC")
      .all();

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
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

app.listen(PORT, () => {
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Database available at http://localhost:${PORT}/api/tasks\n`);
});

process.on("SIGINT", () => {
  console.log("\nShutting down server");
  process.exit(0);
});
