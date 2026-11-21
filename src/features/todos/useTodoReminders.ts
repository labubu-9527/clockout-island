import { useEffect, useLayoutEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { getLocalDateString } from "../../utils/date";
import { dueReminderIds } from "./reminders";
import type { TodoItem } from "./types";
export type DeliverTodoReminder = (isCurrent: () => boolean) => Promise<boolean>;

/** Polling is local to the effect: a ticking clock does not re-render the island. */
export function useTodoReminders(todos: TodoItem[], currentDate: string, setTodos: Dispatch<SetStateAction<TodoItem[]>>, onReminder?: DeliverTodoReminder) {
  const latest = useRef({ todos, currentDate, onReminder });
  const inFlight = useRef(false);
  useLayoutEffect(() => { latest.current = { todos, currentDate, onReminder }; });
  useEffect(() => {
    let disposed = false;
    const check = async () => {
      const state = latest.current;
      if (disposed || inFlight.current || state.currentDate !== getLocalDateString() || !state.onReminder) return;
      const ids = dueReminderIds(state.todos, Date.now());
      if (!ids.length) return;
      const isCurrent = () => !disposed && latest.current.currentDate === getLocalDateString()
        && dueReminderIds(latest.current.todos, Date.now()).some((id) => ids.includes(id));
      inFlight.current = true;
      try {
        if (await state.onReminder(isCurrent) && isCurrent()) {
          setTodos((current) => current.map((todo) => ids.includes(todo.id) && !todo.completed ? { ...todo, reminded: true } : todo));
        }
      } catch (error) {
        console.error("Failed to deliver todo reminder", error);
      } finally { inFlight.current = false; }
    };
    void check();
    const interval = window.setInterval(() => { void check(); }, 1000);
    return () => { disposed = true; window.clearInterval(interval); };
  }, [setTodos]);
}
