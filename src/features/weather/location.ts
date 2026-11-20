import { validCity } from './model.ts';
import type { WeatherCity } from './api';
export const LOCATION_TTL = 3 * 60 * 60 * 1000;
export type LocationCache = { city: WeatherCity; language: string; locatedAt: number };
export function validLocationCache(value: unknown, language: string, now = Date.now()): value is LocationCache {
  if (typeof value !== 'object' || value === null) return false;
  const cache = value as Partial<LocationCache>;
  return validCity(cache.city) && cache.city.id > 0 && Boolean(cache.city.name.trim()) && Boolean(cache.city.country.trim())
    && Boolean(cache.city.timezone.trim()) && cache.language === language && typeof cache.locatedAt === 'number'
    && Number.isFinite(cache.locatedAt) && cache.locatedAt >= 0 && cache.locatedAt <= now && now - cache.locatedAt < LOCATION_TTL;
}
