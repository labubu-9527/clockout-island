import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "../../i18n";
import type { SettingsCategory } from "./categories";
import { SettingsSidebar } from "./SettingsSidebar";
import { useSettingsContentHeight } from "./useSettingsContentHeight";
import { SettingsSearchBox } from "./SettingsSearchBox";
import type { SettingsSearchEntry } from "./settingsSearch";
import "./LayoutEditor.css";

export function LayoutEditor({
  category,
  titleAction,
  children,
  onCategoryChange,
  onContentHeight,
  onSearchNavigate,
  searchTarget,
}: {
  category: SettingsCategory;
  /** Page-wide control shown at the end of the title row. */
  titleAction?: ReactNode;
  children: ReactNode;
  onCategoryChange: (category: SettingsCategory) => void;
  /** Told the height the open page needs without scrolling (the island sizes itself to it). */
  onContentHeight?: (height: number) => void;
  onSearchNavigate?: (entry: SettingsSearchEntry) => void;
  searchTarget?: SettingsSearchEntry | null;
}) {
  const t = useTranslation();
  const layoutRef = useRef<HTMLDivElement>(null);
  useSettingsContentHeight(layoutRef, category, onContentHeight);
  useEffect(() => {
    if (!searchTarget || searchTarget.category !== category) return;
    const layout = layoutRef.current;
    let clearHighlight: number | undefined;
    const timer = window.setTimeout(() => {
      const rows = [...layout?.querySelectorAll<HTMLElement>(".settings-row, .settings-section, .settings-group__header") ?? []];
      const target = rows.find(row => row.textContent?.includes(searchTarget.text));
      if (!target) return;
      const tab = target.closest<HTMLElement>("[data-settings-tab]")?.dataset.settingsTab;
      if (tab) layout?.querySelector<HTMLButtonElement>(`[data-appearance-tab="${tab}"]`)?.click();
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.classList.add("settings-row--found", "settings-search-target");
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      clearHighlight = window.setTimeout(() => target.classList.remove("settings-search-target", "settings-row--found"), 2200);
    }, 80);
    return () => { window.clearTimeout(timer); window.clearTimeout(clearHighlight); layout?.querySelectorAll(".settings-search-target").forEach(row => row.classList.remove("settings-search-target", "settings-row--found")); };
  }, [category, searchTarget]);
  return (
    <div className="settings-layout" ref={layoutRef}>
      <SettingsSidebar category={category} onCategoryChange={onCategoryChange} search={<SettingsSearchBox onNavigate={onSearchNavigate ?? (entry => onCategoryChange(entry.category))} />} />

      {/* Keyed by page so each page opens scrolled to the top. */}
      <div className="editor-panel" key={category}>
        <div className="settings-page__header">
          <div><h1 className="settings-page__title">{t.settings.categories[category]}</h1><p className="settings-page__description">{category === "appearance" ? t.settings.replica.appearanceDescription : category === "general" ? t.settings.replica.generalDescription : t.settings.categories[category]}</p></div>
          {titleAction}
        </div>
        {children}
      </div>
    </div>
  );
}
