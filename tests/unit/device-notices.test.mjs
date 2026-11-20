import assert from 'node:assert/strict';
import test from 'node:test';
import { changedDeviceStates, normalizeDeviceNoticeSettings, visibleDeviceNotice } from '../../src/features/device-notices/model.ts';

const state = { capsLock: false, numLock: true, microphoneMuted: false, touchpadEnabled: null };
test('first sample, unknown state and recovered devices establish a baseline without reminders', () => {
  const settings = normalizeDeviceNoticeSettings(null);
  assert.deepEqual(changedDeviceStates(null, state, settings), []);
  assert.deepEqual(changedDeviceStates(state, { ...state, touchpadEnabled: true }, settings), []);
  assert.deepEqual(changedDeviceStates(state, { ...state, capsLock: null }, settings), []);
});
test('only changed known enabled sources produce a reminder, including false', () => {
  const settings = normalizeDeviceNoticeSettings({ numLock: false });
  assert.deepEqual(changedDeviceStates(state, { ...state, capsLock: true, numLock: false, microphoneMuted: true }, settings),
    [{ kind: 'capsLock', value: true }, { kind: 'microphoneMuted', value: true }]);
  assert.deepEqual(changedDeviceStates({ ...state, microphoneMuted: true }, state, settings), [{ kind: 'microphoneMuted', value: false }]);
});
test('invalid preferences fall back safely and preserve explicit independent switches', () => {
  assert.deepEqual(normalizeDeviceNoticeSettings({ capsLock: false, numLock: 'false', microphoneMuted: 0, touchpadEnabled: true }),
    { capsLock: false, numLock: true, microphoneMuted: true, touchpadEnabled: true });
});
test('reminders expire at two seconds, respect disabled sources and never show while blocked', () => {
  const notice = { kind: 'capsLock', value: true, at: 100 };
  const settings = normalizeDeviceNoticeSettings(null);
  assert.equal(visibleDeviceNotice(notice, settings, 2099, false), notice);
  assert.equal(visibleDeviceNotice(notice, settings, 2100, false), null);
  assert.equal(visibleDeviceNotice(notice, settings, 200, true), null);
  assert.equal(visibleDeviceNotice(notice, { ...settings, capsLock: false }, 200, false), null);
});
