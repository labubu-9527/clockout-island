import { useSyncExternalStore } from "react";
import { normalizeWeatherSettings, type WeatherSettings } from "./model.ts";
export const WEATHER_SETTINGS_KEY = "focusd-island-weather-settings";
export const WEATHER_CACHE_KEY = "focusd-island-weather-cache";
const CHANGE_EVENT = "focusd-weather-settings-changed";
export function readWeatherJson(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function rawSettings() {
  try { return window.localStorage.getItem(WEATHER_SETTINGS_KEY); } catch { return null; }
}
function subscribe(notify: () => void) {
  const storage = (e: StorageEvent) => { if (e.key === WEATHER_SETTINGS_KEY || e.key === null) notify(); };
  window.addEventListener("storage", storage);
  window.addEventListener(CHANGE_EVENT, notify);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(CHANGE_EVENT, notify); };
}
export function useWeatherSettings(): WeatherSettings {
  const raw = useSyncExternalStore(subscribe, rawSettings, () => null);
  try { return normalizeWeatherSettings(JSON.parse(raw ?? "null")); } catch { return normalizeWeatherSettings(null); }
}
export function saveWeatherSettings(settings: WeatherSettings): boolean {
  try {
    window.localStorage.setItem(WEATHER_SETTINGS_KEY, JSON.stringify(normalizeWeatherSettings(settings)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch { return false; }
}
export function saveWeatherCache(value: unknown) {
  try { window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(value)); } catch { /* Weather remains usable in memory. */ }
}

export const WEATHER_LOCATION_KEY = "focusd-island-weather-location";
const LOCATION_EVENT = "focusd-weather-location-changed";
export function subscribeWeatherLocation(notify: () => void) {
  const changed = (event: StorageEvent) => { if (event.key === WEATHER_LOCATION_KEY || event.key === null) notify(); };
  window.addEventListener("storage", changed);
  window.addEventListener(LOCATION_EVENT, notify);
  return () => { window.removeEventListener("storage", changed); window.removeEventListener(LOCATION_EVENT, notify); };
}
export function saveWeatherLocation(value: unknown) {
  try {
    window.localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(LOCATION_EVENT));
  } catch { /* Location remains usable in memory. */ }
}
