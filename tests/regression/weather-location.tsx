import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mockIPC } from '@tauri-apps/api/mocks';
import { I18nProvider, LOCALE_STORAGE_KEY } from '../../src/i18n';
import { useWeather, type WeatherController } from '../../src/features/weather/useWeather';
import { WeatherPanel } from '../../src/features/weather/WeatherPanel';
import { WeatherBadge } from '../../src/features/weather/WeatherBadge';
import { saveWeatherSettings, saveWeatherLocation, WEATHER_SETTINGS_KEY, WEATHER_CACHE_KEY, WEATHER_LOCATION_KEY } from '../../src/features/weather/storage';
import type { WeatherCity, WeatherForecast } from '../../src/features/weather/api';
import '../../src/styles/tokens.css';
import '../../src/styles/base.css';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const params = new URLSearchParams(location.search);
const preview = params.has('preview');
document.documentElement.dataset.theme = params.get('theme') ?? 'dark';
localStorage.setItem(LOCALE_STORAGE_KEY, params.get('lang') ?? 'en');
const city: WeatherCity = { id: 1, name: 'Hangzhou', admin1: 'Zhejiang', country: 'China', latitude: 30, longitude: 120, timezone: 'UTC' };
const manual = { ...city, id: 2, name: 'Shanghai', latitude: 31 };
let now = Date.now();
const realNow = Date.now;
Date.now = () => now;
const forecast: WeatherForecast = { timezone: 'Asia/Shanghai', current: { time: now / 1000, temperature: 23, apparentTemperature: 25, humidity: 61, windSpeed: 8, weatherCode: 0, isDay: true },
  hourly: Array.from({ length: 8 }, (_, i) => ({ time: now / 1000 + i * 3600, temperature: 22 + i, weatherCode: i % 3 })),
  daily: Array.from({ length: 7 }, (_, i) => ({ time: now / 1000 + i * 86400, temperatureMax: [25, 28, 26, 30, 29, 24, 26][i], temperatureMin: [18, 20, 19, 22, 21, 18, 19][i], weatherCode: i % 4, sunrise: Date.UTC(2026, 10, 19, 22, 30) / 1000, sunset: Date.UTC(2026, 10, 20, 9, 30) / 1000 })) };
