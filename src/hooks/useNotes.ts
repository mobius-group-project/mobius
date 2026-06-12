import { useState, useEffect, useCallback } from 'react';
import { noteService, type INote } from '../services/noteService';

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

  const updateNote = useCallback(async (id: number, title: string, content: string) => {
    const prev = notes;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title, content } : n));
    try {
      await noteService.updateNote(id, title, content);
    } catch {
      setNotes(prev);
    }
  }, [notes]);

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
