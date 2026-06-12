const API_URL = 'http://localhost:3001/api';

export interface INote {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function mapNote(note: any): INote {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    updated_at: note.updated_at,
  };
}

export const noteService = {
  async getNotes(): Promise<INote[]> {
    const res = await fetch(`${API_URL}/notes`);
    if (!res.ok) throw new Error('Failed to fetch notes');
    const notes = await res.json();
    return notes.map(mapNote);
  },

  async createNote(title: string, content: string): Promise<INote> {
    const res = await fetch(`${API_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error('Failed to create note');
    return mapNote(await res.json());
  },

  async updateNote(id: number, title: string, content: string): Promise<INote> {
    const res = await fetch(`${API_URL}/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return mapNote(await res.json());
  },

  async deleteNote(id: number): Promise<void> {
    const res = await fetch(`${API_URL}/notes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete note');
  },
};
