import test from 'node:test';
import assert from 'node:assert/strict';
import { wirelessNotice, messageNotice, advanceNoticeQueue, createNoticeQueue } from '../../src/windows/island/noticeQueue.ts';

const device = { id: 'fixture-device', name: 'Headset', kind: 'headphones', batteryPercent: 10, updatedAt: 0 };
test('low battery yields to messages and has a finite unheld display budget', () => {
  const low = wirelessNotice(device, 0);
  let state = advanceNoticeQueue(createNoticeQueue(0), { now: 0, incoming: [low] });
  assert.equal(state.active.payload.kind, 'wireless');
  state = advanceNoticeQueue(state, { now: 3000, holding: true });
  assert.equal(state.active, null);
  const message = messageNotice({ source: 'qq', title: 'chat', body: 'hi', receivedAt: 0 }, 5000, 0);
  state = advanceNoticeQueue(createNoticeQueue(0), { now: 0, incoming: [message, low] });
  assert.equal(state.active.payload.kind, 'message');
  state = advanceNoticeQueue(state, { now: 5000 });
  assert.equal(state.active.payload.kind, 'wireless');
});

test('two low devices in the same scan each receive their full display time', () => {
  const first = wirelessNotice(device, 0), second = wirelessNotice({ ...device, id: 'second' }, 0);
  let state = advanceNoticeQueue(createNoticeQueue(0), { now: 0, incoming: [first, second] });
  state = advanceNoticeQueue(state, { now: 3000 });
  assert.equal(state.active.payload.device.id, 'second');
  assert.equal(state.active.remainingMs, 3000);
});
