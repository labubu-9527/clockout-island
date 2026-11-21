export interface WirelessDevice {
  id: string;
  name: string;
  kind: string;
  batteryPercent: number | null;
  updatedAt: number;
}

export function wirelessAlerts(devices: WirelessDevice[], levels: Map<string, number>): WirelessDevice[] {
  return devices.filter(({ id, batteryPercent }) => {
    if (batteryPercent === null) return false;
    if (batteryPercent >= 30) levels.delete(id);
    const threshold = batteryPercent <= 10 ? 10 : batteryPercent <= 20 ? 20 : null;
    if (threshold === null || threshold >= (levels.get(id) ?? 100)) return false;
    levels.set(id, threshold);
    return true;
  });
}
