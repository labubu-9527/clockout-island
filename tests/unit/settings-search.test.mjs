import assert from "node:assert/strict";
import test from "node:test";
import { buildSettingsSearchEntries, findSettings } from "../../src/windows/settings/settingsSearch.ts";

test("settings search matches descriptions across categories and keeps navigation targets", () => {
  const entries = buildSettingsSearchEntries({ appearance: { materialTitle: "材质", materialHint: "让桌面透过磨砂玻璃" },
    behavior: { title: "启动", hint: "登录后自动启动" }, appearanceExtra: {},
    layout: { gameTitle: "游戏模式" } }, { appearance: "灵动岛", general: "通用", music: "音乐" });
  const glass = findSettings(entries, "磨砂");
  assert.equal(glass[0].category, "appearance");
  assert.equal(glass[0].tab, "material");
  assert.match(glass[0].text, /磨砂玻璃/);
  assert.equal(findSettings(entries, "登录")[0].category, "general");
  assert.equal(findSettings(entries, "游戏模式")[0].category, "general");
});

test("translation paths route material choices, game settings and module switches to their real pages", () => {
  const entries = buildSettingsSearchEntries({ appearance: { frostedGlass: "磨砂玻璃", collapsedIsland: { layout: { title: "岛上的排列" } } },
    layout: { gameQuiet: "全屏时免打扰", opacity: "不透明度" }, modules: { music: "启用音乐控制", agents: "启用AI", clipboard: "启用剪贴板" },
    expand: { tuckStyle: "贴边样式", autoCollapse: "展开后自动收起" } }, {});
  const target = query => findSettings(entries, query)[0];
  assert.equal(target("磨砂玻璃").tab, "material");
  assert.equal(target("排列").tab, "layout");
  assert.equal(target("免打扰").category, "general");
  assert.equal(target("不透明度").tab, "material");
  assert.equal(target("启用音乐").category, "music");
  assert.equal(target("启用AI").category, "agents");
  assert.equal(target("贴边样式").tab, "interaction");
  assert.equal(target("自动收起").category, "general");
});

test("search ignores whitespace, ranks exact labels and handles empty input", () => {
  const entries = [{ id: "a", category: "music", text: "Online lyrics", title: "Online lyrics", path: "Music" },
    { id: "b", category: "general", text: "Lyrics timing online", title: "Lyrics timing online", path: "General" }];
  assert.equal(findSettings(entries, " ONLINE   LYRICS ")[0].id, "a");
  assert.deepEqual(findSettings(entries, "   "), []);
  assert.deepEqual(findSettings(entries, "unmatched"), []);
});

test("connection hooks, translation shortcuts and file shelf retain their actual settings pages", () => {
  const entries = buildSettingsSearchEntries({ agent: { replyMarker: { toggle: "Enable reply marker" },
    sources: { title: "Agent sources" } }, shortcuts: { openTranslation: "Open translation" },
    fileShelf: { title: "File shelf settings" }, qq: { enabled: "Enable QQ" } }, {});
  const target = query => findSettings(entries, query)[0].category;
  assert.equal(target("Enable reply marker"), "agentConnect");
  assert.equal(target("Agent sources"), "agents");
  assert.equal(target("Open translation"), "translation");
  assert.equal(target("File shelf settings"), "clipboard");
  assert.equal(target("Enable QQ"), "messages");
});
