import { useState, type CSSProperties } from "react";
import { useTranslation } from "../../i18n";
import { EXPRESSIONS, expressionFrame } from "./petAnimation";
import { PetVector } from "./PetVector";
import type { PetState } from "./petState";
import { usePetAnimation } from "./usePetAnimation";
import "./IslandPet.css";

const sheets = import.meta.glob<string>("../../assets/pet/*.png", { eager: true, query: "?url", import: "default" });
const sheetFor = (expression: typeof EXPRESSIONS[number]) => sheets[`../../assets/pet/${String(EXPRESSIONS.indexOf(expression)).padStart(2, "0")}-${expression}.png`];

export function IslandPet({ state, active, showTooltip = false }: { state: PetState; active: boolean; showTooltip?: boolean }) {
  const text = useTranslation().islandPet;
  const [hovered, setHovered] = useState(false);
  const { pet, reduced, visible } = usePetAnimation(state, active, hovered);
  const label = `${text.title} - ${text.states[state]}`;
  const expression = pet.clip?.expression;
  const frame = expression ? reduced ? 7 : expressionFrame(expression, pet.clip?.time ?? 0) : 0;
  const style = expression ? { backgroundImage: `url("${sheetFor(expression)}")`, backgroundPositionY: `${frame / 15 * 100}%` } as CSSProperties : undefined;
  return <span className="island-pet" data-state={state} data-active={active && visible}
    data-expression={expression} data-frame={expression ? frame : undefined}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    role="img" aria-label={label} title={showTooltip ? label : undefined}>
    {expression ? <span className="island-pet-sprite" style={style} aria-hidden="true" /> : <PetVector pet={pet} />}
  </span>;
}
