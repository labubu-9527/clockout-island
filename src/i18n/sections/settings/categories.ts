export type SettingsCategoriesText = {
  label: string;
  groups: {
    basics: string;
    features: string;
    agents: string;
  };
  general: string;
  appearance: string;
  shortcuts: string;
  /** QQ, WeChat and Mail on one page. */
  messages: string;
  /** Mail's group on the Messages page. */
  mail: string;
  todos: string;
  music: string;
  weather: string;
  clipboard: string;
  translation: string;
  /** The file shelf's group on the Clipboard page. */
  shelf: string;
  /** The AI Agent group's pages. */
  agents: string;
  agentConnect: string;
  plugins: string;
  about: string;
};

export const zhCN: SettingsCategoriesText = {
  label: "设置分类",
  groups: {
    basics: "基础",
    features: "功能",
    agents: "AI Agent",
  },
  general: "通用与窗口",
  appearance: "灵动岛",
  shortcuts: "快捷键",
  messages: "通知与提醒",
  mail: "邮箱",
  todos: "计时与待办",
  music: "音乐与歌词",
  weather: "天气",
  clipboard: "剪贴板与文件",
  translation: "翻译",
  shelf: "文件中转",
  agents: "AI 会话",
  agentConnect: "接入 AI 工具",
  plugins: "插件",
  about: "关于与更新",
};

export const en: SettingsCategoriesText = {
  label: "Settings categories",
  groups: {
    basics: "Basics",
    features: "Features",
    agents: "AI Agent",
  },
  general: "General & windows",
  appearance: "Island",
  shortcuts: "Shortcuts",
  messages: "Notifications",
  mail: "Mail",
  todos: "Timers & todos",
  music: "Music & lyrics",
  weather: "Weather",
  clipboard: "Clipboard & files",
  translation: "Translation",
  shelf: "File shelf",
  agents: "AI sessions",
  agentConnect: "Connect AI tools",
  plugins: "Plugins",
  about: "About & updates",
};
