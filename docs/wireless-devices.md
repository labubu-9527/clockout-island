# 无线设备电量

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 无线设备电量功能与接口说明 |
| 制作人 | XiaoZhu |
| 日期 | 2026-11-21 |
| 版本号 | v1.0.0 |

在设置 → 通用开启「显示无线设备」，默认关闭。可在设置内查看设备，也可通过岛上无线徽章或展开导航进入无线电量页。外观 → 岛上的排列可单独隐藏或排序徽章，不关闭模块。徽章显示已知电量最低值，未知时只显示图标；音乐播放和紧凑计时态按统一辅助指标规则隐藏。

只读取当前连接的经典蓝牙与BLE设备，设备分类来自系统元数据和名称辅助判断。Windows PnP电量优先，BLE使用标准Battery Service（180F）和Battery Level（2A19）特征，按物理容器或蓝牙地址合并多个端点。不主动连接设备、不配对、不写GATT；私有协议、USB接收器或不公开电量的设备可能无法读取，显示「电量未知」。

## 调用契约

路径为Tauri IPC命令`get_wireless_devices`，不是HTTP接口。由应用内已授权的WebView调用，沿用当前Tauri窗口权限模型，无新增远端服务或令牌。前端统一通过`src/features/wireless/api.ts`调用。

```ts
import { getWirelessDevices } from './src/features/wireless/api';

const devices = await getWirelessDevices(false); // 使用30秒内有效缓存
const refreshed = await getWirelessDevices(true); // 强制刷新，但复用已有扫描
```

对应完整IPC请求：

```ts
await invoke('get_wireless_devices', { refresh: true });
```

refresh可缺省或为false；响应为数组，成功且两种传输均无设备时才为空。设备字段如下：

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| id | string | 物理容器或地址派生的内部去重标识，前端只用作key，不展示为设备名 |
| name | string | 系统设备名称，空名使用本地化通用名称 |
| kind | string | mouse、keyboard、gamepad、headphones、speaker、device之一 |
| batteryPercent | number或null | 0–100，null表示当前设备不支持或未成功读取，不能当作0 |
| updatedAt | number | 扫描结果生成的epoch毫秒 |

示例响应（仅示例，不代表当前电脑硬件）：

```json
[
  { "id": "example-device", "name": "Bluetooth headset", "kind": "headphones", "batteryPercent": 70, "updatedAt": 1795228800000 },
  { "id": "example-keyboard", "name": "Bluetooth keyboard", "kind": "keyboard", "batteryPercent": null, "updatedAt": 1795228800000 }
]
```

命令失败时Promise拒绝并返回错误字符串，界面显示双语简短说明和错误详情。经典蓝牙为空而BLE枚举失败时返回错误，不缓存虚假空列表；单端失败但另一端已有可用设备时保留可用结果。

## 生命周期与提醒

独立工作线程执行枚举，单WinRT操作最多3秒、完整扫描20秒；缓存30秒，强制刷新不绕过正在进行的扫描。驱动卡住并超时后，后续请求等待同一任务结束，避免无限增加线程；句柄、GATT服务与蓝牙端点按作用域释放。

仅功能开启且可见的设置/设备页或收起岛会轮询，每次请求结束30秒后再请求；托盘隐藏或页面停用不发起新扫描，迟到回包不更新已卸载界面。已有扫描可在期限内结束，无后台常驻蓝牙监听。

20%与10%各提醒一次，恢复到30%后重置。告警去重只在内存中，重启后重新计算。低电量提醒在统一队列低于消息及验证码，显示3秒，等待上限30秒；同时多设备依次显示，停用/断连快照移除后取消。仅开关、入口显示与顺序持久化，不保存设备名称、地址、快照或电量历史。

原生扫描移植自DotIsle d09a751的`wireless_battery.rs`，许可证见[第三方许可](third-party-licenses.md)。模拟回归无法验证具体驱动的电量准确性，真实硬件仍需验收。
