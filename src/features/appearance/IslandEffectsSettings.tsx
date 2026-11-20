import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { SettingsSliderRow } from "../../components/settings/SettingsSliderRow";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import { DEFAULT_ISLAND_EFFECTS, type IslandEffectsSettings as EffectsSettings } from "./islandEffects";
import { MotionCurveEditor } from "./MotionCurveEditor";
import type { IslandSettings } from "./types";

export function IslandEffectsSettings({ settings, onSettingsChange }: { settings: IslandSettings; onSettingsChange: (settings: IslandSettings) => void }) {
  const t = useTranslation(), text = t.settings.appearance.effects;
  const patch = (next: Partial<EffectsSettings>) => onSettingsChange({ ...settings, ...next });
  const sliders = [
    ["motionDuration", text.expandDuration, 250, 1200, 10, "ms"],
    ["motionCollapseDuration", text.collapseDuration, 150, 700, 10, "ms"],
    ["springMass", text.mass, 0.3, 2, 0.05, ""],
    ["springStiffness", text.stiffness, 100, 1000, 10, ""],
    ["springDamping", text.damping, 10, 80, 1, ""],
  ] as const;
  return <>
    <SettingsGroup title={text.title}>
      <SettingsToggleRow title={text.music} description={text.musicHint} checked={settings.musicGlowEnabled} onChange={musicGlowEnabled => patch({ musicGlowEnabled })} />
      <SettingsToggleRow title={text.timer} description={text.timerHint} checked={settings.timerGlowEnabled} onChange={timerGlowEnabled => patch({ timerGlowEnabled })} />
      <SettingsToggleRow title={text.update} description={text.updateHint} checked={settings.updateGlowEnabled} onChange={updateGlowEnabled => patch({ updateGlowEnabled })} />
    </SettingsGroup>
    <SettingsGroup footer={text.footer}>
      <SettingsRow title={text.musicMode}><SettingsChoice value={settings.musicGlowMode}
        options={[{ value: "breath", label: text.breath }, { value: "rhythm", label: text.rhythm }]} ariaLabel={text.musicMode}
        onChange={musicGlowMode => patch({ musicGlowMode })} /></SettingsRow>
    </SettingsGroup>
    <SettingsGroup title={text.motionTitle} action={<button className="motion-curve__preview" type="button" onClick={() => patch({
      motionMode: DEFAULT_ISLAND_EFFECTS.motionMode, motionCurve: [...DEFAULT_ISLAND_EFFECTS.motionCurve],
      motionDuration: DEFAULT_ISLAND_EFFECTS.motionDuration, motionCollapseDuration: DEFAULT_ISLAND_EFFECTS.motionCollapseDuration,
      springMass: DEFAULT_ISLAND_EFFECTS.springMass, springStiffness: DEFAULT_ISLAND_EFFECTS.springStiffness, springDamping: DEFAULT_ISLAND_EFFECTS.springDamping,
      pillCornerRadius: DEFAULT_ISLAND_EFFECTS.pillCornerRadius,
    })}>{text.reset}</button>}>
      <SettingsRow title={text.mode} control={<SettingsChoice value={settings.motionMode}
        options={[{ value: "curve", label: text.curve }, { value: "spring", label: text.spring }]}
        ariaLabel={text.mode} onChange={motionMode => patch({ motionMode })} />} />
      <MotionCurveEditor settings={settings} onChange={motionCurve => patch({ motionCurve })} />
      {sliders.filter(([key]) => settings.motionMode === "spring" || !key.startsWith("spring")).map(([key, title, min, max, step, unit]) =>
        <SettingsSliderRow key={key} title={title} value={settings[key]} min={min} max={max} step={step}
          defaultValue={DEFAULT_ISLAND_EFFECTS[key]} resetLabel={t.settings.layout.resetToDefault}
          format={value => `${Number(value.toFixed(2))}${unit}`} onChange={value => patch({ [key]: value })} />)}
      <SettingsSliderRow title={text.pillCorner} value={settings.pillCornerRadius ?? settings.collapsedHeight / 2}
        min={0} max={48} step={1} format={value => `${value}px`}
        onChange={pillCornerRadius => patch({ pillCornerRadius })} />
    </SettingsGroup>
  </>;
}
