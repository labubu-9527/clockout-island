import type { MessagePreview } from "../../features/messages/messagePreview";
import type { DeviceNotice } from "../../features/device-notices/model";
import type { WirelessDevice } from "../../features/wireless/model";

export type NoticePayload = { kind: "message"; preview: MessagePreview } | { kind: "device"; notice: DeviceNotice }
  | { kind: "wireless"; device: WirelessDevice };
export type QueuedNotice = {
  id: string;
  payload: NoticePayload;
  priority: number;
  remainingMs: number;
  waitUntil: number;
};
export type NoticeQueue = {
  active: QueuedNotice | null;
  pending: QueuedNotice[];
  seen: Record<string, number>;
  at: number;
  holding: boolean;
};

export function messageNotice(preview: MessagePreview, durationMs: number, now: number): QueuedNotice {
  const code = Boolean(preview.otpCode);
  return {
    id: JSON.stringify([preview.source, preview.mailAccount ?? "", preview.pluginId ?? "",
      preview.messageId ?? preview.wechatMessageId ?? [preview.receivedAt, preview.title, preview.body]]),
    payload: { kind: "message", preview }, priority: code ? 3 : 2,
    remainingMs: Math.max(1, durationMs), waitUntil: Math.min(now, preview.receivedAt) + (code ? 30_000 : 60_000),
  };
}

export function deviceNotice(notice: DeviceNotice): QueuedNotice {
  return { id: JSON.stringify(["device", notice.kind, notice.at, notice.value]), payload: { kind: "device", notice },
    priority: 1, remainingMs: 2000, waitUntil: notice.at + 2000 };
}

export function wirelessNotice(device: WirelessDevice, now: number): QueuedNotice {
  return { id: JSON.stringify(["wireless", device.id, device.batteryPercent, now]), payload: { kind: "wireless", device },
    priority: 1, remainingMs: 3000, waitUntil: now + 30_000 };
}

export function createNoticeQueue(now: number): NoticeQueue {
  return { active: null, pending: [], seen: {}, at: now, holding: false };
}

/** Pure clocked transitions: only the visible entry spends its display budget. */
export function advanceNoticeQueue(state: NoticeQueue, {
  now, incoming = [], holding = false, enabled = true, isValid = () => true,
}: {
  now: number;
  incoming?: readonly QueuedNotice[];
  holding?: boolean;
  enabled?: boolean;
  isValid?: (entry: QueuedNotice) => boolean;
}): NoticeQueue {
  const seen = Object.fromEntries(Object.entries(state.seen).filter(([, until]) => until > now));
  let active = state.active ? { ...state.active } : null;
  let pending = state.pending.filter(entry => entry.waitUntil > now && isValid(entry));
  if (active && (!state.holding || active.payload.kind !== "message")) {
    active.remainingMs -= Math.max(0, now - state.at);
  }
  if (active && (active.remainingMs <= 0 || !isValid(active))) active = null;

  for (const entry of incoming) {
    const known = seen[entry.id] !== undefined;
    seen[entry.id] = now + 120_000;
    if (!enabled || !isValid(entry)) continue;
    if (active?.id === entry.id) {
      active = { ...active, payload: entry.payload, priority: entry.priority };
      continue;
    }
    const index = pending.findIndex(item => item.id === entry.id);
    if (index >= 0) {
      pending = pending.map((item, i) => i === index ? { ...item, payload: entry.payload, priority: entry.priority } : item);
      continue;
    }
    if (known || entry.waitUntil <= now) continue;
    if (entry.payload.kind === "wireless") {
      const deviceId = entry.payload.device.id;
      pending = pending.filter(item => item.payload.kind !== "wireless" || item.payload.device.id !== deviceId);
    }
    if (entry.payload.kind === "device") {
      const kind = entry.payload.notice.kind;
      if (active && active.priority > entry.priority) continue;
      pending = pending.filter(item => item.payload.kind !== "device" || item.payload.notice.kind !== kind);
      if (active?.payload.kind === "device" && active.payload.notice.kind === kind) {
        active = entry;
        continue;
      }
    }
    pending = [...pending, entry];
  }

  if (!enabled) return { active: null, pending: [], seen, at: now, holding: false };
  pending.sort((a, b) => b.priority - a.priority);
  if (active && !holding && pending[0]?.priority > active.priority) {
    if (active.payload.kind === "message" && active.waitUntil > now) pending.unshift(active);
    active = null;
  }
  pending.sort((a, b) => b.priority - a.priority);
  if (!active) active = pending.shift() ?? null;
  // Capacity protects codes; within the lowest priority retain the newest arrivals.
  while (pending.length > 20) {
    const lowest = pending[pending.length - 1].priority;
    pending.splice(pending.findIndex(item => item.priority === lowest), 1);
  }
  const recentSeen = Object.fromEntries(Object.entries(seen).slice(-512));
  return { active, pending, seen: recentSeen, at: now, holding };
}
