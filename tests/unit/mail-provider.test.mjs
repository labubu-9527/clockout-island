import assert from 'node:assert/strict';
import test from 'node:test';
import { mailProvider, mailSourceLabel } from '../../src/features/messages/mail/mailProvider.ts';

test('mail icons follow the receiving mailbox domain, not a sender or a partial match', () => {
  for (const email of ['a@qq.com', 'a@vip.qq.com', 'a@foxmail.com', ' A@QQ.COM ']) assert.equal(mailProvider(email), 'qq');
  for (const email of ['a@163.com', 'a@126.com', 'a@yeah.net']) assert.equal(mailProvider(email), 'netease');
  for (const email of [undefined, '', 'a@gmail.com', 'a@qq.com.example.org', 'qq.com']) assert.equal(mailProvider(email), 'generic');
});

test('mail source labels describe the provider in both languages', () => {
  assert.equal(mailSourceLabel('a@163.com', 'zh-CN'), '网易邮箱');
  assert.equal(mailSourceLabel('a@126.com', 'en'), 'NetEase Mail');
  assert.equal(mailSourceLabel('a@qq.com', 'en'), 'QQ Mail');
  assert.equal(mailSourceLabel('a@other.org', 'zh-CN'), '邮箱');
  assert.equal(mailSourceLabel(undefined, 'en'), 'Mail');
});
