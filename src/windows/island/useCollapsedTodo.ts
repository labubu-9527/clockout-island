import { isUpdateTodo } from "../../features/todos/updateTodo";
import { useMemo } from "react";
import type { IslandSettings } from "../../features/appearance/types";
import type { TodoItem } from "../../features/todos/types";
import { formatTodoCountdown, type TodoTimer } from "../../features/todos/timer";
import { useTranslation } from "../../i18n";
import { useTodoRotation } from "./useIslandAutomation";
import { alignCollapsedIslandWidth, getCollapsedIslandWidth, MAX_COLLAPSED_ISLAND_WIDTH } from "./layout";
import { COLLAPSED_WIDTH } from "../../features/appearance/settingsLimits";
import { pickCollapsedItem } from "./collapsedItem";
import { selectRotatingTodos } from "../../features/todos/todoRotation";
import type { TodoRotationDisplay } from "./CollapsedTodoContent";

// Stands in for the agent icon (16px plus gap) when sizing the island for a session title.
const AGENT_ICON_TEXT = "MM";
// A countdown pill beside the todo title: gap, padding and about 7px a digit (12px a CJK glyph).
function timerPillWidth(text: string, fontScale: number) {
  return 20 + fontScale * [...text].reduce((width, char) => width + (/[\u2E80-\uFFFF]/.test(char) ? 12 : 7), 0);
}

/**
 * What the collapsed island shows: a running agent's session title (`agentTitle`), the lyric
 * line while a song plays (`lyricsPlaying`), or for todos the active (or rotating) todo title,
 * otherwise the pending count. Music has its own centered presentation; ordinary content follows
 * the saved priority. The returned width measures the text; the window adds only visible accessories.
 */
export function useCollapsedTodo(
  todos: TodoItem[],
  activeTodoId: string | null,
  settings: IslandSettings,
  isRotationPaused: boolean,
  agentTitle: string | null = null,
  { lyricsPlaying = false, timer = null, activeIds, timers }: { lyricsPlaying?: boolean; coverWanted?: boolean; timer?: TodoTimer | null; activeIds?: string[]; timers?: TodoTimer[] } = {},
) {
  const t = useTranslation();
  const accessoryWidth = 0;
  const pendingTodoIds = useMemo(
    () => todos.filter((todo) => !todo.completed && !isUpdateTodo(todo)).map((todo) => todo.id),
    [todos],
  );
  const rotationTodos = useMemo(() => selectRotatingTodos(todos, activeIds ?? (activeTodoId ? [activeTodoId] : [])), [todos, activeIds, activeTodoId]);
  const rotationIds = useMemo(() => rotationTodos.map((todo) => todo.id), [rotationTodos]);
  const rotating = settings.rotateTodos && rotationTodos.length > 0;
  const rotatingTodoId = useTodoRotation(
    rotationIds,
    activeTodoId,
    rotating,
    settings.todoRotationSeconds,
    isRotationPaused || settings.todoRotationMode === "scroll",
  );
  const displayedTodoId = rotating && settings.todoRotationMode === "scroll" ? rotationIds[0] : rotatingTodoId;
  const collapsedTimer = timers?.find((round) => round.todoId === displayedTodoId)
    ?? (timer?.todoId === displayedTodoId ? timer : null);
  const todoRotation: TodoRotationDisplay | null = rotating ? {
    ids: rotationIds,
    titles: rotationTodos.map((todo) => todo.title), mode: settings.todoRotationMode,
    timers: rotationTodos.map((todo) => timers?.find((round) => round.todoId === todo.id)
      ?? (timer?.todoId === todo.id ? timer : null)),
    selectedIndex: Math.max(0, rotationIds.indexOf(displayedTodoId ?? "")),
    speed: settings.todoScrollSpeed, paused: isRotationPaused,
  } : null;
  const collapsedTaskTitle = useMemo(() => {
    const activeTodo = todos.find(
      (todo) => todo.id === displayedTodoId && !todo.completed,
    );
    return activeTodo?.title ?? null;
  }, [displayedTodoId, todos]);
  // "0 todos left" is not worth a hint; with nothing pending the bar shows what it
  // would without a todo count.
  const pendingTodoCount = pendingTodoIds.length;
  const collapsedTodoCount = settings.showIdleTodoCount && !collapsedTaskTitle && pendingTodoCount > 0
    ? pendingTodoCount
    : null;
  const collapsedItem = lyricsPlaying ? "lyrics" : timers?.length || timer ? "todo" : pickCollapsedItem(settings.collapsedPriority, {
    agent: agentTitle !== null,
    lyrics: lyricsPlaying,
    todo: collapsedTaskTitle !== null || collapsedTodoCount !== null,
  }, activeTodoId !== null && pendingTodoIds.includes(activeTodoId));
  const collapsedIslandWidth = useMemo(() => {
    if (!settings.collapsedAutoWidth) return settings.collapsedWidth;
    if (collapsedItem === "lyrics") return 300;
    const fontScale = settings.islandFontPercent / 100;
    const maxWidth = Math.min(COLLAPSED_WIDTH.max, MAX_COLLAPSED_ISLAND_WIDTH + accessoryWidth);
    // A fixed width for the whole round; ticking digits never resize the native window.
    const widestTimer = (timers ?? (timer ? [timer] : [])).reduce<string | null>((widest, round) => {
      const text = round.notified ? t.todo.timeUp : formatTodoCountdown(round.durationMinutes * 60);
      return !widest || text.length > widest.length ? text : widest;
    }, null);
    const todoText = rotating && rotationTodos.length
      ? rotationTodos.reduce((widest, todo) => getCollapsedIslandWidth(todo.title, 0, fontScale) > getCollapsedIslandWidth(widest, 0, fontScale) ? todo.title : widest, "")
      : collapsedTaskTitle ?? (collapsedTodoCount !== null ? t.island.pendingTodos(collapsedTodoCount) : null);
    const itemText = collapsedItem === "agent"
      ? AGENT_ICON_TEXT + agentTitle
      : collapsedItem === "todo" ? todoText : null;
    const text = settings.showCollapsedText && settings.collapsedSlotVisibility.text
      ? [settings.showTitle && collapsedItem !== "agent" && !widestTimer ? t.island.appName : "", itemText].filter(Boolean).join(" ") : "";
    return alignCollapsedIslandWidth(
      getCollapsedIslandWidth(text, accessoryWidth + (widestTimer && collapsedItem === "todo" ? timerPillWidth(widestTimer, fontScale) : 0), fontScale, maxWidth),
      window.innerWidth,
      window.devicePixelRatio,
      maxWidth,
    );
  }, [agentTitle, collapsedItem, collapsedTaskTitle, collapsedTodoCount, settings.collapsedAutoWidth,
    settings.collapsedWidth, settings.islandFontPercent, settings.showCollapsedText, settings.showTitle, settings.collapsedSlotVisibility.text,
    accessoryWidth, t, timer, timers, rotating, rotationTodos]);

  return { collapsedTaskTitle, collapsedTodoCount, collapsedItem, collapsedIslandWidth, todoRotation, collapsedTimer };
}