let locations = 0, forecasts = 0, failLocation = false;
let deferred: ((city: WeatherCity) => void) | null = null;
let defer = false;
mockIPC(command => {
  if (command === 'locate_weather_city') { locations++; if (defer) return new Promise<WeatherCity>(resolve => { deferred = resolve; }); if (failLocation) throw new Error('Location unavailable'); return city; }
  if (command === 'get_weather_forecast' || command === 'get_qweather_forecast') { forecasts++; return forecast; }
  return null;
});
const root = createRoot(document.getElementById('root')!);
let controller: WeatherController;
let other: WeatherController;
function Harness() { controller = useWeather(); return <><WeatherBadge weather={controller} onOpen={() => {}} /><WeatherPanel weather={controller} /></>; }
function Probe() { other = useWeather(); return null; }
const checks: string[] = [];
const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); checks.push(`PASS ${label}`); };
const wait = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
const configure = (settings: Parameters<typeof saveWeatherSettings>[0]) => act(async () => { saveWeatherSettings(settings); });
const original = new Map([WEATHER_SETTINGS_KEY, WEATHER_CACHE_KEY, WEATHER_LOCATION_KEY, LOCALE_STORAGE_KEY].map(key => [key, localStorage.getItem(key)]));
if (preview) {
  const sample: WeatherController = { settings: { enabled: true, city, locationMode: 'manual' }, city, forecast, fetchedAt: now, key: 'preview', loading: false, failed: false, locating: false, locationFailed: false, refresh: () => {} };
  root.render(<I18nProvider><div style={{ width: 520, height: 350, background: params.get('theme') === 'light' ? '#f4f4f5' : '#16171b', borderRadius: 24, padding: 12 }}><WeatherPanel weather={sample} /></div></I18nProvider>);
} else void (async () => {
try {
  for (const key of [WEATHER_SETTINGS_KEY, WEATHER_CACHE_KEY, WEATHER_LOCATION_KEY]) localStorage.removeItem(key);
  await act(async () => root.render(<I18nProvider><div style={{ width: 520, height: 320 }}><Harness /></div></I18nProvider>));
  check(locations === 0, 'disabled module never locates');
  await configure({ enabled: true, city: null, locationMode: 'auto' }); await wait();
  check(locations === 1 && forecasts === 1 && controller!.city?.name === 'Hangzhou', 'automatic location drives forecast and badge');
  check(document.querySelector('.weather-badge')?.textContent?.includes('Hangzhou'), 'automatic location is shared with badge');
  check(document.querySelectorAll('.weather-seven__labels > div').length === 7 && document.querySelectorAll('.weather-seven__curves path').length === 2, 'seven daily columns and high low curves render');
  const panel = document.querySelector<HTMLElement>('.weather-panel')!;
  const footer = document.querySelector('footer')!.getBoundingClientRect();
  check(panel.scrollHeight <= panel.clientHeight + 1 && footer.bottom <= panel.getBoundingClientRect().bottom, `ordinary weather card fully shows footer without scrolling ${panel.scrollHeight}/${panel.clientHeight} footer${footer.bottom}/${panel.getBoundingClientRect().bottom}`);
  check(!document.querySelector('.weather-card__metrics')?.textContent?.includes('--'), 'sunrise sunset supplied by forecast render');
  check(document.querySelector('.weather-card__metrics')?.textContent?.includes('06:30 / 17:30'), 'forecast timezone takes priority over automatic location UTC fallback');
  await configure({ enabled: false, city: null, locationMode: 'auto' });
  await configure({ enabled: true, city: null, locationMode: 'auto' }); await wait();
  check(locations === 1 && forecasts === 1, 'fresh location and forecast caches avoid duplicate requests after reenable');
  await act(async () => document.querySelector<HTMLButtonElement>('.weather-card__tabs button:last-child')!.click());
  check(document.querySelectorAll('.weather-hours > div').length === 6, 'hourly switch shows six upcoming hours');
  now += 11000; failLocation = true;
  await act(async () => controller!.refresh()); await wait();
  check(locations === 2 && controller!.locationFailed && controller!.city?.name === 'Hangzhou' && Boolean(controller!.forecast), 'failed forced location preserves previous automatic city and forecast');
  check(JSON.parse(localStorage.getItem(WEATHER_SETTINGS_KEY)!).city === null, 'automatic city never overwrites manual settings');
  await configure({ enabled: true, city: manual, locationMode: 'manual' }); await wait();
  check(controller!.city?.name === 'Shanghai' && locations === 2, 'manual selection uses saved city without location request');
  now += 11000; failLocation = false; defer = true;
  localStorage.removeItem(WEATHER_LOCATION_KEY);
  await configure({ enabled: true, city: manual, locationMode: 'auto' }); await wait();
  await configure({ enabled: true, city: manual, locationMode: 'manual' });
  await act(async () => { (deferred as ((city: WeatherCity) => void) | null)?.(city); });
  check(controller!.city?.name === 'Shanghai', 'late location response cannot overwrite manual selection');
  await act(async () => { saveWeatherLocation({ city, language: 'en', locatedAt: now }); });
  await configure({ enabled: true, city: manual, locationMode: 'auto' });
  await act(async () => root.render(<I18nProvider><div style={{ width: 520, height: 320 }}><Harness /></div><Probe /></I18nProvider>)); await wait();
  now += 11000;
  await act(async () => controller!.refresh()); await wait();
  const sharedCity = { ...city, name: 'Ningbo', latitude: 29.9 };
  await act(async () => { saveWeatherLocation({ city: sharedCity, language: 'en', locatedAt: now }); });
  await act(async () => { (deferred as ((city: WeatherCity) => void) | null)?.(city); });
  check(controller!.city?.name === 'Ningbo' && other!.city?.name === 'Ningbo', 'same-window location broadcasts synchronize both owners and supersede older requests');
  await act(async () => {
    localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify({ city: { ...sharedCity, name: 'Wenzhou' }, language: 'en', locatedAt: now }));
    window.dispatchEvent(new StorageEvent('storage', { key: WEATHER_LOCATION_KEY }));
  });
  check(controller!.city?.name === 'Wenzhou' && other!.city?.name === 'Wenzhou' && JSON.parse(localStorage.getItem(WEATHER_SETTINGS_KEY)!).city.name === 'Shanghai', 'cross-window location broadcasts update automatic owners without modifying manual city');
  check(document.querySelector('.weather-panel')!.scrollWidth <= document.querySelector('.weather-panel')!.clientWidth + 1, 'compact card avoids horizontal overflow');
  document.documentElement.dataset.testResult = 'passed';
} catch (error) { checks.push(`FAIL ${String(error)}`); document.documentElement.dataset.testResult = 'failed'; }
finally {
  await act(async () => root.unmount()); Date.now = realNow;
  for (const [key, value] of original) if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  document.getElementById('results')!.textContent = checks.join('\n');
}
})();
