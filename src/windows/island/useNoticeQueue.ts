import { useCallback, useEffect, useRef, useState } from "react";
import type { MessagePreview } from "../../features/messages/messagePreview";
import type { DeviceNotice } from "../../features/device-notices/model";
import type { WirelessDevice } from "../../features/wireless/model";
import { advanceNoticeQueue, createNoticeQueue, deviceNotice, messageNotice, wirelessNotice, type QueuedNotice } from "./noticeQueue";
import { isIslandVisible, listenIslandHover } from "./api";
import { hasIslandSelection } from "./useHoverFocus";

/** One display clock for all transient notices; receiving an event never spends its waiting time. */
export function useNoticeQueue(options: {
  enabled: boolean;
  holdEnabled: boolean;
  durationMs: number;
  pluginDurationMs?: number;
  boundary?: string;
  isValid?: (entry: QueuedNotice) => boolean;
}) {
  const latest = useRef(options);
  latest.current = options;
  const state = useRef(createNoticeQueue(Date.now()));
  const boundary = useRef(options.boundary);
  const hovering = useRef(false);
  const visible = useRef(true);
  const alive = useRef(true);
  const [active, setActive] = useState<QueuedNotice | null>(null);
  const advance = useCallback((incoming: QueuedNotice[] = []) => {
    if (!alive.current) return;
    const current = latest.current;
    if (boundary.current !== current.boundary) {
      state.current = advanceNoticeQueue(state.current, { now: Date.now(), enabled: false });
      boundary.current = current.boundary;
    }
    state.current = advanceNoticeQueue(state.current, {
      now: Date.now(), incoming, enabled: current.enabled && visible.current,
      holding: current.holdEnabled && (hovering.current || hasIslandSelection()),
      // A native event precedes React's snapshot commit. Validate it on the following pass.
      isValid: incoming.length ? undefined : current.isValid,
    });
    const next = state.current.active;
    setActive(previous => previous?.id === next?.id && previous?.payload === next?.payload ? previous : next);
  }, []);
  const acceptMessage = useCallback((preview: MessagePreview) => {
    const duration = preview.source === "plugin" ? latest.current.pluginDurationMs ?? 8000 : latest.current.durationMs;
    advance([messageNotice(preview, duration, Date.now())]);
  }, [advance]);
  const acceptDevice = useCallback((notice: DeviceNotice) => advance([deviceNotice(notice)]), [advance]);
  const acceptWireless = useCallback((device: WirelessDevice) => advance([wirelessNotice(device, Date.now())]), [advance]);

  // Revalidate on real source updates, without rerendering the island for the display clock.
  useEffect(() => { advance(); });
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void listenIslandHover(value => { hovering.current = value; advance(); }).then(stop => {
      if (cancelled) stop(); else unlisten = stop;
    }).catch(() => undefined);
    const selection = () => advance();
    document.addEventListener("selectionchange", selection);
    const timer = window.setInterval(() => advance(), 100);
    let checking = false;
    const checkVisibility = async () => {
      if (checking || (visible.current && !state.current.active && !state.current.pending.length)) return;
      checking = true;
      try {
        const next = await isIslandVisible();
        if (!cancelled && typeof next === "boolean") {
          visible.current = next;
          if (!next) hovering.current = false;
          advance();
        }
      } catch { /* Native message events also reject arrivals while tray-hidden. */ }
      finally { checking = false; }
    };
    const visibilityTimer = window.setInterval(() => void checkVisibility(), 500);
    return () => {
      alive.current = false;
      cancelled = true;
      unlisten?.();
      window.clearInterval(timer);
      window.clearInterval(visibilityTimer);
      document.removeEventListener("selectionchange", selection);
    };
  }, [advance]);
  return { active: options.enabled ? active : null, acceptMessage, acceptDevice, acceptWireless };
}
