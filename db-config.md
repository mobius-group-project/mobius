> **Legacy** — this file describes the old Express.js + SQLite browser build (`server/` folder).
> The Tauri desktop app does not use this server. All data access goes through `src/services/` via `@tauri-apps/plugin-sql` (see `src/services/db.ts`).

### 1. Backend (Express.js + SQLite)

- Port: 3001
- Database: SQLite (file server/mobius.db)

### 2. API Endpoints

- GET /api/tasks - get all tasks
- GET /api/tasks/:id - get one task
- POST /api/tasks - create new task
- PUT /api/tasks/:id - update task
- DELETE /api/tasks/:id - delete task
- PATCH /api/tasks/reorder - save task order

- GET /api/tasks/:id/comments - get task comments
- POST /api/tasks/:id/comments - add comment to task
- DELETE /api/tasks/:taskId/comments/:commentId - delete comment

- GET /api/focus-sessions - get focus sessions history
- GET /api/focus-session/active - get active focus session
- POST /api/focus-session/start - start focus session
- PATCH /api/focus-session/:id - update focus session

### 3. Start app

- First start: npm install

- npm run dev

Then open http://localhost:5173
