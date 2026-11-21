import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveIslandPage, isPageEnabled } from '../../src/windows/island/features.ts';
import { COLLAPSED_SLOTS, PAGE_DOTS } from '../../src/features/appearance/settingsLimits.ts';
import { normalizeVisibilitySettings } from '../../src/features/appearance/visibilitySettings.ts';

test('wireless is reachable as the only enabled feature and disabled pages fall back', () => {
  const features = { todo: false, music: false, clipboard: false, shelf: false, qq: false,
    wechat: false, qqMail: false, agents: false, translation: false, wireless: true };
  assert.equal(resolveIslandPage('music', features), 'wireless');
  assert.equal(isPageEnabled('wireless', { ...features, wireless: false }), false);
});

test('legacy island layouts gain a wireless slot with independent display preference', () => {
  assert.ok(COLLAPSED_SLOTS.includes('wireless'));
  assert.ok(PAGE_DOTS.includes('wireless'));
  assert.equal(normalizeVisibilitySettings({}).collapsedSlotVisibility.wireless, true);
  assert.equal(normalizeVisibilitySettings({ collapsedSlotVisibility: { wireless: false } }).collapsedSlotVisibility.wireless, false);
});
