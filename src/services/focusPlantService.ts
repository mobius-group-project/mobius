const API_URL = 'http://localhost:3001/api';

export interface IFocusPlant {
  id: number;
  plant_type: string;
  session_duration: number;
  planted_at: string;
}

export const focusPlantService = {
  async getPlants(): Promise<IFocusPlant[]> {
    const response = await fetch(`${API_URL}/focus-plants`);
    if (!response.ok) throw new Error('Failed to fetch plants');
    return response.json();
  },

  async plantSeed(plant_type: string, session_duration: number): Promise<IFocusPlant> {
    const response = await fetch(`${API_URL}/focus-plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plant_type, session_duration }),
    });
    if (!response.ok) throw new Error('Failed to plant seed');
    return response.json();
  },
};