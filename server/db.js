import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "mobius.db");

let db = null;

export function initializeDatabase() {
  if (db) return db;

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      isDone INTEGER DEFAULT 0,
      isRunning INTEGER DEFAULT 0,
      deadline TEXT,
      description TEXT,
      priority TEXT DEFAULT 'Low' CHECK(priority IN ('High', 'Medium', 'Low')),
      time_spent INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      project_id INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      session_type_id INTEGER,
      duration_planned INTEGER,
      total_seconds INTEGER DEFAULT 0,
      remaining_seconds INTEGER DEFAULT 0,
      state TEXT DEFAULT 'idle',
      is_completed INTEGER DEFAULT 0,
      ended_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );
  `);

  // Non-destructive migrations for existing DB files.
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN time_spent INTEGER DEFAULT 0");
  } catch {}
  try {
    db.exec("ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0");
  } catch {}
  try {
    db.exec(
      "ALTER TABLE focus_sessions ADD COLUMN total_seconds INTEGER DEFAULT 0",
    );
  } catch {}
  try {
    db.exec(
      "ALTER TABLE focus_sessions ADD COLUMN remaining_seconds INTEGER DEFAULT 0",
    );
  } catch {}
  try {
    db.exec("ALTER TABLE focus_sessions ADD COLUMN state TEXT DEFAULT 'idle'");
  } catch {}
  try {
    db.exec("ALTER TABLE focus_sessions ADD COLUMN ended_at DATETIME");
  } catch {}
  try {
    db.exec(
      "ALTER TABLE focus_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP",
    );
  } catch {}

  seedDatabase(db);

  console.log("Database initialized successfully at:", dbPath);
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase first.");
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function seedDatabase(database) {
  const tasksCount = database
    .prepare("SELECT COUNT(*) as count FROM tasks")
    .get();

  if (tasksCount.count === 0) {
    const insertProject = database.prepare(
      "INSERT INTO projects (name) VALUES (?)",
    );
    const projectResult = insertProject.run("Personal Tasks");
    const projectId = projectResult.lastInsertRowid;

    const insertTask = database.prepare(`
      INSERT INTO tasks (id, title, isDone, isRunning, deadline, description, priority, time_spent, order_index, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    insertTask.run(
      "1",
      "Zrobić herbatę",
      0,
      0,
      tomorrow,
      "Opis blablablablablabalablablaabl",
      "High",
      0,
      0,
      projectId,
      now,
    );

    insertTask.run(
      "2",
      "Napisać pierwszy komponent",
      1,
      0,
      new Date(Date.now() - 86400000).toISOString().split("T")[0],
      "Komponent został pomyślnie napisany",
      "Medium",
      0,
      1,
      projectId,
      now,
    );

    insertTask.run(
      "3",
      "Przeczytać dokumentację React",
      0,
      0,
      new Date(Date.now() + 172800000).toISOString().split("T")[0],
      "Zapoznać się z nowymi hookami",
      "Low",
      0,
      2,
      projectId,
      now,
    );
  }
}
