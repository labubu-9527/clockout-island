import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQuickReminder } from '../../src/features/todos/quickReminder.ts';
import { dueReminderIds, reminderFields } from '../../src/features/todos/reminders.ts';
import { splitDueTodos, toTodoItems, normalizeScheduledTodo } from '../../src/features/todos/schedule.ts';
import { normalizeTodo, parseTodoArchives, parseTodos, parseScheduledTodos } from '../../src/features/todos/normalize.ts';
const now = new Date(2026, 11, 31, 23, 30).getTime();
test('relative reminders cross year and accept equivalent English grammar', () => {
  for (const input of ['2小时后备份', 'in 2 hours 备份']) {
    assert.deepEqual(parseQuickReminder(input, now), { kind: 'reminder', title: '备份', remindAt: now + 7200000 });
  }
  assert.equal(parseQuickReminder('10080分钟后上限', now).remindAt, now + 7 * 86400000);
});
test('local calendar dates include leap days and reject invalid or past times', () => {
  const leap = new Date(2028, 1, 28, 22).getTime();
  assert.equal(parseQuickReminder('明天9:00交稿', leap).remindAt, new Date(2028, 1, 29, 9).getTime());
  assert.equal(parseQuickReminder('tomorrow 9:00 submit', leap).title, 'submit');
  assert.equal(parseQuickReminder('2028-02-29 9:00 submit', leap).kind, 'reminder');
  for (const [input, error] of [['2026-02-29 9:00 x','invalid_date'],['今天23:00 x','past_time'],['今天24:00 x','invalid_time'],['0分钟后x','out_of_range'],['169小时后x','out_of_range'],['20分钟后','empty_title'],['5分钟后' + '字'.repeat(121),'too_long']]) {
    assert.deepEqual(parseQuickReminder(input, now), { kind: 'error', error });
  }
});
test('ordinary tasks with day words or embedded numbers remain ordinary', () => {
  for (const input of ['今天整理文档','明天的会议准备','today review notes','tomorrow planning','写20分钟后的方案','2026-11-21 release notes']) {
    assert.deepEqual(parseQuickReminder(input, now), { kind: 'task' });
  }
});
test('reminder fields survive normalization, scheduled arrival and restart', () => {
  const item = {id:'a', title:'x', completed:false, createdAt:1, remindAt:now, reminded:true};
  assert.deepEqual(normalizeTodo(item), item);
  assert.deepEqual(parseTodos(JSON.stringify([item]))[0], item);
  assert.deepEqual(parseTodoArchives(JSON.stringify([{ date: "2026-12-31", todos: [item] }]))[0].todos[0], item);
  const scheduled = normalizeScheduledTodo({...item, date:'2026-12-31'});
  assert.equal(scheduled.remindAt, now);
  assert.deepEqual(parseScheduledTodos(JSON.stringify([scheduled]))[0], scheduled);
  assert.equal(toTodoItems([scheduled])[0].reminded, true);
  assert.deepEqual(reminderFields({remindAt:NaN, reminded:true}), {});
  assert.deepEqual(reminderFields({remindAt:-1}), {});
});
test('scheduled reminder waits for its time; overdue reminders arrive after restart', () => {
  const item = {id:'a',title:'x',date:'2026-12-31',createdAt:1,remindAt:now};
  assert.equal(splitDueTodos([item], '2026-12-31', now - 1).due.length, 0);
  assert.equal(splitDueTodos([item], '2026-12-31', now).due.length, 1);
  assert.equal(splitDueTodos([item], '2027-01-01', now + 86400000).due.length, 1);
});
test('clock advances trigger each outstanding reminder only once; completed or deleted cancel', () => {
  const items = [{id:'a',remindAt:now}, {id:'b',remindAt:now,completed:true}, {id:'c',remindAt:now,reminded:true}, {id:'d',remindAt:now+1}];
  assert.deepEqual(dueReminderIds(items, now-1), []);
  assert.deepEqual(dueReminderIds(items, now), ['a']);
  assert.deepEqual(dueReminderIds(items.filter(x=>x.id!=='a'), now), []);
  assert.deepEqual(dueReminderIds(items.map(x=>({...x,reminded:true})), now+2), []);
});

test('DST uses local calendar for tomorrow and elapsed minutes for relative time', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const before = new Date(2027, 2, 13, 12).getTime();
    assert.equal(parseQuickReminder('tomorrow 12:00 lunch', before).remindAt, new Date(2027, 2, 14, 12).getTime());
    assert.equal(parseQuickReminder('tomorrow 2:30 skipped', before).error, 'invalid_time');
    const spring = new Date(2027, 2, 14, 1, 30).getTime();
    assert.equal(parseQuickReminder('in 1 hour walk', spring).remindAt, new Date(2027, 2, 14, 3, 30).getTime());
    assert.equal(parseQuickReminder('2027-11-07 1:30 overlap', before).remindAt, new Date(2027, 10, 7, 1, 30).getTime());
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});


test('absolute scheduled reminders keep their instant after a westward timezone change', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Shanghai';
    const deadline = new Date(2027, 0, 2, 9).getTime();
    const scheduled = { id: 'zone', title: 'travel', date: '2027-01-02', createdAt: 1, remindAt: deadline };
    process.env.TZ = 'America/Los_Angeles';
    const date = new Date(deadline);
    const today = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    assert.equal(today, '2027-01-01');
    assert.equal(splitDueTodos([scheduled], today, deadline - 1).due.length, 0);
    assert.equal(splitDueTodos([scheduled], today, deadline).due.length, 1);
    assert.equal(splitDueTodos([{ ...scheduled, remindAt: undefined }], today, deadline).due.length, 0);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
