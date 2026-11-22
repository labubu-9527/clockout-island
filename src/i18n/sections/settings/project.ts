export type SettingsProjectText = {
  title: string;
  appName: string;
  versionChip: (version: string) => string;
  description: string;
  /** The last card of About: resetting every setting, and quitting the island. */
  quit: string;
  quitHint: string;
  quitAction: string;
  /** About: the changelog, built from every version's release notes. */
  changelog: string;
  changelogAll: (count: number) => string;
  changelogLess: string;
  /** Maintainer issue tracker. */
  community: string;
  communityHint: string;
  /** Read out for the red dot on the row until the group is first opened. */
  communityNew: string;
  star: string;
  starHint: string;
  /** The sidebar link to the author's site, under About. */
  author: string;
    openFailed: string;
  /** The todo the island adds when a new version is found, and its button. */
  update: {
    downloadingUnknown: string;
    updateTodo: string;
    updateNow: string;
    availableHint: string;
    updateDownloading: (percent: number) => string;
    installing: string;
    /** The row while a failed install waits to be retried. */
    failedRetry: string;
  };
  /** About → the updates group: the automatic-update switch, the status, and checking by hand. */
  autoUpdate: {
    title: string;
    hint: string;
    status: string;
    check: string;
    installNow: string;
    readyTitle: (version: string) => string;
    readyHint: string;
    idle: string;
    checking: string;
    latest: string;
    available: (version: string) => string;
    downloading: (version: string, percent: number | null) => string;
    ready: (version: string) => string;
    installing: string;
    done: string;
    error: (reason: string) => string;
    disabled: string;
    /** The beta row: try a beta, or (running one) go back to the latest stable release. */
    beta: string;
    betaHint: string;
    betaTry: string;
    noBeta: string;
    betaRunning: (version: string) => string;
    restoreHint: string;
    restore: string;
    restoreLatest: string;
  };
};

export const zhCN: SettingsProjectText = {
  title: "关于小岛",
  appName: "岛点下班",
  versionChip: (version) => `v${version}`,
  description: "由 labubu-9527 维护，集中待办、音乐、AI 状态和消息提醒。",
  quit: "退出岛屿",
  quitHint: "和托盘菜单里的「退出」一样；要再打开，从开始菜单或桌面快捷方式启动。",
  quitAction: "退出",
  changelog: "更新日志",
  changelogAll: (count) => `显示全部 ${count} 个版本`,
  changelogLess: "只看最近几个版本",
  community: "反馈问题与建议",
  communityHint: "前往 labubu-9527/clockout-island 的 GitHub Issues",
  communityNew: "新",
  star: "觉得小岛还不错？",
  starHint: "去 GitHub 给小岛一颗 Star",
  author: "关于作者",
  openFailed: "暂时没能打开浏览器，请再试一次。",
  update: {
    downloadingUnknown: "正在下载…",
    updateTodo: "检测到新版本",
    updateNow: "更新",
    availableHint: "有新版本",
    updateDownloading: (percent) => `下载 ${percent}%`,
    installing: "正在安装，小岛会自动重启",
    failedRetry: "更新失败，点击重试",
  },
  autoUpdate: {
    title: "自动更新",
    hint: "每 3 小时检查一次，后台下载；小岛收起且 1 分钟没人碰时自动安装并重启，有红点提示。关闭后只在这里手动检查。",
    status: "检查更新",
    check: "检查更新",
    installNow: "立即安装",
    readyTitle: (version) => `v${version} 已下载`,
    readyHint: "安装时小岛会关闭，装完自动重新打开。",
    idle: "还没有检查过",
    checking: "正在检查…",
    latest: "已是最新版本",
    available: (version) => `发现新版本 v${version}`,
    downloading: (version, percent) => percent === null ? `正在下载 v${version}…` : `正在下载 v${version}… ${percent}%`,
    ready: (version) => `v${version} 已下载，可以安装`,
    installing: "正在安装，小岛会自动重启",
    done: "安装程序已启动",
    error: (reason) => `出错了：${reason}`,
    disabled: "这个版本不能应用内更新",
    beta: "测试版",
    betaHint: "提前体验还在测试的新功能，可能不够稳定；随时可以还原到正式版。",
    betaTry: "下载测试版",
    noBeta: "暂时没有比当前更新的测试版",
    betaRunning: (version) => `正在使用测试版 v${version}`,
    restoreHint: "会继续收到新的测试版；想回去时，还原到正式版的最新版本。",
    restore: "还原到正式版",
    restoreLatest: "已是正式版的最新版本",
  },
};

export const en: SettingsProjectText = {
  title: "About the island",
  appName: "Clockout-island",
  versionChip: (version) => `v${version}`,
  description: "Clockout-island, maintained by labubu-9527, with todos, music, AI status and notifications.",
  quit: "Quit the island",
  quitHint: "Same as Quit in the tray menu; start it again from the Start menu or a desktop shortcut.",
  quitAction: "Quit",
  changelog: "Changelog",
  changelogAll: (count) => `Show all ${count} versions`,
  changelogLess: "Show recent versions only",
  community: "Report issues and suggestions",
  communityHint: "Open GitHub Issues in labubu-9527/clockout-island",
  communityNew: "New",
  star: "Enjoying your little island?",
  starHint: "Give it a Star on GitHub",
  author: "About the author",
  openFailed: "Couldn't open your browser. Please try again.",
  update: {
    downloadingUnknown: "Downloading…",
    updateTodo: "New version available",
    updateNow: "Update",
    availableHint: "Update available",
    updateDownloading: (percent) => `Downloading ${percent}%`,
    installing: "Installing — the island will restart itself",
    failedRetry: "Update failed — click to retry",
  },
  autoUpdate: {
    title: "Automatic updates",
    hint: "Checks every 3 hours and downloads in the background; installs and restarts once the island is collapsed and untouched for 1 minute, with a red dot in the meantime. When off, check here by hand.",
    status: "Check for updates",
    check: "Check now",
    installNow: "Install now",
    readyTitle: (version) => `v${version} downloaded`,
    readyHint: "The island closes while installing and reopens afterwards.",
    idle: "Not checked yet",
    checking: "Checking…",
    latest: "You're up to date",
    available: (version) => `New version v${version} found`,
    downloading: (version, percent) => percent === null ? `Downloading v${version}…` : `Downloading v${version}… ${percent}%`,
    ready: (version) => `v${version} is downloaded and ready to install`,
    installing: "Installing — the island will restart itself",
    done: "The installer has started",
    error: (reason) => `Something went wrong: ${reason}`,
    disabled: "This build can't update itself",
    beta: "Beta",
    betaHint: "Try new features before they ship; they may be less stable. You can go back to the stable release any time.",
    betaTry: "Get the beta",
    noBeta: "There's no beta newer than this version",
    betaRunning: (version) => `Running beta v${version}`,
    restoreHint: "New betas keep coming; go back to the latest stable release whenever you like.",
    restore: "Back to stable",
    restoreLatest: "Already on the latest stable release",
  },
};
