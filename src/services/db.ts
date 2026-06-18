/**
 * SQLite database singleton for the Tauri desktop app.
 * All data access goes through `getDb()` — the `server/` folder is a legacy browser build and is not used here.
 * Schema is created and migrated automatically on first open; migrations are additive (ALTER TABLE only).
 */
import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

/**
 * Returns the shared SQLite database instance, initialising it on the first call.
 * Uses Tauri's SQL plugin to open `mobius.db` in the app data directory.
 */
export async function getDb(): Promise<Database> {
  if (db) return db;
  db = await Database.load('sqlite:mobius.db');
  await initSchema(db);
  return db;
}

/** Creates all tables and runs additive column migrations on an existing DB file. */
async function initSchema(db: Database): Promise<void> {
  // Project grouping for tasks.
  await db.execute(`CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  // Individual to-do items with priority, deadline, time tracking, and drag order.
  await db.execute(`CREATE TABLE IF NOT EXISTS tasks (
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
  )`);

  // Text comments attached to a task.
  await db.execute(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`);

  // Focus timer sessions. remaining_seconds + updated_at let the timer survive a page reload (see useFocusTimer restore logic).
  await db.execute(`CREATE TABLE IF NOT EXISTS focus_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT,
    duration_planned INTEGER,
    total_seconds INTEGER DEFAULT 0,
    remaining_seconds INTEGER DEFAULT 0,
    state TEXT DEFAULT 'idle',
    is_completed INTEGER DEFAULT 0,
    ended_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`);

  // Plants grown by completing focus sessions — the garden.
  await db.execute(`CREATE TABLE IF NOT EXISTS focus_plants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_type TEXT NOT NULL,
    session_duration INTEGER NOT NULL,
    planted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Free-form text notes.
  await db.execute(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Activity tracker sessions (named activities or linked tasks with start/end times).
  await db.execute(`CREATE TABLE IF NOT EXISTS activity_sessions (
    id TEXT PRIMARY KEY,
    activity_name TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_seconds INTEGER DEFAULT 0,
    is_task INTEGER DEFAULT 0,
    task_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`);

  // Calendar events with optional recurrence, reminders, and task linkage.
  await db.execute(`CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    color TEXT DEFAULT '#A7C7E7',
    location TEXT,
    description TEXT,
    is_all_day INTEGER DEFAULT 0,
    recurrence TEXT DEFAULT 'none' CHECK(recurrence IN ('none','daily','weekly','monthly')),
    recurrence_count INTEGER,
    recurrence_end_date TEXT,
    reminder_minutes INTEGER,
    task_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  )`);

  // Columns added after the initial release. Each statement is run on every launch;
  // the try/catch silently skips it if the column already exists in an older DB file.
  const migrations = [
    `ALTER TABLE tasks ADD COLUMN time_spent INTEGER DEFAULT 0`,
    `ALTER TABLE tasks ADD COLUMN order_index INTEGER DEFAULT 0`,
    `ALTER TABLE focus_sessions ADD COLUMN total_seconds INTEGER DEFAULT 0`,
    `ALTER TABLE focus_sessions ADD COLUMN remaining_seconds INTEGER DEFAULT 0`,
    `ALTER TABLE focus_sessions ADD COLUMN state TEXT DEFAULT 'idle'`,
    `ALTER TABLE focus_sessions ADD COLUMN ended_at DATETIME`,
    `ALTER TABLE focus_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE activity_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE calendar_events ADD COLUMN location TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN description TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN is_all_day INTEGER DEFAULT 0`,
    `ALTER TABLE calendar_events ADD COLUMN recurrence TEXT DEFAULT 'none'`,
    `ALTER TABLE calendar_events ADD COLUMN reminder_minutes INTEGER`,
    `ALTER TABLE calendar_events ADD COLUMN task_id TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN recurrence_count INTEGER`,
    `ALTER TABLE calendar_events ADD COLUMN recurrence_end_date TEXT`,
  ];

  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }
}
