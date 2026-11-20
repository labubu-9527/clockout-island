import { useLayoutEffect, useRef, type RefObject } from "react";
import { settingsContentExtent } from "./settingsContentHeight";

/**
 * Include every visible direct child: the final tab panel may be hidden.
 */
function contentHeight(element: HTMLElement) {
  const top = element.getBoundingClientRect().top;
  const padding = Number.parseFloat(getComputedStyle(element).paddingBottom) || 0;
  return settingsContentExtent([...element.children].map(child => ({
    bottom: child.getBoundingClientRect().bottom - top + element.scrollTop,
    visible: child.getClientRects().length > 0,
  })), padding);
}

/**
 * Reports the height the settings layout needs to show the open page without scrolling: the
 * taller of the page (title and groups) and the page list. The island sizes its settings page to
 * it (useSettingsPageHeight); the standalone window ignores it. Re-measured whenever the page or
 * the list changes size, e.g. a switch reveals the rows under it.
 */
export function useSettingsContentHeight(
  layoutRef: RefObject<HTMLElement | null>,
  pageKey: string,
  onHeight: ((height: number) => void) | undefined,
) {
  const reported = useRef(0);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout || !onHeight) return;
    const page = layout.querySelector<HTMLElement>(".editor-panel");
    const nav = layout.querySelector<HTMLElement>(".settings-sidebar");
    if (!page || !nav) return;
    const list = nav.querySelector<HTMLElement>(".settings-sidebar__list");
    const measure = () => {
      // The list fills the column it is given, so its own height says nothing; its content does.
      const navStyle = getComputedStyle(nav);
      const navHeight = list ? list.getBoundingClientRect().top - nav.getBoundingClientRect().top + contentHeight(list)
        + (Number.parseFloat(navStyle.paddingBottom) || 0) : contentHeight(nav);
      const layoutStyle = getComputedStyle(layout);
      const height = Math.ceil(Math.max(contentHeight(page), navHeight)
        + (Number.parseFloat(layoutStyle.paddingTop) || 0) + (Number.parseFloat(layoutStyle.paddingBottom) || 0));
      if (height !== reported.current) {
        reported.current = height;
        onHeight(height);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    for (const child of page.children) observer.observe(child);
    for (const child of nav.children) observer.observe(child);
    if (list) for (const child of list.children) observer.observe(child);
    return () => observer.disconnect();
  }, [layoutRef, pageKey, onHeight]);
}
