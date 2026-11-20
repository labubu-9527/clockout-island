export type SettingsEffectsText = {
  title: string; music: string; musicHint: string; timer: string; timerHint: string; update: string; updateHint: string;
  musicMode: string; breath: string; rhythm: string; footer: string; motionTitle: string; mode: string;
  curve: string; spring: string; expandDuration: string; collapseDuration: string; mass: string; stiffness: string;
  damping: string; preview: string; reset: string; handle: (n: number) => string; curveHint: string;
  pillCorner: string;
};
export const zhCN: SettingsEffectsText = {
  title: "岛周围的光效", music: "音乐光晕", musicHint: "随音乐呼吸或跟随播放时的输出强弱律动，默认关闭。",
  timer: "计时运行光晕", timerHint: "计时运行时柔和呼吸，结束后收敛。", update: "更新彩虹流光",
  updateHint: "下载或安装更新时沿轮廓流动，完成后淡出。", musicMode: "音乐光晕方式", breath: "柔和呼吸", rhythm: "音乐律动",
  footer: "光效跟随岛体轮廓；贴边隐藏时不显示。减少动态效果时保留静态柔光。",
  motionTitle: "动效曲线与弹簧", mode: "动画方式", curve: "动效曲线", spring: "弹簧", expandDuration: "展开时长",
  collapseDuration: "收起时长", mass: "弹簧质量", stiffness: "弹簧刚度", damping: "弹簧阻尼", preview: "预览动画",
  reset: "恢复默认动效", handle: n => `曲线控制点 ${n}`, curveHint: "拖动控制点调整曲线；选中控制点后可用方向键微调。",
  pillCorner: "胶囊圆角",
};
export const en: SettingsEffectsText = {
  title: "Light around the island", music: "Music glow", musicHint: "Breathe with music or respond to the output level. Off by default.",
  timer: "Running timer glow", timerHint: "A soft breath while a timer runs; fades when it ends.", update: "Rainbow update light",
  updateHint: "Travels around the outline while downloading or installing, then fades.", musicMode: "Music glow style", breath: "Soft breathing", rhythm: "Audio rhythm",
  footer: "Glow follows the island outline and hides when tucked. Reduced motion keeps a static glow.",
  motionTitle: "Motion curve and spring", mode: "Animation style", curve: "Motion curve", spring: "Spring", expandDuration: "Opening duration",
  collapseDuration: "Closing duration", mass: "Spring mass", stiffness: "Spring stiffness", damping: "Spring damping", preview: "Preview animation",
  reset: "Reset motion", handle: n => `Curve control point ${n}`, curveHint: "Drag the control points, or focus a point and adjust it with arrow keys.",
  pillCorner: "Capsule corner radius",
};
