import assert from 'node:assert/strict';
import test from 'node:test';
import { MUSIC_LAYOUTS, normalizeMusicLayout, musicLayoutMetrics } from '../../src/features/media/musicLayouts.ts';
import { normalizeSettings } from '../../src/features/appearance/settings.ts';

test('five source layouts load without changing the old default', () => {
  assert.equal(MUSIC_LAYOUTS.length, 5);
  assert.equal(normalizeMusicLayout('broken'), 'SideBySide');
  assert.equal(normalizeSettings({}).musicLayout, 'SideBySide');
  for (const layout of MUSIC_LAYOUTS) assert.equal(normalizeSettings({ musicLayout: layout }).musicLayout, layout);
});

test('native layout metrics keep artwork sizes and progressive height', () => {
  const side = musicLayoutMetrics('SideBySide');
  assert.equal(side.coverSize, 68);
  assert.equal(side.extraHeight, 0);
  assert.equal(musicLayoutMetrics('Separated').coverSize, 56);
  assert.equal(musicLayoutMetrics('LyricRight').coverSize, 68);
  assert.equal(musicLayoutMetrics('Immersive').coverSize, 0);
  for (const layout of MUSIC_LAYOUTS.slice(1)) {
    const metrics = musicLayoutMetrics(layout);
    assert.equal(metrics.extraHeight, 16);
    assert.ok(metrics.lyricTop < metrics.progressTop);
    assert.ok(metrics.progressTop + 18 < metrics.controlsTop);
  }
});
