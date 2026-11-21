import type { SettingsCategory } from "./categories";

export const APPEARANCE_TABS = ["size", "material", "interaction", "motion", "layout"] as const;
export type AppearanceTab = typeof APPEARANCE_TABS[number];
export type SettingsSearchEntry = { id: string; category: SettingsCategory; tab?: AppearanceTab; title: string; text: string; path: string };

const ROOT_CATEGORIES: Record<string, SettingsCategory> = {
  behavior: "general", keepVisible: "general", position: "general", expand: "general", language: "general", shortcuts: "translation",
  appearance: "appearance", colors: "appearance", appearancePresets: "appearance", layout: "general", modules: "general",
  effects: "appearance", replica: "appearance", resetAppearance: "appearance", messageSources: "messages", todo: "todos", save: "todos",
  lyrics: "music", musicSources: "music", diagnostics: "music", clipboard: "clipboard", fileShelf: "clipboard",
  translation: "translation", agent: "agents", sounds: "agents", plugins: "plugins", project: "about",
  weather: "weather", deviceNotices: "appearance", clock: "general", mail: "messages", wechat: "messages", qq: "messages",
  wireless: "general", musicCanvas: "music", musicModules: "music",
};
const MODULE_CATEGORIES: Record<string, SettingsCategory> = { todo: "todos", music: "music", agents: "agents", mail: "messages", shelf: "clipboard", translation: "translation", clipboard: "clipboard", hint: "music" };
function appearanceTab(root: string, path: string): AppearanceTab {
  if (root === "effects" || /effects|glow|motion|spring/i.test(path)) return "motion";
  if (root === "deviceNotices") return "interaction";
  if (/collapsedIsland\.layout|pageButtons|capsules|icons/.test(path)) return "layout";
  if (root === "colors" || root === "appearancePresets" || root === "layout" || /theme|material|opacity|scheme|color|islandShape|classic|liquidGlass|frostedGlass|glassStrength|glassBlur|notch|pill/i.test(path)) return "material";
  if (root === "expand" || /collapsedIsland/.test(path)) return "interaction";
  if (/tuck|priority|notice/i.test(path)) return "interaction";
  return "size";
}
function categoryFor(root: string, path: string): SettingsCategory | undefined {
  const field = path.split(".").filter(Boolean)[0];
  if (root === "modules") return MODULE_CATEGORIES[field];
  if (root === "agent" && ["title", "install", "installing", "installed", "currentStatus", "clearing", "clearStatus", "scriptsDir", "replyMarker", "hooksOutdated", "hooksMissing"].includes(field)) return "agentConnect";
  if (root === "layout" && field === "opacity") return "appearance";
  if (root === "expand" && ["tuckStyle", "tuckStyles", "tuckEdgeHeight"].includes(field)) return "appearance";
  return ROOT_CATEGORIES[root];
}

/** Index translated labels and explanations, so search covers controls beyond the current page. */
export function buildSettingsSearchEntries(settings: Record<string, unknown>, labels: Partial<Record<SettingsCategory, string>>): SettingsSearchEntry[] {
  const entries: SettingsSearchEntry[] = [];
  const visit = (value: unknown, root: string, path: string) => {
    if (typeof value === "string" && value.trim().length > 1) {
      const category = categoryFor(root, path);
      if (!category || root === "replica" || root === "resetAppearance") return;
      const tab = category === "appearance" ? appearanceTab(root, path) : undefined;
      entries.push({ id: `${root}.${path}`, category, tab, title: value, text: value, path: labels[category] ?? category });
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, root, `${path}.${key}`);
    }
  };
  for (const [key, value] of Object.entries(settings)) visit(value, key, "");
  return entries.filter((entry, i) => entries.findIndex(other => other.category === entry.category && other.tab === entry.tab && other.text === entry.text) === i);
}

export function findSettings(entries: readonly SettingsSearchEntry[], query: string): SettingsSearchEntry[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return entries.filter(entry => words.every(word => `${entry.title} ${entry.text} ${entry.path}`.toLocaleLowerCase().includes(word)))
    .sort((a, b) => Number(b.title.toLocaleLowerCase() === words.join(" ")) - Number(a.title.toLocaleLowerCase() === words.join(" ")))
    .slice(0, 24);
}
