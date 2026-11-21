# 架构总览

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 架构总览 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-21 |
| 版本号 | v1.5.0 |

手势、无线电量和画布（2026-11-21）：`windows/island/swipeUpToHide.ts`为纯状态机，`useWindowDragGesture`分流上推与原生拖动，通过已有monitor API换算上沿；隐藏复用navigation。`features/wireless`拥有类型化IPC、独立开关和按可见性轮询的快照；原生`wireless`管理单工作线程/超时/缓存，`win32/wireless`封装PnP属性，`wireless/scan`处理经典/BLE枚举和标准电量读取，资源作用域释放。窗口层`useIslandWirelessNotices`做低电量去重和队列投递，新增无线页和可排序徽章。

音乐`MusicCanvasEditor`在设置页编辑位置，`appearance/musicCustomLayout`归一化可选坐标，`musicModuleGeometry`同时提供模块行和15个元素矩形；真实播放器通过`placeMusicElement`复用相同坐标，工具栏保留真实控制能力并约束音量弹层。设置搜索纳入无线、模块和画布文案。

音乐模块自定义（2026-11-21）：`appearance/musicCustomLayout.ts`定义版本化配置、规范化与排序；`media/MusicModuleSettings`提供开关和无障碍排序，`musicModuleGeometry.ts`计算可见模块高度，`MusicCustomLayout`组合现有歌词、进度和工具栏。窗口层`useMusicContentHeight`接收实际内容高度，`expandedHeight`加导航及边距并遵守原生220px下限；关闭或卸载自定义布局时清除临时高度。

音乐布局与提醒（2026-11-21）：`appearance/musicLayout.ts`定义可保存的五布局与归一化，通过`appearance/index.ts`公开；`media/musicLayouts.ts`与`MusicLayouts.css`适配参考几何，设置页、播放器和展开高度共用选项。`todos/quickReminder.ts`只解析明确时间前缀，`QuickReminderPreview`显示预览，`useTodoReminders`独立轮询投递，`useScheduledTodos`按时间把计划移到今日；现有`useIslandTodos`拥有是否静默/隐藏与声音、开页决策，提醒字段沿用现有JSON保存链路。

DotIsle 界面复刻（2026-11-20）：设置窗口由`SettingsWindowChrome`提供自绘窗口控制，`LayoutEditor`组合导航、真实设置搜索与分类内容；`settingsSearch.ts`负责跨页/标签检索，`settingsContentHeight.ts`计算可见内容高度。`features/appearance/islandEffects.ts`集中光效配置归一化、优先级及动效计算，`MotionCurveEditor`编辑并预览曲线；岛壳通过`islandMotionStyle`接入实际时长与时序，叶子组件`IslandGlow`独立更新光层与输出音量采样。音乐次要操作集中于`MusicPlayerToolbar`，复用media/api既有原生命令。

形状与消息入口（2026-11-19）：appearance 归一化保存形状和可见性映射，messages/messageRailItems.ts 根据已启用来源、可见性与未处理状态生成固定顺序入口，MessageRail 渲染收起横排或展开侧栏。窗口层组合现有消息控制器，不新增消息服务。原生 island 状态兼容接收形状和侧栏数量，几何层负责胶囊偏移、侧栏边界，passthrough 只让实际圆角区域接收点击。

天气（2026-11-19）：`features/weather/` 包含类型化 IPC、城市与预报校验、localStorage 配置/缓存、请求 hook、完整设置页、展开面板和收起徽章。IslandApp 的天气面板与徽章共用控制器，设置页持有独立预览控制器，窗口层组合导航与页面。Rust `weather/mod.rs` 提供固定 Open-Meteo 请求、超时/限额和 DTO 校验，`weather/qweather.rs` 提供和风租户校验、凭据访问与统一 DTO 适配，测试在 weather/tests.rs；不新增窗口。CPU 与内存继续共用 system-status 和 get_system_status，只拆分配置、排列及显示，旧 system 槽位在归一化时迁移。存储见 [data-storage.md](data-storage.md)，契约见 [contracts.md](contracts.md)。

自动天气位置由 Rust `weather/location.rs` 处理固定服务请求与直连/代理回退，纯解析和顺序测试在 `weather/location/tests.rs`。原生侧不保存定位信息；前端负责三小时缓存、手动/自动模式和过期请求处理。消息栏悬停与点击区域在 `island/passthrough.rs` 分开计算，悬停事件覆盖连接走廊，点击穿透仍按真实外形。

