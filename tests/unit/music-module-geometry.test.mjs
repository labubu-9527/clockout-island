import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultMusicCustomLayout } from '../../src/features/appearance/musicCustomLayout.ts';
import { musicModuleGeometry } from '../../src/features/media/musicModuleGeometry.ts';

test('source modules stack without gaps for absent content and hidden modules', () => {
  const config = { ...defaultMusicCustomLayout(), enabled: true };
  const full = musicModuleGeometry(config, { fontScale: 1, hasLyrics: true, hasProgress: true });
  const empty = musicModuleGeometry(config, { fontScale: 1, hasLyrics: false, hasProgress: false });
  assert.deepEqual(empty.modules.map(item => item.kind), ['header', 'status', 'controls']);
  assert.ok(empty.height < full.height);
  for (let i = 1; i < full.modules.length; i++)
    assert.equal(full.modules[i].top - (full.modules[i - 1].top + full.modules[i - 1].height), 8);
});

test('cover removal and font growth change the same height used by the renderer', () => {
  const config = { ...defaultMusicCustomLayout(), enabled: true };
  const options = { fontScale: 1, hasLyrics: true, hasProgress: true };
  assert.ok(musicModuleGeometry({ ...config, showCover: false }, options).height < musicModuleGeometry(config, options).height);
  assert.ok(musicModuleGeometry(config, { ...options, fontScale: 1.5 }).height > musicModuleGeometry(config, options).height);
  const reversed = musicModuleGeometry({ ...config, modules: [...config.modules].reverse() }, options);
  assert.equal(reversed.modules[0].kind, 'controls');
  assert.ok(reversed.modules.every(module => module.top + module.height <= reversed.height));
  const minimal = musicModuleGeometry({ ...config, showCover: false,
    modules: config.modules.map(slot => ({ ...slot, visible: slot.kind === 'header' || slot.kind === 'controls' })) }, options);
  assert.equal(minimal.height + 86, 220, 'minimal custom content agrees with the native expanded-height floor');
});
