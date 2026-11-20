/** Hidden tab panels must not replace the bottom of the visible content. */
export function settingsContentExtent(children: readonly { bottom: number; visible: boolean }[], paddingBottom: number) {
  return Math.max(0, ...children.filter(child => child.visible).map(child => child.bottom)) + paddingBottom;
}
