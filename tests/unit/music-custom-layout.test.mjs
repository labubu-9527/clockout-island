import assert from 'node:assert/strict';
import test from 'node:test';
import { MUSIC_MODULES, defaultMusicCustomLayout, normalizeMusicCustomLayout, moveMusicModule } from '../../src/features/appearance/musicCustomLayout.ts';
import { normalizeSettings } from '../../src/features/appearance/settings.ts';

test('old settings retain presets and independent configuration objects', () => {
  const a = normalizeSettings({});
  const b = normalizeSettings({});
  assert.equal(a.musicCustomLayout.enabled, false);
  assert.deepEqual(a.musicCustomLayout.modules.map(slot => slot.kind), MUSIC_MODULES);
  assert.notEqual(a.musicCustomLayout.modules, b.musicCustomLayout.modules);
});

test('source mandatory modules remain usable while malformed records are repaired', () => {
  const loaded = normalizeMusicCustomLayout({ version: 1, enabled: true, showCover: false,
    modules: [{ kind: 'controls', visible: false }, { kind: 'lyrics', visible: false }, { kind: 'header', visible: false },
      { kind: 'lyrics', visible: true }, { kind: 'unknown', visible: true }, null] });
  assert.equal(loaded.enabled, true);
  assert.equal(loaded.showCover, false);
  assert.deepEqual(loaded.modules.slice(0, 3), [{ kind: 'controls', visible: true }, { kind: 'lyrics', visible: false }, { kind: 'header', visible: true }]);
  assert.equal(loaded.modules.length, 6);
  for (const invalid of [null, [], { version: 9, enabled: true }])
    assert.deepEqual(normalizeMusicCustomLayout(invalid), defaultMusicCustomLayout());
});

test('reordering preserves switches and never changes the source array', () => {
  const original = defaultMusicCustomLayout();
  const changed = moveMusicModule(original, 'controls', -1);
  assert.equal(changed.modules[4].kind, 'controls');
  assert.equal(original.modules[5].kind, 'controls');
  assert.deepEqual(moveMusicModule(original, 'header', -1), original);
});
