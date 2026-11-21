import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMusicCustomLayout } from '../../src/features/appearance/musicCustomLayout.ts';
import { musicModuleGeometry } from '../../src/features/media/musicModuleGeometry.ts';

const options = { fontScale: 1.5, hasLyrics: true, hasProgress: true };
test('legacy stack omits placements and invalid entries cannot mask valid elements', () => {
  assert.equal(normalizeMusicCustomLayout({}).elements, undefined);
  const layout = normalizeMusicCustomLayout({ elements: [
    { element: 'title', x: NaN, y: 8 }, { element: 'typo', x: 10, y: 20 },
    { element: 'title', x: 900, y: -3, width: 280 }, { element: 'title', x: 0, y: 0 },
    { element: 'play', x: -3, y: 900, width: 15 },
  ] });
  assert.deepEqual(layout.elements, [
    { element: 'title', x: 120, y: 0, width: 280 }, { element: 'play', x: 0, y: 600 },
  ]);
});
test('lowest visible element determines height and hidden rows have no targets', () => {
  const layout = normalizeMusicCustomLayout({ elements: [{element:'progress', x: 10, y: 500, width: 250}] });
  const drawn = musicModuleGeometry(layout, options);
  assert.deepEqual(drawn.elements.find(r => r.element === 'progress'), {element:'progress', x:10, y:500, width:250, height:46});
  assert.ok(drawn.height >= 546);
  layout.modules.find(s => s.kind === 'progress').visible = false;
  const hidden = musicModuleGeometry(layout, options);
  assert.ok(!hidden.elements.some(r => r.element === 'progress'));
  assert.ok(hidden.height < 500);
});
