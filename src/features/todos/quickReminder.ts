import { isDateString } from "./schedule.ts";
export type ReminderError = "invalid_date" | "invalid_time" | "past_time" | "out_of_range" | "empty_title" | "too_long" | "invalid_characters";
export type QuickReminder = { kind: "task" } | { kind: "error"; error: ReminderError } | { kind: "reminder"; title: string; remindAt: number };
const fail = (error: ReminderError): QuickReminder => ({ kind: "error", error });

/** Explicit prefix grammar adapted from DotIsle quick_reminder.rs (d09a751, MIT).
 * Day words without a numeric clock stay ordinary task text rather than being guessed.
 */
export function parseQuickReminder(input: string, now = Date.now()): QuickReminder {
  const text = input.trim();
  const relative = /^(\d+)\s*(分钟后|小时后)\s*(.*)$/u.exec(text)
    ?? /^in\s+(\d+)\s+(minutes?|hours?)\b\s*(.*)$/iu.exec(text);
  const day = /^(今天|明天)\s*(?=\d)(.*)$/u.exec(text)
    ?? /^(today|tomorrow)\s+(?=\d)(.*)$/iu.exec(text);
  const absolute = /^(\d{4}-\d{2}-\d{2})\s+(?=\d)(.*)$/u.exec(text);
  if (!relative && !day && !absolute) return { kind: "task" };
  if ([...text].length > 512) return fail("too_long");
  if (/[\u0000-\u001f\u007f]/u.test(text)) return fail("invalid_characters");
  let title: string;
  let remindAt: number;
  if (relative) {
    const amount = Number(relative[1]);
    const minutes = amount * (/小时|hour/iu.test(relative[2]) ? 60 : 1);
    if (!Number.isSafeInteger(amount) || minutes <= 0 || minutes > 10080) return fail("out_of_range");
    remindAt = now + minutes * 60000;
    title = relative[3].trim();
  } else {
    const match = day ?? absolute!;
    const clock = /^(\d{1,2}):(\d{2})(?!\d)(.*)$/u.exec(match[2]);
    if (!clock || Number(clock[1]) > 23 || Number(clock[2]) > 59) return fail("invalid_time");
    let date: Date;
    if (absolute) {
      if (!isDateString(absolute[1])) return fail("invalid_date");
      date = new Date(`${absolute[1]}T00:00:00`);
    } else {
      date = new Date(now);
      if (/明天|tomorrow/iu.test(match[1])) date.setDate(date.getDate() + 1);
    }
    const dayOfMonth = date.getDate();
    date.setHours(Number(clock[1]), Number(clock[2]), 0, 0);
    // Reject local times skipped by daylight saving rather than silently shifting them.
    if (date.getDate() !== dayOfMonth || date.getHours() !== Number(clock[1]) || date.getMinutes() !== Number(clock[2])) return fail("invalid_time");
    remindAt = date.getTime();
    if (remindAt <= now) return fail("past_time");
    title = clock[3].trim();
  }
  if (!title) return fail("empty_title");
  if ([...title].length > 120) return fail("too_long");
  return { kind: "reminder", title, remindAt };
}
