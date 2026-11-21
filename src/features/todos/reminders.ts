import type { TodoItem } from "./types";
export type ReminderFields = Pick<TodoItem, "remindAt" | "reminded">;
export function reminderFields(value: ReminderFields): ReminderFields {
  return typeof value.remindAt === "number" && Number.isFinite(value.remindAt) && value.remindAt > 0 && value.remindAt <= 8640000000000000
    ? { remindAt: value.remindAt, reminded: value.reminded === true } : {};
}
export function dueReminderIds(items: Pick<TodoItem, "id" | "remindAt" | "reminded" | "completed">[], now: number): string[] {
  return items.filter((item) => !item.completed && !item.reminded && item.remindAt !== undefined && item.remindAt <= now).map((item) => item.id);
}
export function isPendingReminder(todo: TodoItem): boolean {
  return todo.remindAt !== undefined && !todo.reminded && !todo.completed;
}
