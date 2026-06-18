/**
 * CRUD service for the notes table.
 * Notes store rich HTML content produced by the contentEditable editor in NotesCard.
 */
import { getDb } from './db';

/** A row from the notes table. `content` is raw HTML from the contentEditable editor. */
export interface INote {
  id: number;
  title: string;
  /** Raw HTML string — rendered with dangerouslySetInnerHTML in the notes list. */
  content: string;
  created_at: string;
  updated_at: string;
}

export const noteService = {
  /** Returns all notes ordered by most recently created. */
  async getNotes(): Promise<INote[]> {
    const db = await getDb();
    return db.select<INote[]>('SELECT * FROM notes ORDER BY created_at DESC, id DESC');
  },

  /** Inserts a new note and returns the created row. */
  async createNote(title: string, content: string): Promise<INote> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO notes (title, content) VALUES (?, ?)',
      [title, content]
    );
    const rows = await db.select<INote[]>('SELECT * FROM notes WHERE id = ?', [result.lastInsertId]);
    return rows[0];
  },

  /** Updates the title, content, and updated_at timestamp of an existing note. */
  async updateNote(id: number, title: string, content: string): Promise<INote> {
    const db = await getDb();
    await db.execute(
      'UPDATE notes SET title=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [title, content, id]
    );
    const rows = await db.select<INote[]>('SELECT * FROM notes WHERE id = ?', [id]);
    return rows[0];
  },

  /** Permanently deletes a note by ID. */
  async deleteNote(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM notes WHERE id = ?', [id]);
  },
};
