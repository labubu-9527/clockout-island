# DotIsle 三部分复刻实施计划

| 项目 | 内容 |
| --- | --- |
| 文档名称 | DotIsle 三部分复刻实施计划 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-20 |
| 版本号 | v1.0.0 |

依据已批准的full-replica方案，使用subagent-driven-development实施与复核。沿用当前工作区未提交代码，不创建Git提交或推送，不生成安装包。各单元不得覆盖其他单元及之前修改；新模块遵守src/AGENTS.md及行数限制。

## 单元一：设置界面与搜索

职责：windows/settings的LayoutEditor、Sidebar、AppearanceSettingsPage、设置样式与settings文案；基础Settings组件必要样式；设置搜索纯逻辑及回归。保留原分类标识与deep link。

- [x] 先增加设置搜索/标签失败测试，验证名称和说明查找、定位与五标签键盘切换。
- [x] 新增settingsSearch.ts及SettingsSearch.tsx，按渲染的设置行索引文案和分类/标签位置；选中结果滚动高亮，Esc清空。搜索不能只检索导航名。
- [x] 外观页分成尺寸与排版、材质与取色、交互与提示、光效与动效、布局编辑器；引入单元二的IslandEffectsSettings组件，参数为settings/onSettingsChange。
- [x] 对齐浅灰底、分组卡片、蓝灰控件和左导航；兼容全部原页面与嵌入尺寸。
- [x] 定向设置回归与类型检查，交由主代理复核。

## 单元二：光效、曲线与动画

职责：features/appearance的effects/motion领域模块、新设置类型与normalize/defaults、相关i18n；windows/island的光效及动画接线；单测与回归。外观页主文件由单元一管理。

- [x] 纯测试先定义默认关闭、旧存档容错、峰值/呼吸参数、优先级、曲线与弹簧边界。
- [x] 新增IslandEffectsSettings.tsx，导出(props:{settings:IslandSettings;onSettingsChange:(settings:IslandSettings)=>void})，文案放独立settings/effects.ts后汇入appearance文案。
- [x] 轮廓光效由独立叶子组件驱动；呼吸2400ms，流光3800ms，律动sqrt(peak)平滑，更新>音乐>计时，减少动态效果静态化；光层不可命中。
- [x] 配置化曲线/弹簧与展开收起时长，运动守卫根据真实时长结束；贴边与透明留白不裁光。
- [x] 定向光效回归，告知主代理原生命中范围/透明留白是否需改。

## 单元三：音乐面板

职责：features/media、音乐文案、音乐回归；使用已有媒体命令，不自行增加Rust接口。与settings单元不交叉。

- [x] 先增加实际组件回归，验证封面/歌词/播放控制布局和可用按钮真实动作。
- [x] 采用左封面右曲名/歌手/歌词、整行进度和底部操作；氛围遵守现有材质和外层光效，保留空态和诊断。
- [x] api.ts封装media_toggle_shuffle/media_cycle_repeat/media_set_volume；控制以当前会话/能力为准。收藏核对参考源码，实际不支持则禁用且说明；翻译切换保留已有设置。
- [x] 浅深主题、缩放、无封面、无歌词、未知时长、禁用能力与错误测试。

## 主代理整合与交付

- [x] 自绘设置窗口拖动/关闭、原生配置与权限适配；核对既有保存尺寸与DPI逻辑，实际桌面验收另列。
- [x] 独立规格/质量复核三个单元，处理发现；更新contracts、settings/island/music设计与必要架构地图。
- [x] pnpm check、pnpm build、完整pnpm test:regression；cargo test --manifest-path src-tauri/Cargo.toml、pnpm tauri build --no-bundle（2026-11-20 提交前复验结果见下文）。
- [x] 实际渲染截图核对设置、收起音乐岛与展开音乐岛；真实桌面能力有未验收时单列。
- [x] 更新Obsidian原笔记/索引/日志，列出准确验证结果；不提交、不推送。

## 验证进度

### 岛点下班 / Clockout-island 提交前复验

用户授权提交至 Gitee；中文与英文品牌接入语言字典，Tauri productName 为 Clockout-island。旧Hook、待办导出目录兼容已复核。`pnpm check` 通过（540项单测），`pnpm build` 通过；Rust 单测使用 `cargo test --manifest-path src-tauri/Cargo.toml -j 1` 完成，492通过、14个依赖真实桌面的用例按设计忽略，先前内存阻塞本轮未再出现。最新 `pnpm tauri build --no-bundle` 通过。无安装包、无发布；真实桌面材质与播放器行为仍单列人工验收。

### 源码材质校准（2026-11-20 后续）

- [x] 经GitHub tree/blob API重新获取 `d09a751` 的 `surface.rs`、`renderer.rs`、`music_layout.rs` 与光晕引擎，逐项比对，保留MIT归属。
- [x] 移植材质底板端点与反射规则，移除所有材质共享亮面的近似；封面圆角使用岛体半径的一半。
- [x] 音乐波形仅在播放时显示，暂停释放自动宽度；补播放/暂停及三种材质回归。
- [x] 普通形状导览使用暂停场景检查已保存外观，音乐临时几何由独立回归覆盖，修正暂停时仍期待波形的断言。
- [x] 本轮540单测、静态检查、构建通过；71页隔离回归70页直接通过，音乐页圆角检查修正为等待过渡后单独重跑通过（88项）。已核查收起音乐岛截图并归档。连续共享浏览器运行在后续页面无响应，改为每页独立实例；真实桌面与完整像素一致性仍待验收。

最终`pnpm check`通过，533个单测及类型、lint、行数检查均通过。71个浏览器回归场景已全部通过；连续运行受到系统提交内存不足影响，最终逐页隔离浏览器完成。截图位于`node_modules/.cache/replica-qa/`，使用mock，仅用于界面布局核查。

`cargo test --manifest-path src-tauri/Cargo.toml -j 1`编译阶段报`rustc-LLVM ERROR: out of memory`和`STATUS_STACK_BUFFER_OVERRUN`，未执行完单测。最终`pnpm tauri build --no-bundle`成功（原生release编译4分09秒），生成`src-tauri/target/release/fly-island.exe`，包括最后的前端收尾。不生成安装包，不提交、不推送。真实桌面材质、播放器能力、系统输出音量、自绘拖动/关闭及DPI仍需人工验收。

提交前完整浏览器回归：71/71 场景逐页隔离通过，包含中英文、设置搜索/标签、三种材质、双行歌词与消息队列；本轮无失败重跑。
