import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useTranslation } from "../../i18n";
import { curvePoint, motionTiming, springResponse, type IslandEffectsSettings, type MotionCurve } from "./islandEffects";
import "./MotionCurveEditor.css";

export function MotionCurveEditor({ settings, onChange }: { settings: IslandEffectsSettings; onChange: (curve: MotionCurve) => void }) {
  const text = useTranslation().settings.appearance.effects;
  const ref = useRef<SVGSVGElement>(null);
  const [draft, setDraft] = useState<MotionCurve | null>(null);
  const [preview, setPreview] = useState(0);
  const lastPreviewAt = useRef(-Infinity);
  const dragging = useRef<number | null>(null);
  const curve = draft ?? settings.motionCurve;
  const applyPointer = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return;
    const next: MotionCurve = [...curve];
    next[index * 2] = Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * 100) / 100;
    next[index * 2 + 1] = Math.round(Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height)) * 100) / 100;
    setDraft(next);
    const now = performance.now();
    if (now - lastPreviewAt.current >= 80) {
      lastPreviewAt.current = now;
      setPreview(value => value + 1);
    }
    return next;
  };
  const finish = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (dragging.current === null) return;
    const next = applyPointer(event, index);
    dragging.current = null;
    setDraft(null);
    if (next) onChange(next);
  };
  const key = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const axis = event.key === "ArrowLeft" || event.key === "ArrowRight" ? 0 : event.key === "ArrowUp" || event.key === "ArrowDown" ? 1 : -1;
    if (axis < 0) return;
    event.preventDefault();
    const next: MotionCurve = [...curve];
    const change = event.key === "ArrowRight" || event.key === "ArrowUp" ? 0.01 : -0.01;
    next[index * 2 + axis] = Math.round(Math.max(0, Math.min(1, next[index * 2 + axis] + change)) * 100) / 100;
    onChange(next);
  };
  const points = Array.from({ length: 81 }, (_, i) => {
    const p = settings.motionMode === "curve" ? curvePoint(curve, i / 80) : { x: i / 80,
      y: springResponse(i / 80 * settings.motionDuration / 1000, settings.springMass, settings.springStiffness, settings.springDamping) };
    return `${p.x * 100},${100 - p.y * 100}`;
  }).join(" ");
  return <div className="motion-curve">
    <div className="motion-curve__canvas">
    <svg ref={ref} className="motion-curve__graph" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={text.curve}>
      {[0, 25, 50, 75, 100].map(value => <g className="motion-curve__grid" key={value}><path d={`M ${value},0 V 100 M 0,${value} H 100`} /></g>)}
      {settings.motionMode === "curve" && <path className="motion-curve__guide" d={`M 0,100 L ${curve[0] * 100},${100 - curve[1] * 100} M 100,0 L ${curve[2] * 100},${100 - curve[3] * 100}`} />}
      <polyline className="motion-curve__line" points={points} />
    </svg>
      {settings.motionMode === "curve" && [0, 1].map(index => <button type="button" key={index} className="motion-curve__handle"
        style={{ left: `${curve[index * 2] * 100}%`, top: `${100 - curve[index * 2 + 1] * 100}%` }}
        role="slider" aria-label={text.handle(index + 1)} aria-valuemin={0} aria-valuemax={1} aria-valuenow={curve[index * 2]}
        aria-valuetext={`${curve[index * 2]}, ${curve[index * 2 + 1]}`} tabIndex={0}
        onKeyDown={event => key(event, index)}
        onPointerDown={event => { event.preventDefault(); dragging.current = index; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { if (dragging.current === index) applyPointer(event, index); }}
        onPointerUp={event => finish(event, index)}
        onPointerCancel={() => { dragging.current = null; setDraft(null); }} />)}
    </div>
    <p className="motion-curve__hint">{text.curveHint}</p>
    <button className="motion-curve__preview" type="button" onClick={() => setPreview(value => value + 1)}>{text.preview}</button>
    <div className="motion-curve__track" aria-hidden="true"><span key={`${preview}:${settings.motionCurve.join()}:${settings.motionMode}:${settings.motionDuration}:${settings.springMass}:${settings.springStiffness}:${settings.springDamping}`} style={{ "--motion-preview-duration": `${settings.motionDuration}ms`,
      "--motion-preview-timing": motionTiming({ ...settings, motionCurve: curve }, true, CSS.supports("transition-timing-function", "linear(0,1)")) } as CSSProperties} /></div>
  </div>;
}
