# 时间与岛仔状态表情实施计划

| 项目 | 内容 |
|---|---|
| 文档名称 | 时间与岛仔状态表情实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-19 |
| 版本号 | v1.0.0 |

用户确认：时间及岛仔均独立开关、收起排列；时间12/24小时、时段（无/上午下午/详细）与秒数；岛仔依据空闲、计时、音乐、消息、Agent自动变表情。不得提交。

- [x] 时间领域：src/features/clock，格式化纯函数与测试；ClockIndicator叶子定时更新，关闭/不可见不轮询；ClockSettings接收settings/onSettingsChange。配置clockEnabled默认true、clockHour12默认false、clockPeriod为none/ampm/detailed默认none、clockShowSeconds默认false。中央双语clock分区。
- [x] 岛仔领域：src/features/island-pet，状态解析纯函数及测试、CSS眼睛表情组件。优先级消息通知>Agent需处理>Agent工作>待办计时>音乐播放>空闲。静态状态标签双语，空闲眨眼、专注收窄、听歌摇摆、提醒睁眼；减少动画偏好停动画，不见时不运行。组件props为state和active，不读取窗口。petEnabled默认true。
- [x] 集成：IslandSettings/defaults/normalize、collapsed slots clock/pet兼容补末尾、排列独立开关；时间格式组放通用页；叶子组件交IslandShell/CollapsedBar，固定窄岛隐藏附加项以保护计时器。现有状态在windows层组合，不加系统监听。自动宽度增加最长格式预算，上限480px。
- [x] 验证：覆盖格式边界/状态优先级/旧存档/排序与开关；pnpm check/build/test:regression/build:web-demo。完成后更新契约/设计/知识库同一记录，所有代码不提交。
