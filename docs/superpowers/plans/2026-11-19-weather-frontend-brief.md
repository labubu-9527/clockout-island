# 天气前端任务说明

| 项目 | 内容 |
|---|---|
| 文档名称 | 天气前端任务说明 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-19 |
| 版本号 | v1.0.0 |

总需求见 weather-location-hover 计划，用户已确认。不得提交或暂存，保留全部已有改动。仅前端天气域、对应i18n、回归/单测及岛天气高度接线，不改Rust/全局外观。

原生接口：`locate_weather_city({language})` 返回 WeatherCity，id=1、真实名称和坐标，时区来自服务，缺失UTC；`WeatherDay` 兼容增加可选 sunrise/sunset（Unix秒），两天气源都解析。前端api.ts加封装和可选字段，不在组件直接invoke。

配置增加 locationMode:'auto'|'manual'，明确保存值优先；旧数据有任一provider手动city时manual，否则auto。保留原city/qweatherCity供手动恢复，不把定位结果写进去。3小时位置缓存单独storage key，按语言隔离，不接受未来timestamp/无效city。自动位置controller须有city/locating/locationFailed等，主天气控制器用effective city组成现有provider/host/request key。所有Badge/Panel/Preview展示同一有效城市，不能仍读settings.city造成自动模式空白。

自动刷新过期位置；手动刷新强制重新定位（保留合理冷却/防重入）。定位失败时继续使用上次自动城市/天气并提示位置失败，不悄悄用手动城市冒充自动结果；无历史则清晰错误/手选入口。位置请求过期/手动模式/provider切换响应不覆盖新选择。保留weather15min缓存和请求守卫。关闭模块不发定位请求。

设置页和岛内配置都提供自动/手动选择，自动说明按网络出口可能受VPN影响，失败可切换手动。手动搜索和选城市继续按provider独立保存，选择城市切manual。尽量复用现有选择行，无多余重复显示开关。

UI按用户截图：紧凑卡片，左大彩色lucide天气图标+温度+天气/今日高低温/城市，右2x2指标（体感/湿度/风速/日出日落）；下方七列星期/日期/图标/高温低温及跨列曲线（可自行SVG画数据曲线，图标复用lucide），七日/未来六小时切换，底部来源和更新时间。适配现有主题/深浅/玻璃，英文窄宽不溢出；天气岛高度适当收紧至约350，不强行塞导致卡片截断，配置可滚动。缺日照显示--，老cache兼容。date使用forecast.timezone优先，别用自动定位UTC提示覆盖真实forecast时区。暂无数据/加载/失败/过期状态不可假造天气。

测试先红后绿：迁移/3hr缓存/未来时间/请求竞态/强制定位失败保留城市，七日曲线与小时切换、sunrise和missing、深浅/英文和缩放不溢出，现有weatherSettings和weather-system-indicators全过。需要mock新增定位命令（旧手动case不应意外调locate）。测试mock控制器类型同步。跑pnpm check/build和针对性regression，父协调全套最终验证。生产文件<=400ts/500css，新文件单一职责。
