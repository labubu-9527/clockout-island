import { useEffect, useRef, useState } from "react";
import { getSystemStatus, type SystemStatus } from "./api";
import { isIslandMoving } from "../../lib/islandMotion";

const EMPTY_STATUS: SystemStatus = { cpuPercent: null, memoryPercent: 0, updatedAt: 0 };
/** 常驻应用保持低频；与 useAudioLevel 的 500ms 电平轮询错开，避免同一帧多次重渲染。 */
const POLL_INTERVAL_MS = 2000;

/** Polls CPU and memory usage while the island is collapsed; keeps the last reading when disabled. */
export function useSystemStatus(enabled: boolean): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>(EMPTY_STATUS);
  const isRefreshing = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let didCancel = false;

    const refresh = async () => {
      if (didCancel || isRefreshing.current) return;
      isRefreshing.current = true;
      try {
        const next = await getSystemStatus();
        if (didCancel || !next || typeof next.memoryPercent !== "number") return;
        // 数值没变就不触发渲染：展开/收起动画期间重渲染会卡顿。
        setStatus((current) =>
          current.cpuPercent === next.cpuPercent && current.memoryPercent === next.memoryPercent
            ? current
            : next,
        );
      } catch (error) {
        console.error("Failed to read system status", error);
      } finally {
        isRefreshing.current = false;
      }
    };

    if (!isIslandMoving()) void refresh();
    const timer = window.setInterval(() => {
      if (!isIslandMoving()) void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      didCancel = true;
      window.clearInterval(timer);
    };
  }, [enabled]);

  return status;
}
