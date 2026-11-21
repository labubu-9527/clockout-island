import { useTranslation } from "../../i18n";
import { parseQuickReminder } from "./quickReminder";
import { TodoReminderTime } from "./TodoReminderTime";
import "./QuickReminderPreview.css";
export function QuickReminderPreview({ draft }: { draft: string }) {
  const t = useTranslation();
  const parsed = parseQuickReminder(draft);
  if (parsed.kind === "task") return null;
  return <div id="todo-reminder-preview" className={`todo-reminder-preview${parsed.kind === "error" ? " todo-reminder-preview--error" : ""}`} role={parsed.kind === "error" ? "alert" : "status"}>
    {parsed.kind === "error" ? t.notebook.reminderErrors[parsed.error] : <>{t.notebook.reminderPreview(parsed.title)} <TodoReminderTime remindAt={parsed.remindAt} /></>}
  </div>;
}
