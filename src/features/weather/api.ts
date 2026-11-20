import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
// Mirrors WeatherCity / WeatherHour / WeatherDay / WeatherForecast in src-tauri/src/weather/mod.rs.
export type WeatherCity = { id: number; name: string; admin1: string; country: string; latitude: number; longitude: number; timezone: string };
export type WeatherHour = { time: number; temperature: number; weatherCode: number };
export type WeatherDay = { time: number; temperatureMax: number; temperatureMin: number; weatherCode: number; sunrise?: number; sunset?: number };
export type WeatherForecast = { timezone: string; current: WeatherHour & { apparentTemperature: number; humidity: number; windSpeed: number; isDay: boolean }; hourly: WeatherHour[]; daily?: WeatherDay[] };
export const searchWeatherCities = (query: string, language: string) => invoke<WeatherCity[]>("search_weather_cities", { query, language });
export const getWeatherForecast = (city: WeatherCity) => invoke<WeatherForecast>("get_weather_forecast", { latitude: city.latitude, longitude: city.longitude });

export const searchQweatherCities = (query: string, language: string, host: string) => invoke<WeatherCity[]>("search_qweather_cities", { query, language, host });
export const getQweatherForecast = (city: WeatherCity, host: string) => invoke<WeatherForecast>("get_qweather_forecast", { latitude: city.latitude, longitude: city.longitude, host });
export const hasWeatherSecret = () => invoke<boolean>("has_weather_secret");
export const saveWeatherSecret = (secret: string) => invoke<void>("save_weather_secret", { secret });
export const testQweatherConnection = (host: string, secret?: string) => invoke<void>("test_qweather_connection", { host, secret: secret || null });

export const requestOpenWeather = () => invoke<void>("open_weather_page");
export const listenWeatherOpen = (handler: () => void) => listen("weather-open-requested", handler);

export const locateWeatherCity = (language: string) => invoke<WeatherCity>("locate_weather_city", { language });
