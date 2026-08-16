# 是男人就坚持100秒 · 100-second-fly

## 🕹️ 在线游玩

**<https://soapgu.github.io/100-second-fly/>**

纯前端静态站，浏览器打开即玩，无需安装。也可下载 [GitHub Release](https://github.com/soapgu/100-second-fly/releases) 中的 `dist.zip` 本地运行。

![是男人就坚持100秒 Web 弹幕生存挑战海报](public/og.png)

用 **React 18 + TypeScript + Vite** 复刻的 Flash 时代经典弹幕躲避生存小游戏：操控小飞机在越来越密集的弹幕中存活 **100 秒** 即通关，中弹即死。

> 调研背景见 [`RESEARCH.md`](./RESEARCH.md)（原版历史、"是男人就 XXX"系列、各版本玩法拆解）。

## 玩法

- 单屏生存：躲避从四面八方袭来的弹幕，撑满 **100 秒** 就是真男人
- **判定点远小于机体**（弹幕游戏惯例，机身上的白点才是本体）
- **擦弹（graze）**：子弹贴身掠过会计入擦弹数，成绩结算展示
- 难度分四个阶段递增，每次升级弹出提示语：

| 时间 | 阶段 | 弹幕构成 | 提示语 |
|---|---|---|---|
| 0–10s | 阶段一 · 试探 | 瞄准弹 | 开始！撑过100秒！ |
| 10–30s | 阶段二 · 压制 | + 环形散射 | 弹幕加强了！ |
| 30–60s | 阶段三 · 狂乱 | + 螺旋弹幕 | 密度提升！坚持住！ |
| 60–100s | 阶段四 · 地狱 | + 弹幕墙 | 地狱模式！！ |
| 90s | — | — | 最后10秒！！！ |

- 结算按坚持秒数给出评价语（"这也叫男人？" → "是男人就坚持100秒——你做到了！"）
- 历史最佳 / 通关次数 / 累计擦弹 存于 localStorage

## 操作

| 输入 | 说明 |
|---|---|
| 方向键 / WASD | 移动 |
| Shift（按住） | 减速精确走位（弹幕游戏惯例） |
| P | 暂停 / 继续（切后台自动暂停） |
| R | 结算界面快速重开 |
| M | 静音切换 |

## 本地运行

```bash
npm install        # 若 ~/.npm 权限异常：npm install --cache /tmp/npm-cache
npm run dev        # 开发服务器，默认 http://localhost:5173
npm run build      # 类型检查 + 产出纯静态 dist/
npm run preview    # 预览构建产物
npm test           # vitest 单元测试（含 100 秒弹幕仿真）
```

## 技术要点

- **Canvas 2D** 渲染（同屏数百子弹），React 只负责 UI 外壳（开始/HUD/结算）
- 游戏引擎为 `src/game/` 下的**纯 TS 模块**，无 React 依赖，可独立单测
- 固定步长更新（60Hz）+ rAF 渲染；子弹/粒子**对象池**避免 GC 抖动
- 难度为**数据驱动时间轴**（`difficulty.ts`），发射间隔在阶段内线性收紧
- 全部界面文案集中在 `copy.ts`，方便调整"味道"
- 音效用 WebAudio 程序化生成，无音频文件

```
src/
  App.tsx               # 界面状态机：menu | playing | result
  components/           # StartScreen / HudOverlay / ResultScreen / GameCanvas
  game/                 # 纯 TS 引擎
    Game.ts             # 主循环、状态机、渲染、死亡慢动作/通关演出
    difficulty.ts       # 难度时间轴 + 阶段提示事件
    patterns.ts         # 瞄准/环形/螺旋/弹幕墙 四类发射器
    bullets.ts          # 子弹对象池
    collision.ts        # 命中 + 擦弹判定
    player.ts input.ts particles.ts audio.ts effects…
    copy.ts             # 全部文案（开场说明/状态行/提示语/评价语）
    storage.ts          # localStorage 纪录
    __tests__/          # 30 个单测（含 100 秒仿真）
```
