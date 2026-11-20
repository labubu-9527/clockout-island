import assert from 'node:assert/strict';
import test from 'node:test';
import { referenceCoverPalette } from '../../src/features/media/referenceCoverPalette.ts';
import { musicCapsuleSettings } from '../../src/windows/island/musicCapsule.ts';
import { capsuleGroupMetrics, compactSecondary } from '../../src/features/media/compactLyrics.ts';
import { DEFAULT_SETTINGS } from '../../src/features/appearance/settings.ts';

test('DotIsle source line metrics and Chinese/translation policy are preserved', () => {
  assert.deepEqual(capsuleGroupMetrics(14, 1), { primary: 20, secondary: 16, height: 43 });
  assert.equal(compactSecondary('晚风轻轻', '', '音乐刚好'), '音乐刚好');
  assert.equal(compactSecondary('You', '你', 'Next'), '你');
  assert.equal(compactSecondary('You', '', 'Next'), '');
  assert.equal(compactSecondary('你', '你', '下一句'), '下一句');
});
test('music capsule geometry uses round ends in CSS and native settings without persisting changes', () => {
  const original = { ...DEFAULT_SETTINGS, collapsedHeight: 38, pillCornerRadius: 8 };
  const rendered = musicCapsuleSettings(original, true);
  assert.equal(rendered.islandShape, 'pill');
  assert.equal(rendered.islandCornerShape, 'round');
  assert.equal(rendered.collapsedHeight, 43);
  assert.equal(rendered.pillCornerRadius, null);
  assert.equal(original.collapsedHeight, 38);
  assert.equal(musicCapsuleSettings(original, false), original);
});
test('reference cover algorithm keeps white and missing art neutral and preserves muted colors', () => {
  const neutral = referenceCoverPalette([]);
  assert.equal(neutral.background, '#1b1f25');
  assert.deepEqual(referenceCoverPalette([255,255,255,255].flatMap(x=>Array(1).fill(x))), neutral);
  const red = referenceCoverPalette(Array(40).fill([240,20,10,255]).flat());
  assert.notEqual(red.background, neutral.background);
  assert.ok(parseInt(red.background.slice(1,3),16)>parseInt(red.background.slice(5,7),16));
});
