import assert from 'node:assert/strict';
import test from 'node:test';
import { referenceMusicSurface } from '../../src/features/media/referenceMusicSurface.ts';

test('classic and acrylic preserve source neutral planes without glass reflection', () => {
  const classic = referenceMusicSurface('classic', false, '#681c12');
  assert.equal(classic.top, '#1b1f25');
  assert.equal(classic.bottom, '#0c0f14');
  assert.equal(classic.alpha, 1);
  assert.equal(classic.frost, 0);
  assert.equal(classic.reflection, 0);
  assert.equal(referenceMusicSurface('frostedGlass', false, '#681c12').frost, 15 / 255);
});

test('glass retains the source reading-plane density and eight-percent reflection', () => {
  const strip = referenceMusicSurface('liquidGlass', false, '#681c12');
  assert.equal(strip.alpha, 196 / 255);
  assert.equal(strip.frost, 0);
  assert.equal(strip.reflection, 24 / 255);
  assert.equal(strip.top, '#2b3036');
  const card = referenceMusicSurface('liquidGlass', true, '#681c12');
  assert.equal(card.alpha, 224 / 255);
  assert.notEqual(card.top, strip.top);
  assert.equal(card.frost, 4 / 255);
});
