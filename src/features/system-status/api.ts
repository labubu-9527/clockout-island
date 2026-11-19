import { invoke } from "@tauri-apps/api/core";

// 与 src-tauri/src/system/status.rs 中的 SystemStatus 对应（字段由 serde 转成 camelCase）。
export type SystemStatus = {
  /** 0–100；首次采样还没有上一轮基准时为 null。 */
  cpuPercent: number | null;
  /** 0–100，来自 GlobalMemoryStatusEx 的 dwMemoryLoad。 */
  memoryPercent: number;
  updatedAt: number;
};

export function getSystemStatus() {
  return invoke<SystemStatus>("get_system_status");
}
