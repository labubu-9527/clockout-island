import { useTranslation } from "../../i18n";
import "./QuickReminderPreview.css";
export function TodoReminderTime({ remindAt, reminded = false }: { remindAt?: number; reminded?: boolean }) {
  const t = useTranslation();
  if (remindAt === undefined) return null;
  const date = new Date(remindAt);
  const label = new Intl.DateTimeFormat(t.localeTag, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return <time className="todo-reminder-time" dateTime={date.toISOString()} title={reminded ? t.notebook.reminderDelivered : t.notebook.reminderPending}>{label}{reminded ? ` · ${t.notebook.reminderDelivered}` : ""}</time>;
}
