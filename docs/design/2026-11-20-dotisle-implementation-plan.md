# DotIsle 界面与交互实施计划

| 项目 | 内容 |
| --- | --- |
| 文档名称 | DotIsle 界面与交互实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-20 |
| 版本号 | v1.0.0 |

依据：已批准的 [具体设计](2026-11-20-dotisle-ui-interaction.md)。采用 subagent-driven-development 分工实施与独立复核，不再增加人工确认节点。

## 全局约束

复用现有React/Tauri、主题和材质；无新依赖、外部数据源或持久化配置。保留消息打开/复制、游戏点击穿透、Agent确认、选字保持和贴边策略。不得覆盖三个既有未跟踪项。所有代码满足文件行数规则及中英文文案要求。

## 单元一：收起态活动分层

文件：`windows/island/collapsedPresentation.ts`、`IslandCollapsedBar.tsx`、接线小模块、`tests/unit/collapsed-presentation.test.mjs` 和对应真实组件回归。

- [x] 先补失败测试：活动计时隐藏普通指标、歌词和计时并存、空闲恢复排序、自动宽度与可见项一致。
- [x] 使用同一纯函数推导活动呈现策略，输入音乐/计时/提醒及用户可见性，输出有效可见项与紧凑策略。示例验收：音乐播放时 `visibleCollapsedSlots(layout, visibility, true)` 保留歌词和音乐，计时数字作为主内容独立保留。
- [x] 更新宽度计算及组件消费，保留用户开关、左侧岛仔和消息入口。
- [x] 运行单测与定向真实IslandApp回归，再统一跑前端总检查、构建和全量回归。

## 单元二：音乐页氛围与层级

文件：`features/media/MusicPlayerPanel.tsx/.css`，按需独立 `MusicArtworkBackdrop.tsx/.css`，音乐回归夹具与 `docs/design/music.md`。

- [x] 先补真实组件失败回归：封面氛围层只在有歌曲封面时存在，操作与歌词层不受遮挡，无封面/空闲状态回退。
- [x] 新增aria-hidden且pointer-events:none的封面层，复用现有图片并通过主题遮罩确保可读性，不覆盖主岛材质，不套嵌套卡片。
- [x] 调整歌曲/歌词/控制层级，保留未知时间线、暂停、错误和现有诊断入口。
- [x] 在浅深主题、不同字号和减少动态效果条件下检查布局与命中，更新音乐设计约定；未做截图和真实桌面视觉验收。

## 单元三：统一提醒调度

文件：窗口级 `noticeQueue.ts`、`useNoticeQueue.ts`、消息来源适配模块，现有 `useIslandNotices.ts`、设备提示接线和必要事件快照；队列单测与浏览器回归。

- [x] 先定义带事件id、优先级、接纳时间、剩余展示时长、等待时效的记录；纯状态机测试使用可控时间。
- [x] 失败测试覆盖验证码优先、同级FIFO、重复快照只更新、悬停暂停、打断恢复、过期/20条容量、失效来源、设备短提示合并及边界清理。
- [x] 提供 `enqueue`、`advance`、`remove`、`clear` 状态转移；事件接纳时保存快照，队列展示不依赖来源preview原定时器；正文更新不重置身份和时间。
- [x] React hook统一处理定时器、原生悬停和选区保持、来源清空和卸载，保留游戏模式时长和点击穿透。
- [x] 普通消息与设备统一调度；Agent/额度和展开状态作为边界。来源开关/已读/清空使待展示项失效；队列结束重新读取当前活动。
- [x] 定向测试展示排队、复制、打开、保持、恢复、游戏和贴边行为。

## 整体验证与交付

- [x] 独立复核规格符合性及代码质量，修复关键发现。
- [x] 修正后重新运行 `pnpm check`（521项单测及类型/lint/行数检查通过）、`pnpm build`通过。完整回归68页首轮61页通过；7个失败页修正后全部定向复测通过，未再次整套执行。音乐减少动态效果回归78项通过。
- [x] 本阶段未修改Rust或窗口IPC契约，未交付exe，无需原生构建。
- [x] 同步实际设计与必要架构文档；本阶段不提交、不推送、不生成安装包。
- [x] 使用Obsidian问题记录技能更新原调研笔记、索引与工作日志；Obsidian未运行，插件未实际调用，直接Markdown降级。真实桌面消息、播放器和系统材质仍待手动验收。

## 回归发现与处理

首次完整回归发现7页失败：通知停留时间旧断言不再符合悬停暂停后恢复剩余时间；邮件阅读夹具被前序QQ排队消息阻挡；计时优先分支绕过原有任务轮播，并隐藏贴边按钮。前两项调整夹具以验证批准方案，后两项修正组件。`pnpm test:regression message-preview-duration notice-reader`中的两种邮件阅读页通过，随后`pnpm test:regression message-preview-duration todo-rotation todo-timer collapsed-presentation`六页通过。未将浏览器mock与自动布局检查描述为桌面视觉验收。
