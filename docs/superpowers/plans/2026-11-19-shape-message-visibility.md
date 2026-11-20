# 刘海胶囊与统一图标消息实施计划

| 项目 | 内容 |
|---|---|
| 文档名称 | 刘海胶囊与统一图标消息实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-19 |
| 版本号 | v1.0.0 |

用户确认：形状notch/pill默认notch兼容旧数据，胶囊离屏顶6px且四角圆润；所有收起项显示开关在岛上的排列；关闭显示不关闭功能；消息微信/QQ/邮件/插件共用，收起末端横排、展开右侧竖向胶囊、未读红点及点击到实际页面/应用；不得提交。

- [x] 原生：set_island_interaction兼容可选islandShape及messageRailCount。state保存形状及展开消息区数量，胶囊stage离顶6px、收起半高圆角、展开正常全圆角、贴边保持行为。展开右侧消息栏宽36px间距8px、高count*32+8最多136；命中区仅新增实际栏矩形，间隙穿透；有消息栏时水平边界留空以避免超屏。透明窗口尺寸容纳。纯几何测试、cargo test。前端IPC字段由父协调。
- [x] 设置：islandShape:'notch'|'pill'；collapsedSlotVisibility:Record<CollapsedSlot,boolean>默认true，兼容原cpuEnabled/memoryEnabled/clockEnabled/petEnabled/showCollapsedText；messageSourceVisibility:Record<qq|wechat|qqMail|plugin,boolean>默认true。旧独立设置键保留兼容读取。排列组统一每slot显示开关，消息源独立开关；天气页只保留启用服务和城市，不重复图标显示。形状选项放外观页，双语。
- [x] 窗口界面：统一消息模型与消息栏组件，业务功能启用且显示开关为true才显示；展开右侧，收起放末端。消息来源固定顺序wechat/qq/qqMail/plugin，红点来自已有未读/待处理快照。插件聚合入口打开插件消息。显示开关只控制呈现，不影响数据与轮询。隐藏邮件slot避免重复入口，仍允许原存档mail位置开关控制邮件来源。图标根据现有功能是否可用预览置灰。托盘/贴边/游戏穿透一致。
- [x] 验证：配置迁移与开关、消息红点/点击/布局、形状CSS和原生命中区；pnpm check/build/test:regression/build:web-demo、cargo test、tauri build --no-bundle。完成归档与文档，不提交。


