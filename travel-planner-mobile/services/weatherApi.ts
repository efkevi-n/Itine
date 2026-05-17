import { api } from '@/api/client';

export interface WeatherSnapshot {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
  icon: string;
}

export const weatherApi = {
  getByCity: (city: string) =>
    api.get<WeatherSnapshot>('/weather', { params: { city } }),
};
