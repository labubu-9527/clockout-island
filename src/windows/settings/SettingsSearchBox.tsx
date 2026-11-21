import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "../../i18n";
import { buildSettingsSearchEntries, findSettings, type SettingsSearchEntry } from "./settingsSearch";
import "./SettingsSearchBox.css";

export function SettingsSearchBox({ onNavigate }: { onNavigate: (entry: SettingsSearchEntry) => void }) {
  const t = useTranslation();
  const text = t.settings.replica;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const entries = useMemo(() => buildSettingsSearchEntries({ ...t.settings, weather: t.weather, clock: t.clock, deviceNotices: t.deviceNotices,
    wireless: t.wireless, musicCanvas: t.music.canvas, musicModules: t.music.modules,
    mail: t.mail, wechat: t.wechat, qq: t.qq }, t.settings.categories), [t]);
  const results = findSettings(entries, query);
  const choose = (entry: SettingsSearchEntry) => { onNavigate(entry); setOpen(false); };
  return <div className="settings-search" ref={container}>
    <div className="settings-search__field">
      <Search size={16} aria-hidden="true" />
      <input type="search" role="combobox" aria-label={text.search} placeholder={text.search} value={query}
        aria-expanded={open && Boolean(query.trim())} aria-controls="settings-search-results"
        aria-activedescendant={open && results[selected] ? `settings-search-${selected}` : undefined}
        onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setSelected(0); setOpen(true); }}
        onKeyDown={event => {
          if (event.key === "Escape") { setQuery(""); setOpen(false); }
          if (event.key === "ArrowDown") { event.preventDefault(); setSelected(index => Math.min(index + 1, results.length - 1)); setOpen(true); }
          if (event.key === "ArrowUp") { event.preventDefault(); setSelected(index => Math.max(index - 1, 0)); }
          if (event.key === "Enter" && results[selected]) { event.preventDefault(); choose(results[selected]); }
        }} />
      {query && <button type="button" aria-label={text.clearSearch} onClick={() => { setQuery(""); setOpen(false); }}><X size={13} /></button>}
    </div>
    {open && query.trim() && <div className="settings-search__results" id="settings-search-results" role="listbox" aria-label={text.searchResults}>
      {results.length ? results.map((entry, i) => <button key={entry.id} id={`settings-search-${i}`} type="button" role="option"
        aria-selected={i === selected} onMouseEnter={() => setSelected(i)} onClick={() => choose(entry)}>
        <span>{entry.title}</span><small>{entry.path}{entry.tab ? ` / ${text.tabs[entry.tab]}` : ""}</small>
      </button>) : <p role="status">{text.noResults}</p>}
    </div>}
  </div>;
}
