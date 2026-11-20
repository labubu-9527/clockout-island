import { SettingsChoice } from "../../components/settings/SettingsChoice";
import { SettingsGroup } from "../../components/settings/SettingsGroup";
import { SettingsRow } from "../../components/settings/SettingsRow";
import { SettingsToggleRow } from "../../components/settings/SettingsToggleRow";
import { useTranslation } from "../../i18n";
import { ClockIndicator } from "./ClockIndicator";
import type { ClockFormatSettings, ClockPeriod } from "./formatClock";
import "./ClockSettings.css";

export function ClockSettings<T extends ClockFormatSettings>({ settings, onSettingsChange }: {
  settings: T;
  onSettingsChange: (settings: T) => void;
}) {
  const text = useTranslation().clock;
  return <SettingsGroup title={text.title} footer={text.localTime}>
    <SettingsRow title={text.hourFormat} control={<SettingsChoice
      value={settings.clockHour12 ? "12" : "24"}
      options={[{ value: "12", label: text.hour12 }, { value: "24", label: text.hour24 }]}
      ariaLabel={text.hourFormat}
      onChange={value => onSettingsChange({ ...settings, clockHour12: value === "12" })}
    />} />
    <SettingsRow title={text.period} control={<SettingsChoice<ClockPeriod>
      value={settings.clockPeriod}
      options={[{ value: "none", label: text.periodNone }, { value: "ampm", label: text.periodAmPm }, { value: "detailed", label: text.periodDetailed }]}
      ariaLabel={text.period}
      onChange={clockPeriod => onSettingsChange({ ...settings, clockPeriod })}
    />} />
    <SettingsToggleRow title={text.showSeconds} checked={settings.clockShowSeconds}
      onChange={clockShowSeconds => onSettingsChange({ ...settings, clockShowSeconds })} />
    <SettingsRow title={text.preview} control={<span className="clock-settings__preview">
      <ClockIndicator settings={{ ...settings, clockEnabled: true }} active showTooltip={false} />
    </span>} />
  </SettingsGroup>;
}
