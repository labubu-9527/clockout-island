import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWeatherSettings, usableCache, upcomingHours, weatherKind, weatherRequestKey, activeWeatherCity, validForecast } from "../../src/features/weather/model.ts";

const city = { id: 1, name: "杭州", admin1: "浙江", country: "中国", latitude: 30.2, longitude: 120.1, timezone: "Asia/Shanghai" };
test("weather stays off until chosen and rejects invalid saved coordinates", () => {
  assert.deepEqual(normalizeWeatherSettings(null), { locationMode: "auto", enabled: false, city: null, provider: "open-meteo", qweatherHost: "", qweatherCity: null });
  assert.deepEqual(normalizeWeatherSettings({ enabled: true, city: { ...city, latitude: 100 } }), { locationMode: "auto", enabled: true, city: null, provider: "open-meteo", qweatherHost: "", qweatherCity: null });
  assert.deepEqual(normalizeWeatherSettings({ enabled: true, city }), { locationMode: "manual", enabled: true, city, provider: "open-meteo", qweatherHost: "", qweatherCity: null });
});
test("weather cache never crosses cities or accepts future timestamps and expires after 15 minutes", () => {
  const cached = { cityKey: "1:30.2:120.1", fetchedAt: 1000, forecast: { timezone: "Asia/Shanghai", current: { time: 1, temperature: 19, apparentTemperature: 18, humidity: 62, windSpeed: 5, weatherCode: 2, isDay: true }, hourly: [] } };
  assert.equal(usableCache(cached, city, 2000), true);
  assert.equal(usableCache(cached, { ...city, id: 2 }, 2000), false);
  assert.equal(usableCache(cached, city, 1000 + 900001), false);
  assert.equal(usableCache(cached, city, 999), false);
  assert.equal(usableCache({ ...cached, forecast: {} }, city, 2000), false);
});
test("hourly selection uses timestamps rather than host timezone and takes only six future hours", () => {
  const hours = Array.from({ length: 10 }, (_, i) => ({ time: 1000 + i * 3600, temperature: i, weatherCode: 0 }));
  assert.deepEqual(upcomingHours(hours, 2000).map(h => h.temperature), [1, 2, 3, 4, 5, 6]);
});
test("weather codes distinguish snow rain fog storm and unknown", () => {
  assert.equal(weatherKind(95), "storm");
  assert.equal(weatherKind(71), "snow");
  assert.equal(weatherKind(61), "rain");
  assert.equal(weatherKind(45), "fog");
  assert.equal(weatherKind(2), "cloudy");
  assert.equal(weatherKind(999), "unknown");
});

test("weather source settings preserve each provider city and reject untrusted saved hosts", () => {
  const qcity = { ...city, id: 101210101 };
  const value = normalizeWeatherSettings({ enabled: true, city, provider: "qweather", qweatherHost: "abc.qweatherapi.com", qweatherCity: qcity });
  assert.equal(value.provider, "qweather");
  assert.equal(value.qweatherCity.id, qcity.id);
  assert.equal(value.city.id, city.id);
  assert.equal(normalizeWeatherSettings({ qweatherHost: "https://evil.test" }).qweatherHost, "");
});

test("weather cache identity isolates provider host and separate selected city", () => {
  const meteo = { enabled: true, city };
  const q = { ...meteo, provider: "qweather", qweatherHost: "a.qweatherapi.com", qweatherCity: city };
  assert.notEqual(weatherRequestKey(meteo), weatherRequestKey(q));
  assert.notEqual(weatherRequestKey(q), weatherRequestKey({ ...q, qweatherHost: "b.qweatherapi.com" }));
  assert.equal(activeWeatherCity({ ...q, qweatherCity: null }), null);
});
test("daily weather rejects reversed high and low while keeping old hourly caches readable", () => {
  const forecast = { timezone: "Asia/Shanghai", current: { time: 1, temperature: 19, apparentTemperature: 18, humidity: 62, windSpeed: 5, weatherCode: 2, isDay: true }, hourly: [] };
  assert.equal(validForecast(forecast), true);
  assert.equal(validForecast({ ...forecast, daily: [{ time: 1, temperatureMax: 20, temperatureMin: 10, weatherCode: 0 }] }), true);
  assert.equal(validForecast({ ...forecast, daily: [{ time: 1, temperatureMax: 10, temperatureMin: 20, weatherCode: 0 }] }), false);
});
