import { getDb } from './db';

export interface INote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const noteService = {
  async getNotes(): Promise<INote[]> {
    const db = await getDb();
    return db.select<INote[]>('SELECT * FROM notes ORDER BY created_at DESC, id DESC');
  },

  async createNote(title: string, content: string): Promise<INote> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO notes (title, content) VALUES (?, ?)',
      [title, content]
    );
    const rows = await db.select<INote[]>('SELECT * FROM notes WHERE id = ?', [result.lastInsertId]);
    return rows[0];
  },

  async updateNote(id: number, title: string, content: string): Promise<INote> {
    const db = await getDb();
    await db.execute(
      'UPDATE notes SET title=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [title, content, id]
    );
    const rows = await db.select<INote[]>('SELECT * FROM notes WHERE id = ?', [id]);
    return rows[0];
  },

  async deleteNote(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM notes WHERE id = ?', [id]);
  },
};
