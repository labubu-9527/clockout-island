import { useEffect, useRef, useState } from "react";
import { usePlugins, type PluginNotification } from "../plugins";
import type { MessageNoticeReceiver, MessagePreview } from "./messagePreview";

export type OwnedNotification = PluginNotification & { pluginId: string };
function notificationVersion(item: OwnedNotification): string {
  return JSON.stringify([item.pluginId, item.id, item.title, item.body, item.appName, item.receivedAt]);
}
export function usePluginNotifications(): OwnedNotification[] {
  const snapshot = usePlugins();
  return Object.entries(snapshot.live).flatMap(([id, live]) => snapshot.registry.installed[id]?.enabled && live.status === "running" ? live.notifications.map((n) => ({ ...n, pluginId: id })) : []).sort((a, b) => b.receivedAt - a.receivedAt);
}
export function usePluginPreview(enabled: boolean, seconds = 8, onNotice?: MessageNoticeReceiver): MessagePreview | null {
  const notifications = usePluginNotifications();
  const newest = notifications[0];
  const seen = useRef<Set<string> | null>(null);
  const mountedAt = useRef(Date.now());
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;
  useEffect(() => {
    const keys = notifications.map(notificationVersion);
    if (seen.current === null) { seen.current = new Set(keys); return; }
    for (const item of [...notifications].sort((a, b) => a.receivedAt - b.receivedAt)) {
      const key = notificationVersion(item);
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      if (enabled && item.receivedAt >= mountedAt.current) onNoticeRef.current?.({ source: "plugin", title: item.title || item.appName, body: item.body,
        receivedAt: item.receivedAt, pluginId: item.pluginId, messageId: item.id });
    }
    // Dropped history must not accumulate for the lifetime of the app.
    seen.current = new Set(keys);
  }, [enabled, notifications]);
  const timestamp = newest?.receivedAt ?? 0;
  const [expired, setExpired] = useState(0);
  useEffect(() => {
    if (timestamp <= 0) return;
    const timer = window.setTimeout(() => setExpired(timestamp), Math.max(0, timestamp + seconds * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [seconds, timestamp]);
  return enabled && newest && timestamp > expired && timestamp > Date.now() - seconds * 1000 ? { source: "plugin", title: newest.title || newest.appName, body: newest.body, receivedAt: timestamp } : null;
}
