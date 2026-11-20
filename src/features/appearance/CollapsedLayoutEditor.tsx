import { useWeatherSettings } from "../weather/storage";
import { useCallback, type KeyboardEvent, type ReactNode } from "react";
import { AudioLines, Clock, CloudSun, Cpu, MemoryStick, Inbox, Mail } from "lucide-react";
import { IslandPet } from "../island-pet";
import { usePointerReorder } from "../../components/reorder/usePointerReorder";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsLinkButton } from "../../components/settings/SettingsLinkButton";
import { useTranslation } from "../../i18n";
import { moveItem } from "../../utils/order.ts";
import { COLLAPSED_SLOTS } from "./settingsLimits";
import type { CollapsedSlot, IslandSettings } from "./types";
import { withCollapsedSlotVisibility, withMessageSourceVisibility } from "./visibilitySettings";
import "./CollapsedLayoutEditor.css";

/** Whether each icon's feature is on; a switched-off one shows grey and keeps its place. */
function slotsOn(settings: IslandSettings): Record<CollapsedSlot, boolean> {
  return {
    text: true,
    mail: settings.mailEnabled,
    shelf: settings.shelfEnabled && settings.shelfShowCount,
    music: settings.musicEnabled,
    agents: settings.agentStatusEnabled,
    cpu: settings.cpuEnabled,
    memory: settings.memoryEnabled,
    weather: true,
    clock: settings.clockEnabled,
    pet: settings.petEnabled,
  };
}

/**
 * Appearance → On the island: a collapsed island to arrange by hand. Hold the text or a status
 * icon and drag it left or right (or press the arrow keys on it); icons left of the text sit on
 * the island's left. Like the real island, the agent count shows as the tuck dot while the AI
 * Agent switch is off.
 */
export function CollapsedLayoutEditor({
  children,
  settings,
  onSettingsChange,
}: {
  /** More rows of the same group, after the editor (Appearance puts the page buttons here). */
  children?: ReactNode;
  settings: IslandSettings;
  onSettingsChange: (settings: IslandSettings) => void;
}) {
  const t = useTranslation();
  const text = t.settings.appearance.collapsedIsland.layout;
  const slotLabels = { ...text.slots, clock: t.clock.name, pet: t.islandPet.title };
  const layout = settings.collapsedLayout;
  const movableLayout: CollapsedSlot[] = layout.filter((slot) => slot !== "pet");
  const available = { ...slotsOn(settings), weather: useWeatherSettings().enabled };
  const on = (slot: CollapsedSlot) => available[slot] && settings.collapsedSlotVisibility[slot];
  const reorder = useCallback(
    (collapsedLayout: CollapsedSlot[]) => onSettingsChange({ ...settings, collapsedLayout: [...collapsedLayout.filter(slot => slot !== "pet"), "pet"] }),
    [onSettingsChange, settings],
  );
  const { containerRef, itemProps, draggingId } = usePointerReorder(movableLayout, reorder, "x");
  const isDefault = layout.join() === COLLAPSED_SLOTS.join();

  const moveWithKeys = (slot: CollapsedSlot, event: KeyboardEvent) => {
    const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = moveItem(movableLayout, slot, movableLayout.indexOf(slot) + step);
    if (next !== movableLayout) reorder(next);
  };

  const content: Record<CollapsedSlot, ReactNode> = {
    text: <>{text.textSample}</>,
    mail: <Mail size={15} strokeWidth={1.6} absoluteStrokeWidth />,
    shelf: <><Inbox size={13} strokeWidth={1.6} absoluteStrokeWidth />2</>,
    music: <AudioLines size={15} strokeWidth={1.6} absoluteStrokeWidth />,
    agents: settings.agentStatusEnabled ? "1" : null,
    cpu: <><Cpu size={12} strokeWidth={1.6} absoluteStrokeWidth />12%</>,
    memory: <><MemoryStick size={12} strokeWidth={1.6} absoluteStrokeWidth />48%</>,
    weather: <CloudSun size={15} strokeWidth={1.6} absoluteStrokeWidth />,
    clock: <Clock size={15} strokeWidth={1.6} absoluteStrokeWidth />,
    pet: <IslandPet state="idle" active={false} showTooltip={false} />,
  };

  return (
    <SettingsGroup
      title={text.title}
      action={<SettingsLinkButton disabled={isDefault} onClick={() => reorder([...COLLAPSED_SLOTS])}>{text.reset}</SettingsLinkButton>}
      footer={text.footer}
    >
      <div className="collapsed-layout">
        <div className={`collapsed-layout__island collapsed-layout__island--${settings.islandShape}`} ref={(node) => { containerRef.current = node; }}>
          {on("pet") && <span className="collapsed-layout__fixed-pet" aria-label={text.petPositionHint}>{content.pet}</span>}
          {movableLayout.map((slot) => (
            <button
              key={slot}
              type="button"
              className={[
                "collapsed-layout__slot",
                `collapsed-layout__slot--${slot}`,
                slot === "agents" && !settings.agentStatusEnabled ? "collapsed-layout__slot--tuck" : "",
                on(slot) ? "" : "collapsed-layout__slot--off",
                draggingId === slot ? "collapsed-layout__slot--dragging" : "",
              ].filter(Boolean).join(" ")}
              aria-label={text.moveLabel(slotLabels[slot])}
              onKeyDown={(event) => moveWithKeys(slot, event)}
              {...itemProps(slot)}
            >
              {content[slot]}
            </button>
          ))}
        </div>
      </div>
      {layout.map((slot) => <SettingsToggleRow key={slot}
        title={slotLabels[slot]} description={slot === "text" ? text.visibilityHint : slot === "pet" ? text.petPositionHint : undefined}
        checked={settings.collapsedSlotVisibility[slot]}
        onChange={(visible) => onSettingsChange(withCollapsedSlotVisibility(settings, slot, visible))} />)}
      {(["wechat", "qq", "plugin", "dingtalk", "feishu", "wecom"] as const).map((source) => <SettingsToggleRow key={source}
        title={text.messageSources[source]} checked={settings.messageSourceVisibility[source]}
        onChange={(visible) => onSettingsChange(withMessageSourceVisibility(settings, source, visible))} />)}
      {children}
    </SettingsGroup>
  );
}
