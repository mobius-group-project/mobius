/**
 * CRUD service for focus_plants.
 * A plant is created when a focus session completes and is displayed in the garden on the /focus page.
 */
import { getDb } from './db';

/**
 * A row from the focus_plants table.
 * `plant_type` matches a key in the PLANTS record in FocusTimer.tsx.
 * `session_duration` is stored in seconds and shown in the plant's info popup.
 */
export interface IFocusPlant {
  id: number;
  plant_type: string;
  session_duration: number;
  planted_at: string;
}

export const focusPlantService = {
  /** Returns all plants ordered by most recently planted. */
  async getPlants(): Promise<IFocusPlant[]> {
    const db = await getDb();
    return db.select<IFocusPlant[]>('SELECT * FROM focus_plants ORDER BY planted_at DESC');
  },

  /** Inserts a new plant record and returns the created row. */
  async plantSeed(plant_type: string, session_duration: number): Promise<IFocusPlant> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO focus_plants (plant_type, session_duration) VALUES (?, ?)',
      [plant_type, session_duration]
    );
    const rows = await db.select<IFocusPlant[]>('SELECT * FROM focus_plants WHERE id = ?', [result.lastInsertId]);
    return rows[0];
  },

  /** Permanently removes a plant from the garden. */
  async deletePlant(id: number): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM focus_plants WHERE id = ?', [id]);
  },
};
