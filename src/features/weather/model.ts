import type { WeatherCity, WeatherForecast, WeatherHour } from "./api";
export const WEATHER_TTL = 15 * 60 * 1000;
export type WeatherSettings = { enabled: boolean; locationMode?: "auto" | "manual"; city: WeatherCity | null; provider?: "open-meteo" | "qweather"; qweatherHost?: string; qweatherCity?: WeatherCity | null };
export type WeatherCache = { cityKey: string; fetchedAt: number; forecast: WeatherForecast };
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export function validCity(value: unknown): value is WeatherCity {
  if (!record(value)) return false;
  return finite(value.id) && ["name", "admin1", "country", "timezone"].every(k => typeof value[k] === "string")
    && String(value.name).length > 0 && String(value.name).length <= 150
    && finite(value.latitude) && Math.abs(value.latitude) <= 90 && finite(value.longitude) && Math.abs(value.longitude) <= 180;
}
export function normalizeWeatherSettings(value: unknown): WeatherSettings {
  const data = record(value) ? value : {};
  return { locationMode: data.locationMode === "auto" || data.locationMode === "manual" ? data.locationMode : validCity(data.city) || validCity(data.qweatherCity) ? "manual" : "auto", enabled: data.enabled === true, city: validCity(data.city) ? data.city : null,
    provider: data.provider === "qweather" ? "qweather" : "open-meteo",
    qweatherHost: normalizeQweatherHost(data.qweatherHost), qweatherCity: validCity(data.qweatherCity) ? data.qweatherCity : null };
}
export function normalizeQweatherHost(value: unknown): string {
  if (typeof value !== "string") return "";
  const host = value.trim().replace(/^https:\/\//i, "").replace(/\/$/, "").toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.qweatherapi\.com$/.test(host) ? host : "";
}
export const activeWeatherCity = (settings: WeatherSettings) => settings.provider === "qweather" ? settings.qweatherCity ?? null : settings.city;
export const weatherRequestKey = (settings: WeatherSettings, city = activeWeatherCity(settings)) => {
  return city ? settings.provider === "qweather" ? `qweather:${settings.qweatherHost ?? ""}:${cityKey(city)}` : cityKey(city) : "";
}
export const cityKey = (city: WeatherCity) => `${city.id}:${city.latitude}:${city.longitude}`;
function validHour(value: unknown): value is WeatherHour {
  return record(value) && finite(value.time) && finite(value.temperature) && finite(value.weatherCode);
}
export function validForecast(value: unknown): value is WeatherForecast {
  if (!record(value) || !record(value.current)) return false;
  const c = value.current;
  const extra = value.current;
  return typeof value.timezone === "string" && validHour(c) && finite(extra.apparentTemperature)
    && finite(extra.humidity) && extra.humidity >= 0 && extra.humidity <= 100 && finite(extra.windSpeed) && extra.windSpeed >= 0
    && typeof extra.isDay === "boolean" && Array.isArray(value.hourly) && value.hourly.length <= 400 && value.hourly.every(validHour)
    && (value.daily === undefined || (Array.isArray(value.daily) && value.daily.length <= 7 && value.daily.every(day => record(day) && finite(day.time) && finite(day.temperatureMax) && finite(day.temperatureMin) && day.temperatureMax >= day.temperatureMin && finite(day.weatherCode) && (day.sunrise === undefined || finite(day.sunrise)) && (day.sunset === undefined || finite(day.sunset)))));
}
export function validCache(value: unknown, city: WeatherCity, key = cityKey(city)): value is WeatherCache {
  return record(value) && value.cityKey === key && finite(value.fetchedAt) && validForecast(value.forecast);
}
export function usableCache(value: unknown, city: WeatherCity, now = Date.now(), key = cityKey(city)): value is WeatherCache {
  return validCache(value, city, key) && now >= value.fetchedAt && now - value.fetchedAt < WEATHER_TTL;
}
export const upcomingHours = (hours: WeatherHour[], nowSeconds: number) => hours.filter(h => h.time >= nowSeconds).slice(0, 6);
export function weatherKind(code: number): "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm" | "unknown" {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";
  return "unknown";
}
