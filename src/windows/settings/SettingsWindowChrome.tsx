import { X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { closeSettingsWindow, startSettingsWindowDrag } from "./api";
import "./SettingsWindowChrome.css";

/** The drag surface sits above the content, so a control can never start a window drag. */
export function SettingsWindowChrome() {
  const t = useTranslation();
  return (
    <div className="settings-window-chrome" onPointerDown={event => {
      if (event.button !== 0 || event.target !== event.currentTarget) return;
      void startSettingsWindowDrag().catch(error => console.error("Failed to drag settings window", error));
    }}>
      <button className="settings-window-chrome__close" type="button" aria-label={t.common.close}
        onClick={() => void closeSettingsWindow().catch(error => console.error("Failed to close settings window", error))}>
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
