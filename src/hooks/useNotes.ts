/**
 * React hook for managing notes with optimistic UI updates.
 *
 * Each mutating operation (add, update, delete) applies the change to local state immediately,
 * then syncs to SQLite in the background. If the DB write fails, the optimistic update is
 * rolled back to the previous state so the UI stays consistent with what's actually persisted.
 */
import { useState, useEffect, useCallback } from 'react';
import { noteService, type INote } from '../services/noteService';

/**
 * Provides the full notes list and CRUD operations with optimistic updates.
 *
 * @returns `notes` — current list; `loading` — true until the initial fetch completes;
 *   `addNote`, `updateNote`, `deleteNote` — async mutators.
 */
export function useNotes() {
  const [notes, setNotes] = useState<INote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      setNotes(await noteService.getNotes());
    } catch {
      console.error('Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  /**
   * Adds a note with an optimistic placeholder (negative tempId) that is replaced by the
   * real DB row once the INSERT resolves. Rolls back on failure.
   */
  const addNote = useCallback(async (title: string, content: string) => {
    const tempId = -Date.now();
    const optimistic: INote = { id: tempId, title, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    setNotes(prev => [optimistic, ...prev]);
    try {
      const saved = await noteService.createNote(title, content);
      setNotes(prev => prev.map(n => n.id === tempId ? saved : n));
    } catch {
      setNotes(prev => prev.filter(n => n.id !== tempId));
    }
  }, []);

  /** Updates a note optimistically; restores the previous list if the DB write fails. */
  const updateNote = useCallback(async (id: number, title: string, content: string) => {
    const prev = notes;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
    try {
      await noteService.updateNote(id, title, content);
    } catch {
      setNotes(prev);
    }
  }, [notes]);

  /** Removes a note optimistically; restores the previous list if the DB write fails. */
  const deleteNote = useCallback(async (id: number) => {
    const prev = notes;
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await noteService.deleteNote(id);
    } catch {
      setNotes(prev);
    }
  }, [notes]);

  return { notes, loading, addNote, updateNote, deleteNote };
}