时间与岛仔：`features/clock/` 负责本地时间格式、叶子定时刷新与通用设置组；`features/island-pet/` 负责状态优先级、参考原始表情序列与矢量姿态动画。窗口层组合现有业务状态并传入组件，IslandShell / IslandCollapsedBar 只接收插槽；岛仔固定替代前导状态圆点，旧排序项兼容保留但不重复渲染。不可见时停止时间更新与表情动画，不增加原生监听。

本文描述 FocuSD Island 的运行时架构、目标代码结构、从现有文件到目标位置的迁移映射，以及对外契约清单。编码规则见 [AGENTS.md](../../AGENTS.md)、[src/AGENTS.md](../../src/AGENTS.md) 和 [src-tauri/AGENTS.md](../../src-tauri/AGENTS.md)，迁移步骤见 [refactor-plan.md](refactor-plan.md)，插件 API v1 架构见 [plugins.md](plugins.md)（进程树清理由 `win32/process_job.rs` 封装）。

系统状态提醒（2026-11-20）：`features/device-notices/` 封装类型化快照、独立偏好、变化差分与两秒提示；`useIslandDeviceNotice` 在窗口层组合优先级、内容插槽与临时尺寸。Rust `system/device_status.rs` 提供采样与监听启停命令，Windows 键盘观察、麦克风只读 COM 查询及受支持触控板检测封装在 `win32/`；不新增窗口，不改变 CPU/MEM 数据链路。

## 运行时架构

```text
┌──────────────────────── WebView2（同一前端包，按 ?window= 分发）────────────────────────┐
│  main：悬浮岛            translation：快捷翻译            settings：设置（按需创建）       │
└────────────┬─────────────────────────────────────────────────────────────────────────┘
             │ invoke（命令，请求/响应）        ▲ emit / emit_to（事件，后端主动推送）
             ▼                                │
┌──────────────────────────────── Rust（Tauri 2）──────────────────────────────────────┐
│  lib.rs 组装：插件 / setup / 托盘 / generate_handler!                                  │
│  领域模块：island · agent_status · system · clipboard_history · file_shelf · media_control │
│           mail · qq_notifications · wechat_reminders · translation · settings_window │
│  后台服务：IMAP IDLE 收信、剪贴板监听、通知监听、微信提醒与摘要、鼠标穿透循环          │
└────────────┬─────────────────────────────────────────────────────────────────────────┘
             ▼
   Windows：Win32 / WinRT（SMTC 媒体、音频端点、通知监听、注册表、窗口）、凭据管理器
```

各项数据存在哪里见 [data-storage.md](data-storage.md)。

根目录 `release-features.json` 是前端与 Rust 的发布功能开关单一来源：`plugins`、`mailOtp`、`pluginMarket` 当前均关闭。`pluginMarket` 只在前端生效：关闭时插件页不显示内置插件市场（钉钉 / 飞书 / 企业微信、Cursor / Kimi Code / Hermes / Z Code），`useNativePlugins` 一律报告未安装，测试版存下的安装记录保留不读；正式版关、测试版开（2026-11-19 起）。前端通过 `features/releaseFlags.ts` 读取，`src-tauri/build.rs` 将同一配置转为编译期 cfg，由 `release_flags.rs` 导出常量。关闭时保留旧数据与 IPC 契约，插件宿主不启动进程、请求索引或修改配置，邮箱同步不提取验证码或为此请求正文，复制入口也不运行。每项仅改 JSON 中对应的一个值并重新构建即可恢复。回归运行器分别启动正式配置和开启保留功能的 Vite 测试实例；测试覆盖不通过生产运行时开关实现。

Codex 的会话展示仍由 `agent_status/session_scan.rs` 读取 rollout 尾部；`codex_activity.rs` 在内存中增量保存完整文件的 turn 边界、用户提示时间和最后完成时间，避免长上下文把开始记录挤出尾部。按文件修改时间扫描所有日期目录，兼容旧目录中恢复的会话。前端 `features/agent-status/completion.ts` 统一判定显式完成时间变化，供弹出与声音使用。无新增持久化文件。实测与限制见 [Codex 会话排查记录](../investigations/codex-thinking-sessions-2026-11-15.md)。

