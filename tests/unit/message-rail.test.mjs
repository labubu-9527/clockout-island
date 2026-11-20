import test from 'node:test';
import assert from 'node:assert/strict';
import { getMessageRailItems } from '../../src/features/messages/messageRailItems.ts';

test('message rail preserves source order and pending state without showing disabled sources', () => {
  const enabled = { qq: true, wechat: true, qqMail: true, plugin: false };
  const visible = { qq: false, wechat: true, qqMail: true, plugin: true };
  assert.deepEqual(getMessageRailItems(enabled, visible, { wechat: true, qq: true }), [
    { source: 'wechat', pending: true },
  ]);
  assert.equal(enabled.qq, true);
});

test('office message sources keep independent entries and default visible for old settings', () => {
  const items = getMessageRailItems({ dingtalk: true, feishu: true, wecom: true }, {}, { feishu: true });
  assert.deepEqual(items, [
    { source: 'feishu', pending: true },
  ]);
});

test('read or missing pending state removes the notification entry without disabling its service', () => {
  assert.deepEqual(getMessageRailItems({ qq: true, wechat: true, qqMail: true }, {}, {}), []);
});
