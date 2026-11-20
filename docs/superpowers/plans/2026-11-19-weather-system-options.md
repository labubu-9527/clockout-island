# 天气与独立系统指标实施计划

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 天气与独立系统指标实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-19 |
| 版本号 | v1.0.0 |

**目标：** 实施已确认的天气详情和 CPU / 内存独立配置。

**架构：** 天气使用独立领域设置和 localStorage 同步，Rust 固定端点请求，React 接入现有小岛导航。CPU 与内存保留现有命令结构，拆分排列项。

**全局约束：** 中英双语；文件规模遵循 AGENTS.md；不改变现有窗口及命令契约；不生成安装包；不触及 .workbuddy。

## 任务 1：独立系统指标

- [x] 在 tests/unit 中先增加旧 system 位置迁移和独立开关行为测试，运行 node --test 确认失败。
- [x] 修改 appearance 的 types / defaults / normalizeBehaviorSettings / settingsLimits 及 CollapsedLayoutEditor；system 原位转换 cpu、memory。
- [x] IslandApp 轮询依赖开关；Shell / CollapsedBar 分别显示，未采样显示 --。
- [x] 补双语选项；预留 weather 排列项和 ReactNode 插槽供任务 3 接线。
- [x] 针对性测试通过后交主代理统一验证。

## 任务 2：天气原生接口

- [x] src-tauri/src/weather/tests.rs 先覆盖坐标、响应校验与异常输入。
- [x] weather/mod.rs 提供 search_weather_cities(query, language) 和 get_weather_forecast(latitude, longitude)。固定 Open-Meteo 端点、超时、限长、校验响应，命令返回 Result。
- [x] 城市结构：id、name、admin1、country、latitude、longitude、timezone；预报结构：timezone、current（time、temperature、apparentTemperature、humidity、windSpeed、weatherCode、isDay）、hourly（time、temperature、weatherCode）。time 使用 Unix 秒。
- [x] lib.rs 注册天气命令；运行针对性 cargo test 后交统一验证。

## 任务 3：天气界面与状态

- [x] 先测试城市设置校验、缓存匹配与过期、按当前时间筛选六小时。
- [x] features/weather/ 创建 api、model、storage、useWeather、WeatherSettings、WeatherPanel、WeatherBadge 与领域 CSS；有效缓存 15 分钟，请求防重入与过时结果保护。
- [x] 设置增加天气入口；城市搜索防抖、旧结果保护；关闭模块停止请求，首次未选城市显示明确入口。
- [x] 小岛导航、页面排序、图标及高度接入 weather；收起按钮打开详情，详情提供刷新与城市配置入口。
- [x] 回归页覆盖空状态、真实 mock 天气、开关与独立指标；同步 web-demo mock。

## 任务 4：审查、验证与交付

- [x] 更新 contracts.md、data-storage.md、领域设计和目录地图。
- [x] 复查所有新增数据入口、跨窗口同步、时区小时、配置迁移、窄岛及请求关闭行为。
- [x] 执行 pnpm check、pnpm build、pnpm test:regression（61 个回归页面全过）。
- [x] 构建 example-hello 夹具后执行 cargo test 和 pnpm tauri build --no-bundle。
- [x] 按用户后续要求不提交代码；Obsidian 记录实际验证结果并更新索引、日志。