Agent 的 DSH 桌面端来源由 `agent_status/dsh_sessions.rs`（只读本地检查点、合并去重、宿主聚焦）、dsh_desktop.rs（官方与社区宿主识别、目录发现）、`dsh_credentials.rs`（受限凭据读取）和 `dsh_usage.rs`（官方余额只读查询与内存缓存）承担；从现有会话命令和聚焦命令接入，余额有独立的 `get_dsh_usage` 命令。前端仍在 `features/agent-status/`，余额展示在 `DshQuotaRing.tsx`，纯逻辑在 `dshUsage.ts`。详见 [DSH 接入说明](../deepseek-harness.md)。

WorkBuddy 桌面端会话由 `agent_status/workbuddy_sessions.rs` 只读解析（本地会话记录与打开中的会话登记，聚焦主窗口），从现有会话命令和聚焦命令接入。WorkBuddy 的 `agent_status/workbuddy_connection.rs` 管理专用 WebView2 官网登录和刷新，`workbuddy_usage.rs` 读取积分汇总。远程登录窗口 `workbuddy-sign-in` 使用独立浏览器配置，由本地设置页启动。岛屿和设置页共享原生余额缓存，额度环按 `agentQuotaSources` 选择。

微信的进程解析、窗口归属和主窗口选择统一在 `wechat_reminders/source.rs`，供打开动作、提醒监听、摘要读取和探测程序复用；需比较完整路径时使用 `win32/process.rs` 的 canonicalize 与归一化回退。微信摘要开启时，微信提醒服务通过 `win32/caption_close.rs` 将微信关闭按钮的点击转为最小化，通过 `win32/taskbar.rs` 控制最小化窗口的任务栏按钮。

## 目标结构

前端和 Rust 的目标目录树，以及各目录的职责，分别见 [src/AGENTS.md](../../src/AGENTS.md#目标结构) 和 [src-tauri/AGENTS.md](../../src-tauri/AGENTS.md#目标结构)。本文只记录迁移映射。

外观颜色逻辑位于 `features/appearance/`：`HexColorInput` / `hexColor.ts` 处理输入，`colorPalette.ts` 校验三色，`colorRefresh.ts` 编排一次性刷新，`colorPresets.ts` 处理预设去重与上限，`ColorPresetRow` 呈现芯片；所有备份、迁移标记和预设读写仍收口在同目录 `storage.ts`，复用 `lib/storage.ts` 的安全读写。

### 前端依赖方向

```text
main.tsx → windows/ → features/ → components/、lib/、utils/、i18n/、styles/
```

## 其他文档

- [data-storage.md](data-storage.md)：每项数据存在哪里、由哪个模块负责
- [contracts.md](contracts.md)：对外契约清单（localStorage key、事件、命令与文件格式）
- [migration-map.md](migration-map.md)：结构重构时旧文件到新位置的对照

## 媒体诊断与本地校准

歌词源位于 `lyrics/`：QQ 专属接口与 QRC 解密（`qqmusic.rs` / `qrc_cipher.rs`）、酷狗原生缓存（`kugou_cache.rs`）、汽水只读 LMDB 快照和 msgpackr 解码（`soda_cache.rs` / `soda_lmdb.rs` / `soda_msgpack.rs`）、网易 YRC 与共享逐字格式转换（`word_formats.rs`），统一输出增强 LRC。来源顺序、兼容缓存与限制见 [歌词源说明](../lyrics-sources.md)。

`media_control/diagnostics.rs` 只读枚举 SMTC 会话及已知播放器进程，复用 `timeline.rs` 的可信时间戳判断和 `win32/process*.rs` 的安全进程查询，文件版本读取封装在 `win32/file_version.rs`。前端 `useMediaDiagnostics.ts` 按打开面板、切换播放器与媒体事件触发五秒节流刷新，独立于媒体轮询；`MediaDiagnosticsCard` 和 `MediaCompatibilitySection` 分别显示面板提示及设置行。无时间线的歌词点击通过 `useMediaState.calibrate` 校准 `trackClock`，不改变播放器状态与 `positionAnchor`。
- `src-tauri/src/media_plugins/`：网易云精准进度插件的只读探测、固定版本下载校验、显式安装 / 卸载与安装记录；受限提权调用封装在 `win32/media_plugin_elevation.rs`，注册表探测封装在 `win32/media_plugin_registry.rs`。
