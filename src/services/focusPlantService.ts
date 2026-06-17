import { getDb } from './db';

export interface IFocusPlant {
  id: number;
  plant_type: string;
  session_duration: number;
  planted_at: string;
}

export const focusPlantService = {
  async getPlants(): Promise<IFocusPlant[]> {
    const db = await getDb();
    return db.select<IFocusPlant[]>('SELECT * FROM focus_plants ORDER BY planted_at DESC');
  },

  async plantSeed(plant_type: string, session_duration: number): Promise<IFocusPlant> {
    const db = await getDb();
    const result = await db.execute(
      'INSERT INTO focus_plants (plant_type, session_duration) VALUES (?, ?)',
      [plant_type, session_duration]
    );
    const rows = await db.select<IFocusPlant[]>('SELECT * FROM focus_plants WHERE id = ?', [result.lastInsertId]);
    return rows[0];
  },
};
