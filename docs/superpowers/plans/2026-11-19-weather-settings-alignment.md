# 天气设置完整对齐实施计划

| 项目 | 内容 |
|---|---|
| 文档名称 | 天气设置完整对齐实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-19 |
| 版本号 | v1.0.0 |

用户已确认：功能卡、蓝色实时预览、双数据源、独立城市配置、七日预报。只修改本地，不提交或打包安装器。

## 任务与接口
- [x] 原生：扩展 WeatherForecast.daily（可选兼容旧缓存），元素 {time:number,temperatureMax:number,temperatureMin:number,weatherCode:number}。Open-Meteo七日；和风 now/24h/7d及geo城市查询。新命令 search_qweather_cities(query,language,host), get_qweather_forecast(latitude,longitude,host), has_weather_secret(),save_weather_secret(secret),test_qweather_connection(host,secret可选)。返回与现有相同DTO；Key在凭据管理器，无回传。限制HTTPS和官方 *.qweatherapi.com host，禁重定向，限制响应体和超时。先写解析与host验证失败测试，再实现，运行cargo test。
- [x] 前端状态：WeatherSettings 增加可选 provider(open-meteo/qweather)、qweatherHost、qweatherCity；旧 city 保留Open-Meteo配置。API按数据源路由，缓存身份包含provider/host/city；过期和请求取消保留；测试旧配置兼容和跨来源隔离。
- [x] 界面：设置窗口使用完整WeatherSettingsPage，岛内WeatherSettings保留紧凑城市配置。功能卡启用与打开真实天气页，预览卡实时温度、高低温、体感、湿度、风速、时间、刷新，离线置灰。双源选择草稿、应用、Host/密码输入/连接测试、当前来源和城市搜索。全部中央双语，响应式与键盘操作。七日展示在岛内天气页。
- [x] 验证：更新mocks/回归，pnpm check/build/test:regression/build:web-demo、cargo test、tauri build --no-bundle；审查修改并更新契约及Obsidian原笔记。不得提交。
