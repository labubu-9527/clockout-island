import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { useWindowDragGesture } from "../../src/windows/island/useWindowDragGesture";
import "../../src/styles/tokens.css";

Object.defineProperty(window, "isTauri", { value: true, configurable: true });
mockWindows("main");
const position = { x: 0, y: -900 };
const size = { width: 1600, height: 900 };
mockIPC(command => {
  if (command === "plugin:window|current_monitor") return { position, size, scaleFactor: devicePixelRatio, workArea: { position, size } };
  if (command === "plugin:window|inner_position") return { x: 100, y: -900 + devicePixelRatio * 5 };
  throw Error(command);
});

const counts = { hide: 0, drag: 0, click: 0 };
const hide = () => { counts.hide++; };
function Harness({ enabled, locked }: { enabled: boolean; locked: boolean }) {
  const { drag, didDragRef } = useWindowDragGesture(locked, () => { counts.drag++; }, enabled ? hide : undefined);
  return <section className="island" style={{ padding: 80 }}>
    <button className="island__open-button" {...drag} onClick={e => {
      if (!e.detail || !didDragRef.current) counts.click++;
    }}>Island</button>
  </section>;
}

const root = createRoot(document.getElementById("root")!);
const show = (enabled: boolean, locked: boolean) => flushSync(() => root.render(<Harness enabled={enabled} locked={locked} />));
show(true, true);
const handle = document.querySelector("button")!;
const island = document.querySelector("section")!;
const result = document.querySelector("#results")!;
function check(ok: boolean, label: string) {
  if (!ok) throw Error(label);
  result.textContent += `PASS ${label}\n`;
}
if (new URLSearchParams(location.search).has("check")) {
  // DOM-dispatched test events do not enter Chromium's hardware pointer registry.
  let capture = false;
  handle.setPointerCapture = () => { capture = true; };
  handle.hasPointerCapture = () => capture;
  handle.releasePointerCapture = () => { capture = false; };
  const pointer = (type: string, x: number, y: number) => handle.dispatchEvent(new PointerEvent(type, {
    isPrimary: true, pointerId: 5, pointerType: "mouse", button: 0, buttons: type === "pointerup" ? 0 : 1,
    bubbles: true, cancelable: true, clientX: x, clientY: y,
  }));
  const run = async () => {
    pointer("pointerdown", 90, 100);
    pointer("pointermove", 90, 50);
    check(capture && !!island.style.translate, "position lock permits damped swipe");
    pointer("pointerup", 90, 50);
    handle.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    check(counts.hide === 1 && counts.click === 0 && !island.style.translate && !capture, "release hides once and suppresses click");
    pointer("pointerdown", 90, 100);
    pointer("pointermove", 90, 50);
    window.dispatchEvent(new Event("blur"));
    pointer("pointerup", 90, 50);
    check(!capture && !island.style.translate && counts.hide === 1, "blur cancels in-flight gesture");
    pointer("pointerdown", 90, 100);
    pointer("pointermove", 110, 100);
    check(counts.drag === 0, "position lock blocks native movement");
    pointer("pointerdown", 90, 7);
    pointer("pointermove", 90, -5);
    pointer("pointerup", 90, -5);
    await new Promise(resolve => setTimeout(resolve, 0));
    check(counts.hide === 2, "short swipe reaches the negative-coordinate monitor ceiling");
    pointer("pointerdown", 90, 100);
    pointer("pointermove", 90, 88);
    pointer("pointerup", 90, 88);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    check(reduced ? !island.getAnimations().length : island.getAnimations().length === 1, "short release respects motion preference");
    await Promise.all(island.getAnimations().map(animation => animation.finished));
    check(!island.style.translate && !island.getAnimations().length && counts.hide === 2, "short release finishes at original position");
    show(false, false);
    pointer("pointerdown", 90, 100);
    pointer("pointermove", 90, 96);
    check(counts.drag === 1 && !capture, "disabled preference restores ordinary 3px native drag");
    document.documentElement.dataset.testResult = "passed";
  };
  void run().catch(error => {
    result.textContent += `FAIL ${error}`;
    document.documentElement.dataset.testResult = "failed";
  });
}
