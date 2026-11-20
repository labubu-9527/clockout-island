# Third-party licenses

| 项目     | 内容                 |
| -------- | -------------------- |
| 文档名称 | Third-party licenses |
| 制作人   | XiaoZhu              |
| 日期     | 2026-11-20           |
| 版本号   | v1.3.0               |

## DotIsle interface and island halo

The settings layout and music panel in this project use [Heiamer/DotIsle](https://github.com/Heiamer/DotIsle), commit `d09a751a2fcc337b03ae09860052f9b1317f1250`. The following logic is ported from its Rust implementation to TypeScript/CSS; the Vello GPU renderer and bundled artwork are not included:

| DotIsle source                                                                   | 岛点下班 adaptation                                                                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `lyric-core/src/island_layout.rs`, `lyric-native/src/renderer.rs::compact_music` | `MusicCapsule.css`, cover metrics and circular capsule geometry                                                  |
| `lyric-native/src/compact.rs`                                                    | `compactLyrics.ts`, `useCompactMusicGeometry.ts`: line metrics, secondary selection, 80/300ms stability gates    |
| `lyric-native/src/surface.rs::Surface::paint`, `renderer.rs::material_surface`   | `referenceMusicSurface.ts`, `MusicSurface.css`: material-specific neutral/tinted planes, frost and glass rim     |
| `dotisle-themes/src/cover_color.rs`, `dynamic_color.rs`                          | `referenceCoverPalette.ts`, `useArtworkPalette.ts`: Celebi quantization, scoring, HCT palettes and dynamic roles |
| `dotisle-glow/src/engine.rs`, `lib.rs`, `lyric-core/src/shared_motion.rs`        | `islandEffects.ts`, `IslandGlow.tsx/css`: five strokes, breathing, peak envelope and closed-form springs         |

The source is licensed as follows:

```text
MIT License

Copyright (c) 2026 Heiamer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Material Color Utilities

`@material/material-color-utilities` 0.3.0, Copyright Google LLC, licensed under [Apache-2.0](https://github.com/material-foundation/material-color-utilities/blob/main/LICENSE). The official JavaScript library supplies the same Material quantization, scoring and HCT algorithms used by DotIsle's Rust `material_colors` dependency. No artwork or font is copied from this package.

## xiaotang-daozai pet expressions

The twelve original expression sheets in `src/assets/pet/` and the geometry, non-uniform frame timing, idle/hover cadence and music pose sequence in `src/features/island-pet/` are reused or adapted from [Renly1994/xiaotang-daozai](https://github.com/Renly1994/xiaotang-daozai), `src/pet.rs`, `src/pet_expressions.rs` and `assets/pet/expressions/`, at commit `08250c583dfda4fe3643af9e27cc93221b4170e9`. Their MIT license is included in `src/assets/pet/LICENSE` and reproduced below. The procedural renderer is ported to SVG; the original PNG files remain unchanged.

## xiaotang-daozai office messenger windows

The DingTalk / Feishu / WeCom main-window rules and wake routes in `src-tauri/src/office_im/client.rs` (including the Feishu tray relaunch) are adapted from [Renly1994/xiaotang-daozai](https://github.com/Renly1994/xiaotang-daozai), `src/messenger/desktop.rs` and `src/messenger/windows.rs`, under the MIT License below. The DingTalk, Feishu and WeCom tile icons are taken from the same project's `assets/calendar/`.

## xiaotang-daozai quota adapters

The Kimi Code usage parsing in `src-tauri/src/agent_status/kimi_usage.rs` and the Z Code credential decryption and plan / trial usage reading in `src-tauri/src/agent_status/zcode_credentials.rs` and `zcode_usage.rs` are adapted from [Renly1994/xiaotang-daozai](https://github.com/Renly1994/xiaotang-daozai), `src/quota.rs` and `src/zcode_quota.rs`, under the MIT License below.

## xiaotang-daozai OTP detection

The weighted verification-code detector in `src-tauri/src/mail/otp.rs` and its regression tests are adapted from [Renly1994/xiaotang-daozai](https://github.com/Renly1994/xiaotang-daozai), `src/otp.rs`. The reference credits pulse-mail (MIT) for keyword and shape scoring rules. Only the algorithm is reused.

The same MIT notice also covers these adapted algorithms (no source UI is reused):

- `src-tauri/src/lyrics/{qqmusic,kugou_cache,soda_cache,soda_lmdb,soda_msgpack}.rs`: QQ lyric protocol and read-only music-cache parsing, from the reference's `lyrics.rs`, `kugou_cache.rs` and `soda_cache.rs`.
- `plugins/doubao/src/main.rs`: quota parsing and private-browser login, from `doubao_quota.rs` and `doubao_login.rs`.
- `plugins/grok-bot/src/main.rs`, `plugins/zcode/src/main.rs`: local credential formats, request checksum and quota parsing, from `grok_quota.rs` and `zcode_quota.rs`.
- `plugins/gemini/src/main.rs`, `plugins/sdk/src/lib.rs`: quota response and local credential / DPAPI format references, from `gemini_quota.rs` and `native_auth.rs`.
- `plugins/office-im/src/main.rs`: window identification and shell notification algorithms, from `messenger/desktop.rs`.

插件包附带本声明；所有界面仍由宿主组件实现。Plugin archives include this notice; all UI remains implemented by host components.

```text
MIT License

Copyright (c) 2026 小唐的Token and Daozai contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
