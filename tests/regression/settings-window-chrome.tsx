import { act } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { I18nProvider } from "../../src/i18n";
import { SettingsWindowChrome } from "../../src/windows/settings/SettingsWindowChrome";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const calls: string[] = [];
mockWindows("settings");
mockIPC(command => { calls.push(command); return null; }, { shouldMockEvents: true });
const root = createRoot(document.getElementById("root")!);
const checks: string[] = [];
const check = (ok: unknown, message: string) => { if (!ok) throw new Error(message); checks.push(`PASS ${message}`); };
const pointer = (element: Element, button: number) => act(async () => {
  element.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button }));
});
try {
  await act(async () => root.render(<I18nProvider><SettingsWindowChrome /></I18nProvider>));
  const surface = document.querySelector(".settings-window-chrome")!;
  const close = document.querySelector<HTMLButtonElement>(".settings-window-chrome__close")!;
  check(Boolean(close.getAttribute("aria-label")), "close button has a localized accessible label");
  await pointer(surface, 2);
  check(!calls.includes("plugin:window|start_dragging"), "secondary pointer cannot start a drag");
  await pointer(surface, 0);
  check(calls.filter(command => command === "plugin:window|start_dragging").length === 1, "empty chrome starts native dragging");
  await pointer(close.querySelector("svg")!, 0);
  check(calls.filter(command => command === "plugin:window|start_dragging").length === 1, "close icon does not start native dragging");
  await act(async () => close.click());
  check(calls.filter(command => command === "plugin:window|close").length === 1, "close invokes the settings window close action exactly once");
  close.focus();
  check(document.activeElement === close, "close control remains keyboard focusable");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  checks.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = "failed";
} finally { await act(async () => root.unmount()); }
document.getElementById("results")!.textContent = checks.join("\n");
