// Geometry ported from xiaotang-daozai pet.rs (MIT, src/assets/pet/LICENSE).
import type { PetAnimation } from "./petAnimation";
import { musicSegment, smoothstep } from "./petAnimation";

function Microphone({ age, y }: { age: number; y: number }) {
  const x = 29.9 + Math.sin(age * 0.95) * 0.2;
  const top = y + 20.8 + Math.sin(age * 1.35) * 0.45;
  const angle = 35 + Math.sin(age * 1.1) * 0.07 * 180 / Math.PI;
  const grille = [-1, 0, 1];
  return <g transform={`translate(${x} ${top}) rotate(${angle})`}>
    <path d="M2.3 0H7" stroke="rgb(176,183,197)" strokeWidth="1.9" />
    <path d="M2.5 0H6.8" stroke="rgb(76,84,101)" strokeWidth="1.45" />
    <path d="M3.4 -.53H6.4" stroke="rgb(218,225,237)" strokeWidth=".28" />
    <path d="M2.05 0H2.65" stroke="rgb(126,137,157)" strokeWidth="2.6" />
    <circle r="2.6" fill="rgb(222,228,238)" stroke="none" />
    <circle r="2.15" fill="rgb(164,176,194)" stroke="none" />
    {grille.map((s) => <path key={`s${s}`} d={`M${s} ${-Math.sqrt(4 - s * s) * 0.88}V${Math.sqrt(4 - s * s) * 0.88}`} stroke="rgb(92,105,126)" strokeWidth=".32" />)}
    {grille.map((v) => <path key={`v${v}`} d={`M${-Math.sqrt(4 - v * v) * 0.88} ${v}H${Math.sqrt(4 - v * v) * 0.88}`} stroke="rgb(226,232,243)" strokeWidth=".3" />)}
  </g>;
}

export function PetVector({ pet }: { pet: PetAnimation }) {
  const music = musicSegment(pet.musicAge);
  const y = pet.y + pet.gaze[1];
  const pulse = Math.sin(pet.musicAge * 2) * 0.5 + 0.5;
  const mouth = music.pose === "hum" ? "M21.3 20.7L22.2 21.4L23.2 21L24.2 21.4L25.1 20.7"
    : music.pose === "smile" ? "M21.5 20.6L22.4 21.6L23.5 21.9L24.6 21.6L25.5 20.6" : null;
  const radii = { microphone: [1.1, 0.8 + pulse * 0.5], sideSing: [1.5, 0.8 + pulse * 0.3], highNote: [1.7, 1.6 + pulse * 0.5], squint: [1.2, 0.4 + pulse * 0.6], hum: [0, 0], smile: [0, 0] };
  const microphone = ["microphone", "sideSing", "highNote"].includes(music.pose);
  const noteY = 8.5 + Math.sin(pet.musicAge * 1.4) * 0.6;
  const happy = smoothstep(0, 0.2, pet.age) * (1 - smoothstep(1.5, 2.5, pet.age));
  return <svg className="island-pet-vector" viewBox="0 0 48 30" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {pet.eyes.map((eye, index) => {
      const x = 24 + (index === 0 ? -5.6 : 5.6) + pet.gaze[0];
      const top = 14.5 + y + eye.y;
      const points = Array.from({ length: 13 }, (_, n) => {
        const q = n / 6 - 1;
        return `${x + q * eye.spread},${top + q * (eye.height / 2 + eye.tilt) + (1 - q * q) * eye.curve}`;
      }).join(" ");
      return <polyline key={index} points={points} strokeWidth={pet.state === "music" ? 3.6 - 0.8 * smoothstep(0.5, 1.5, Math.abs(eye.spread)) : 3.6} />;
    })}
    {pet.state === "music" && <g opacity={smoothstep(0, 1, music.elapsed)}>
      {mouth ? <path d={mouth} transform={`translate(0 ${y})`} strokeWidth={music.pose === "smile" ? 1 : 0.9} />
        : <ellipse cx="23.2" cy={20.7 + y} rx={radii[music.pose][0]} ry={radii[music.pose][1]} strokeWidth=".9" />}
      {microphone ? <Microphone age={pet.musicAge} y={y} /> : <g>
        <path d={`M40 ${noteY + 3}V${noteY - 3}L43 ${noteY - 2}`} strokeWidth="1.1" />
        <circle cx="38.8" cy={noteY + 3} r="1.5" fill="currentColor" stroke="none" />
      </g>}
    </g>}
    {pet.state === "agentAttention" && <g fill="#f3c969" stroke="none">
      <rect x="41" y="8" width="1.6" height="4.2" rx=".8" />
      <circle cx="41.8" cy="14.5" r=".9" />
    </g>}
    {pet.state === "notice" && <g opacity={happy} stroke="#7cdea1" strokeWidth="1">
      <path d="M3.9 9H8.1M6 6.9V11.1M39.2 8H44.8M42 5.2V10.8" />
    </g>}
  </svg>;
}
