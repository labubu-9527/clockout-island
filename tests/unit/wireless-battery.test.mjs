import test from 'node:test';
import assert from 'node:assert/strict';
import { wirelessAlerts } from '../../src/features/wireless/model.ts';

test('battery alerts cross each threshold once and rearm at 30 percent', () => {
  const levels = new Map();
  const sample = batteryPercent => wirelessAlerts([{ id: 'device', batteryPercent }], levels).length;
  assert.deepEqual([null, 20, 19, 9, 10, 24, 20, 30, 20].map(sample),
    [0, 1, 0, 1, 0, 0, 0, 0, 1]);
});
