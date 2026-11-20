import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider } from "../../src/i18n";
import { DEFAULT_SETTINGS } from "../../src/features/appearance/settings";
import { IslandEffectsSettings } from "../../src/features/appearance/IslandEffectsSettings";
import type { IslandSettings } from "../../src/features/appearance/types";
import { IslandGlow } from "../../src/windows/island/IslandGlow";
import { islandMotionStyle } from "../../src/windows/island/islandMotionStyle";
import { useMotionLayer } from "../../src/windows/island/useMotionLayer";
import "../../src/windows/settings/LayoutEditor.css";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let update!: (patch: Partial<IslandSettings>) => void;
let expand!: (expanded: boolean) => void;
let settings = DEFAULT_SETTINGS;
function Fixture() {
  const [value, setValue] = useState<IslandSettings>({ ...DEFAULT_SETTINGS, motionMode: "curve" });
  const [expanded, setExpanded] = useState(true);
  expand = setExpanded;
  const panel = useMotionLayer<HTMLDivElement>(expanded ? "expanded" : "collapsed", "music", 200,
    expanded ? value.motionDuration : value.motionCollapseDuration);
  settings = value;
  update = patch => setValue(current => ({ ...current, ...patch }));
  return <I18nProvider><div style={{ width: "min(850px, 95vw)", margin: "20px auto" }}>
    <div className="island" style={{ ...islandMotionStyle(value, true), position: "relative", margin: "30px auto", width: "300px", height: "50px", borderRadius: "25px", background: "#17232c" }}>
      <IslandGlow settings={value} music timer hidden={false} artwork={null} />
      <div ref={panel}><button type="button" className="regression-hit" style={{ position: "relative" }}>Playback</button></div>
    </div>
    <IslandEffectsSettings settings={value} onSettingsChange={setValue} />
  </div></I18nProvider>;
}
const checks: string[] = [];
const check = (ok: unknown, label: string) => { if (!ok) throw new Error(label); checks.push(`PASS ${label}`); };
const wait = (ms = 100) => act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); });
const root = createRoot(document.getElementById("root")!);
try {
  await act(async () => root.render(<Fixture />));
  check(document.querySelector('.island-halo[data-halo-kind="off"]'), "all halo switches are opt-in");
  const toggle = document.querySelector<HTMLButtonElement>('[role="switch"]')!;
  await act(async () => toggle.click());
  await wait(180);
  const halo = document.querySelector<HTMLElement>(".island-halo")!;
  check(settings.musicGlowEnabled && halo.dataset.haloKind === "breath", "music switch really enables the rendered halo");
  check(Number(halo.style.getPropertyValue("--island-halo-strength")) > 0, "active halo produces visible strength");
  check(getComputedStyle(halo).pointerEvents === "none", "halo cannot intercept controls");
  const strokes = [...halo.querySelectorAll<HTMLElement>(".island-halo__stroke")];
  check(strokes.length === 5 && strokes.every((stroke, index) =>
    Math.abs(parseFloat(getComputedStyle(stroke).outlineWidth) - [19, 14, 10, 6, 2.5][index]) <= 0.5
    && Number(getComputedStyle(stroke).opacity) === [0.018, 0.032, 0.055, 0.1, 0.3][index]),
  "halo uses the five reference stroke widths and opacities");
  const play = document.querySelector<HTMLButtonElement>(".regression-hit")!, bounds = play.getBoundingClientRect();
  check(play.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)), "playback remains hit-testable under glow");
  const handle = document.querySelector<HTMLButtonElement>(".motion-curve__handle")!;
  const original = settings.motionCurve[0];
  await act(async () => handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  check(Math.abs(settings.motionCurve[0] - original - 0.01) < 1e-9, "keyboard curve editing updates real motion settings");
  check(document.querySelector<HTMLElement>(".island")!.style.getPropertyValue("--island-motion").includes(String(settings.motionCurve[0])), "curve changes propagate to island transition timing");
  const previewBeforeDrag = document.querySelector(".motion-curve__track span");
  const savedBeforeDrag = [...settings.motionCurve];
  const graph = document.querySelector(".motion-curve__graph")!.getBoundingClientRect();
  handle.setPointerCapture = () => {};
  await act(async () => {
    handle.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, bubbles: true }));
    handle.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: graph.left + graph.width / 2,
      clientY: graph.top + graph.height / 2, bubbles: true }));
  });
  check(document.querySelector(".motion-curve__track span") !== previewBeforeDrag, "dragging replays the live motion preview before committing settings");
  check(settings.motionCurve.join() === savedBeforeDrag.join(), "dragging keeps persistent settings unchanged until release");
  await act(async () => handle.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, clientX: graph.left + graph.width / 2,
    clientY: graph.top + graph.height / 2, bubbles: true })));
  check(Math.abs(settings.motionCurve[0] - 0.5) < 0.001, "releasing the curve commits its new position");
  await act(async () => update({ motionMode: "spring", motionDuration: 1000, springMass: 1.3 }));
  check(document.querySelector<HTMLElement>(".island")!.style.getPropertyValue("--island-motion-duration") === "1000ms", "custom duration reaches the actual island");
  check(document.querySelector<HTMLElement>(".island")!.style.getPropertyValue("--island-motion").startsWith("linear("), "spring mode reaches the real transition");
  check(!document.querySelector(".motion-curve__handle"), "spring graph avoids ineffective curve handles");
  await act(async () => update({ musicGlowEnabled: false }));
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    check(halo.dataset.haloKind === "breath", "shutdown retains the previous halo renderer during fade");
    check(Number(halo.style.getPropertyValue("--island-halo-strength")) > 0, "shutdown preserves spring motion instead of snapping off");
  } else {
    check(halo.dataset.haloKind === "off", "reduced motion switches the static halo off immediately");
  }
  await wait(650);
  check(halo.dataset.haloKind === "off", "switching off removes the active halo");
  await act(async () => { update({ motionCollapseDuration: 150 }); expand(false); });
  check(document.querySelector('.island[data-moving]'), "short animation starts its movement guard");
  await wait(280);
  check(!document.querySelector('.island[data-moving]'), "short animation releases its guard after its actual duration and buffer");
  await act(async () => { update({ motionDuration: 1200 }); expand(true); });
  await wait(650);
  check(document.querySelector('.island[data-moving]'), "long animation retains its guard beyond the old fixed duration");
  await wait(700);
  check(!document.querySelector('.island[data-moving]'), "long animation releases its guard after settling");
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  checks.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = checks.join("\n");
