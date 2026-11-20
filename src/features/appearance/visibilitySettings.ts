import type { CollapsedSlot, IslandSettings, LegacyIslandSettings, MessageSource } from "./types";

export const DEFAULT_SLOT_VISIBILITY: Record<CollapsedSlot, boolean> = {
  text: true, mail: true, shelf: true, music: true, agents: true,
  cpu: true, memory: true, weather: true, clock: true, pet: true,
};
export const DEFAULT_MESSAGE_VISIBILITY: Record<MessageSource, boolean> = {
  qq: true, wechat: true, qqMail: true, plugin: true, dingtalk: true, feishu: true, wecom: true,
};
const LEGACY_DISPLAY_FIELDS = {
  text: "showCollapsedText", cpu: "cpuEnabled", memory: "memoryEnabled", clock: "clockEnabled", pet: "petEnabled",
} as const;

/** Old readers still use these flags; the visibility map is authoritative once present. */
export function legacyDisplayFlags(visibility: Record<CollapsedSlot, boolean>) {
  return {
    showCollapsedText: visibility.text,
    cpuEnabled: visibility.cpu,
    memoryEnabled: visibility.memory,
    clockEnabled: visibility.clock,
    petEnabled: visibility.pet,
  };
}

export function normalizeVisibilitySettings(settings: LegacyIslandSettings | null | undefined) {
  const collapsedSlotVisibility = { ...DEFAULT_SLOT_VISIBILITY };
  for (const slot of Object.keys(collapsedSlotVisibility) as CollapsedSlot[]) {
    const saved = settings?.collapsedSlotVisibility?.[slot];
    const legacy = slot in LEGACY_DISPLAY_FIELDS
      ? settings?.[LEGACY_DISPLAY_FIELDS[slot as keyof typeof LEGACY_DISPLAY_FIELDS]] : true;
    collapsedSlotVisibility[slot] = typeof saved === "boolean" ? saved : legacy !== false;
  }
  const messageSourceVisibility = { ...DEFAULT_MESSAGE_VISIBILITY };
  for (const source of Object.keys(messageSourceVisibility) as MessageSource[]) {
    const saved = settings?.messageSourceVisibility?.[source];
    messageSourceVisibility[source] = typeof saved === "boolean" ? saved
      : source === "qqMail" ? collapsedSlotVisibility.mail : true;
  }
  collapsedSlotVisibility.mail = messageSourceVisibility.qqMail;
  return { collapsedSlotVisibility, messageSourceVisibility };
}

export function withCollapsedSlotVisibility(settings: IslandSettings, slot: CollapsedSlot, visible: boolean): IslandSettings {
  const legacy = slot in LEGACY_DISPLAY_FIELDS
    ? { [LEGACY_DISPLAY_FIELDS[slot as keyof typeof LEGACY_DISPLAY_FIELDS]]: visible } : {};
  return {
    ...settings, ...legacy,
    collapsedSlotVisibility: { ...settings.collapsedSlotVisibility, [slot]: visible },
    messageSourceVisibility: slot === "mail"
      ? { ...settings.messageSourceVisibility, qqMail: visible } : settings.messageSourceVisibility,
  };
}

export function withMessageSourceVisibility(settings: IslandSettings, source: MessageSource, visible: boolean): IslandSettings {
  return {
    ...settings,
    messageSourceVisibility: { ...settings.messageSourceVisibility, [source]: visible },
    collapsedSlotVisibility: source === "qqMail"
      ? { ...settings.collapsedSlotVisibility, mail: visible } : settings.collapsedSlotVisibility,
  };
}
