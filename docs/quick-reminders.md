# 一句话提醒 / Quick reminders

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 一句话提醒使用与兼容规则 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-21 |
| 版本号 | v1.0.0 |

在今日待办的输入框写下明确的时间前缀，检查下方预览后按 Enter。提醒语法中的时间优先于右侧日期选择；保存后日期恢复为今天。普通任务沿用原来的日期选择与保存方式。

| 输入 | 含义 |
| --- | --- |
| `20分钟后取快递` / `in 20 minutes collect parcel` | 20 分钟后提醒 |
| `2小时后备份` / `in 2 hours back up` | 2 小时后提醒 |
| `今天18:30下班` / `today 18:30 clock out` | 今天的本地时刻 |
| `明天9:00交稿` / `tomorrow 9:00 submit draft` | 明天的本地时刻 |
| `2027-01-01 9:00新年计划` / `2027-01-01 9:00 New Year plan` | 指定本地日期与时刻 |

相对时间仅接受正整数，最长 10080 分钟或 168 小时（7 天）。标题最多 120 个 Unicode 字符，总输入最多 512 个字符，不接受控制字符。无效日期、24 小时时刻、过去时刻与缺少标题会显示中英文错误并阻止保存。只有明确前缀会被解析；`今天整理文档`、`tomorrow planning`、`写20分钟后的方案` 等仍作为普通任务原文保存。

提醒不依赖番茄钟开关。同一天的提醒立即出现在今日列表；以后日期进入“已安排”，到提醒时刻并入今日列表。今日与已安排列表均显示提醒时间，已触发的项显示“已提醒”。每秒检查实际墙上时间，不让整个岛屿每秒重渲染。多项同刻到期合并播放一次现有短提示音，并打开今日待办页；提醒不会自动完成任务。

应用未运行期间不会发出系统通知；下次打开时补提醒。游戏静默、待办关闭、托盘隐藏期间不播放声音、不展开，也不消费提醒；恢复到可提醒状态后补提醒。完成或删除后不再触发。提醒成功后持久化 `reminded: true`，重启不重复；未完成且尚未提醒的项即使关闭“延续未完成待办”，跨天仍保留身份与截止时间。

时间采用本地时区。相对语法计算实际经过的毫秒；“明天”按本地日历推进，跨月、跨年和闰年正常处理。夏令时跳过的本地时刻报错，重复时段取 JavaScript 本地 Date 的较早一次；时区变更后已保存的提醒仍对应原来的绝对时刻。

English: Enter an explicit prefix in the main todo field and press Enter after reviewing the preview. The reminder time overrides the date picker. Relative reminders support up to seven days; absolute times use the local calendar. A due reminder plays the existing short sound and opens today's tasks once. Quiet mode, disabled todos and a hidden tray window defer delivery. Completing or deleting cancels delivery, and restarting catches up on pending deadlines.

## 数据与兼容

沿用 `focusd-island-todos`、`focusd-island-scheduled-todos` 和现有归档键，无新增键。`TodoItem` 与 `ScheduledTodo` 增加可选 `remindAt`（Unix epoch 毫秒）及 `reminded`（布尔值）。缺少字段的旧数据不产生提醒；无效时间丢弃提醒字段。规范化、计划转今日、日切和 JSON 持久化保留有效字段。已有 Markdown 导出仍是原来的待办清单和每日笔记，属于可读导出，不作为提醒恢复来源。

语法参考 DotIsle 的 MIT 许可源码 `Rust/crates/dotisle-todos/src/quick_reminder.rs`，版本 `d09a751`；在此基础上增加普通任务回退、英文语法、epoch 截止时间和真实到点通知。完整许可见 [第三方许可](third-party-licenses.md)。

## 验证入口

- `node --test tests/unit/quick-reminder.test.mjs tests/unit/todos.test.mjs`
- `pnpm test:regression todo-quick-reminder`
- 回归页使用真实 `useIslandTodos` 和 `TodoNotebook`，覆盖输入、到点、隐藏/静默/禁用、完成/删除、重启与日切。
