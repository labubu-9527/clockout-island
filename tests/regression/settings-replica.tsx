import { act } from "react";
import { createRoot } from "react-dom/client";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import "./settingsMocks";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { SettingsWindow } from "../../src/windows/settings/SettingsWindow";
import { LayoutEditor } from "../../src/windows/settings/LayoutEditor";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
const original = new Map(
  Object.entries(localStorage).filter(([key]) =>
    key.startsWith("focusd-island-"),
  ),
);
window.addEventListener("beforeunload", () => {
  for (const key of Object.keys(localStorage).filter((key) =>
    key.startsWith("focusd-island-"),
  ))
    localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
});
localStorage.setItem(LOCALE_STORAGE_KEY, "zh-CN");
localStorage.setItem(
  "focusd-island-settings",
  JSON.stringify({ colorScheme: "light", islandFontPercent: 100 }),
);
const root = createRoot(document.getElementById("root")!);
const checks: string[] = [];
const check = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
  checks.push(`PASS ${message}`);
};
const click = (selector: string) =>
  act(async () => document.querySelector<HTMLButtonElement>(selector)!.click());
const wait = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
async function search(value: string) {
  await act(async () => {
    const input = document.querySelector<HTMLInputElement>(
      ".settings-search input",
    )!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
try {
  await act(async () =>
    root.render(
      <I18nProvider>
        <SettingsWindow />
      </I18nProvider>,
    ),
  );
  await wait(100);
  check(
    document.querySelector('.settings-search input[role="combobox"]') &&
      document
        .querySelector(".settings-sidebar__brand")
        ?.textContent?.includes("岛点下班"),
    "sidebar includes real search and current product branding",
  );
  await click('[data-category="appearance"]');
  check(
    document.querySelectorAll('.settings-tabs [role="tab"]').length === 5,
    "island settings exposes five reference tabs",
  );
  const scrollPanel = document.querySelector<HTMLElement>(".editor-panel")!;
  check(
    getComputedStyle(scrollPanel).scrollbarWidth === "none" &&
      getComputedStyle(document.querySelector(".settings-sidebar__list")!)
        .scrollbarWidth === "none",
    "settings and navigation hide scrollbar chrome",
  );
  scrollPanel.scrollTop = 80;
  check(
    scrollPanel.scrollTop > 0,
    "settings content remains scrollable without a visible scrollbar",
  );
  await click('[data-appearance-tab="motion"]');
  check(
    document.querySelector("#appearance-panel-motion:not([hidden])") &&
      !document.querySelector("#appearance-panel-size:not([hidden])"),
    "motion tab shows only its own panel",
  );
  await act(async () =>
    document
      .querySelector('[data-appearance-tab="motion"]')!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
      ),
  );
  check(
    document.querySelector(
      '[data-appearance-tab="layout"][aria-selected="true"]',
    ),
    "arrow keys change tab selection and focus",
  );
  await search("磨砂玻璃");
  check(
    document
      .querySelector('[role="listbox"] [role="option"]')
      ?.textContent?.includes("材质与取色"),
    "search finds material values beyond navigation labels with their tab path",
  );
  await act(async () =>
    document
      .querySelector(".settings-search input")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
  );
  await wait(180);
  check(
    document.querySelector(
      '[data-appearance-tab="material"][aria-selected="true"]',
    ) &&
      document
        .querySelector(".settings-search-target")
        ?.textContent?.includes("磨砂玻璃"),
    "search opens the right tab and highlights the actual setting row",
  );
  await search("自动将未完成任务");
  await act(async () =>
    document
      .querySelector(".settings-search input")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
  );
  await wait(180);
  check(
    document.querySelector('[data-category="todos"][aria-current="page"]') &&
      document
        .querySelector(".settings-search-target")
        ?.textContent?.includes("自动将未完成"),
    "search navigates across categories to a real setting",
  );
  await search("全屏时免打扰");
  await act(async () =>
    document
      .querySelector(".settings-search input")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      ),
  );
  await wait(180);
  check(
    document.querySelector('[data-category="general"][aria-current="page"]') &&
      document
        .querySelector(".settings-search-target")
        ?.textContent?.includes("全屏时免打扰"),
    "game settings route to General despite their legacy layout translation key",
  );
  await search("not-a-setting-xyz");
  check(
    document.querySelector('.settings-search__results [role="status"]'),
    "unmatched search gives an explicit empty result",
  );
  await act(async () =>
    document
      .querySelector(".settings-search input")!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
  );
  check(
    document.querySelector<HTMLInputElement>(".settings-search input")!
      .value === "" && !document.querySelector(".settings-search__results"),
    "Escape clears and closes search",
  );
  const layout = document.querySelector<HTMLElement>(".settings-layout")!;
  check(
    layout.scrollWidth <= layout.clientWidth + 1,
    "settings frame does not overflow horizontally",
  );
  await click('[data-category="appearance"]');
  await click('[data-appearance-tab="motion"]');
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;left:-3000px;top:0;width:580px;height:180px;pointer-events:none";
  document.body.append(probe);
  const probeRoot = createRoot(probe);
  let contentHeight = 0;
  await act(async () =>
    probeRoot.render(
      <I18nProvider>
        <LayoutEditor
          category="appearance"
          onCategoryChange={() => {}}
          onContentHeight={(height) => {
            contentHeight = height;
          }}
        >
          <div style={{ height: 700 }}>Visible content</div>
          <div hidden style={{ height: 900 }}>
            Hidden final tab
          </div>
        </LayoutEditor>
      </I18nProvider>,
    ),
  );
  await wait(50);
  check(
    contentHeight >= 700,
    "embedded settings measure the visible content even when the final tab is hidden",
  );
  await act(async () =>
    probeRoot.render(
      <I18nProvider>
        <LayoutEditor
          category="general"
          onCategoryChange={() => {}}
          onContentHeight={(height) => {
            contentHeight = height;
          }}
        >
          <div style={{ height: 1 }} />
        </LayoutEditor>
      </I18nProvider>,
    ),
  );
  await wait(50);
  const nav = probe.querySelector<HTMLElement>(".settings-sidebar")!;
  const list = nav.querySelector<HTMLElement>(".settings-sidebar__list")!;
  const neededNav =
    list.getBoundingClientRect().top -
    nav.getBoundingClientRect().top +
    Math.max(
      ...[...list.children].map(
        (child) =>
          child.getBoundingClientRect().bottom -
          list.getBoundingClientRect().top,
      ),
    );
  check(
    contentHeight >= neededNav,
    "embedded settings height includes sidebar search and branding above the page list",
  );
  await act(async () => probeRoot.unmount());
  probe.remove();
  document.documentElement.dataset.testResult = "passed";
} catch (error) {
  checks.push(`FAIL ${String(error)}`);
  document.documentElement.dataset.testResult = "failed";
}
document.getElementById("results")!.textContent = checks.join("\n");
