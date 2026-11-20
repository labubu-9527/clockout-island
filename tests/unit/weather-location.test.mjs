import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeatherSettings } from '../../src/features/weather/model.ts';
import { validLocationCache, LOCATION_TTL } from '../../src/features/weather/location.ts';
const city = { id: 1, name: 'Hangzhou', admin1: '', country: 'CN', latitude: 30, longitude: 120, timezone: 'Asia/Shanghai' };
test('location mode migrates existing cities but respects explicit automatic mode', () => {
  assert.equal(normalizeWeatherSettings({ city }).locationMode, 'manual');
  assert.equal(normalizeWeatherSettings({ qweatherCity: city }).locationMode, 'manual');
  assert.equal(normalizeWeatherSettings(null).locationMode, 'auto');
  assert.equal(normalizeWeatherSettings({ city, locationMode: 'auto' }).locationMode, 'auto');
});
test('location cache isolates language and rejects expired future and malformed locations', () => {
  const cache = { city, language: 'en', locatedAt: 1000 };
  assert.equal(validLocationCache(cache, 'en', 1001), true);
  assert.equal(validLocationCache(cache, 'zh', 1001), false);
  assert.equal(validLocationCache(cache, 'en', 999), false);
  assert.equal(validLocationCache(cache, 'en', 1000 + LOCATION_TTL), false);
  assert.equal(validLocationCache({ ...cache, city: { ...city, latitude: 91 } }, 'en', 1001), false);
  for (const invalid of [{ id: 0 }, { id: -1 }, { name: '  ' }, { country: '' }, { timezone: '' }]) {
    assert.equal(validLocationCache({ ...cache, city: { ...city, ...invalid } }, 'en', 1001), false);
  }
  assert.equal(validLocationCache({ ...cache, locatedAt: -1 }, 'en', 1001), false);
});
