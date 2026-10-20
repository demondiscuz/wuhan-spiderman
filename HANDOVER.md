# 《蜘蛛侠：至暗之日》项目移交文档

**版本：v16**  
**移交日期：2026-10-20**  
**当前状态：可运行、已上线、桌面端/平板/手机横屏已适配**

---

## 1. 项目一句话说明

《蜘蛛侠：至暗之日》是一个 **Vite + Three.js + Canvas2D** 的网页游戏：

- **第一章 G01–G03**：2D 像素横版（Canvas2D）
- **第二章 G04–G09**：3D 第一人称（Three.js）
- **第三章 G10–G11**：3D 第一人称（Three.js）
- 包含对白、漫画过场、BGM、VO、SFX、移动端触控、制作人名单与通关流程。

**本地资源文件夹保持不变：**

```text
C:\Users\OVES\Desktop\蜘蛛侠游戏\game-v8
```

项目全部资源使用相对路径，**整个 `game-v8` 文件夹可以整体移动或拷贝**，不需要改代码中的本地路径。

---

## 2. 线上地址（移交后保持不变）

| 用途 | 地址 | 平台 | 状态 |
| :--- | :--- | :--- | :--- |
| **主站（推荐）** | https://wuhanspiderman.pages.dev/ | Cloudflare Pages | 正常 |
| **备用站** | https://demondiscuz.github.io/wuhan-spiderman/ | GitHub Pages | 正常 |
| **源码仓库** | https://github.com/demondiscuz/wuhan-spiderman | GitHub | 正常 |

### 保持地址不变的关键

- Cloudflare 项目名：**`wuhanspiderman`**
- GitHub 仓库名：**`wuhan-spiderman`**，Owner：**`demondiscuz`**
- **不要删除 Cloudflare 项目**：`wuhanspiderman.pages.dev` 由项目名绑定；删除后名称可能无法重新获得。
- **不要直接把 GitHub 仓库转移到另一个用户名**：GitHub Pages 地址会变成 `新用户名.github.io/wuhan-spiderman`。
- 如果要保持两个地址完全不变，建议：
  - GitHub：把接手人加为 **Collaborator**，仓库仍留在 `demondiscuz`；
  - Cloudflare：把接手人加为账号成员，项目仍留在当前账号；
  - 或者只在确认平台支持“项目/仓库转移且保留域名”时再转移。

### 当前部署信息

- Cloudflare 最新生产部署：`911ae33b.wuhanspiderman.pages.dev`
- Cloudflare 部署方式：**Wrangler 直接上传**（不是 GitHub 自动构建）
- GitHub Pages 部署方式：**GitHub Actions**，push `main` 自动构建
- Cloudflare 上传文件：**46 个，约 6.16 MB**
- 两个站点的 `v4.webp` / `wukong.webp` 当前均为 **720p**：
  - `v4.webp`：1290×720，220,490 B
  - `wukong.webp`：1290×720，216,684 B

---

## 3. 账号与权限

### GitHub

- Owner：`demondiscuz`
- 仓库：`demondiscuz/wuhan-spiderman`
- 默认分支：`main`
- Pages 工作流：`.github/workflows/deploy.yml`
- 仓库当前线上内容已包含 720p 全屏漫画。

### Cloudflare

- 账号邮箱：`demondiscuz@gmail.com`
- Account ID：`8f15e4af74ef4c451493a1553e926512`
- Pages 项目：`wuhanspiderman`
- 生产分支：`main`
- 本项目当前是 **Direct Upload**，后续更新需要手动执行 `wrangler pages deploy`；如果希望 push 自动部署，可在 Cloudflare Dashboard 把项目改为连接 GitHub 仓库。

### 凭据安全

**不要把以下本机凭据直接交接给他人：**

- `C:\Users\OVES\AppData\Roaming\xdg.config\.wrangler\config\default.toml`
- Windows Credential Manager 中的 GitHub 凭据
- 浏览器里的 GitHub / Cloudflare 登录状态

正确做法：

1. 接手人使用自己的账号登录 Cloudflare / GitHub；
2. 原账号把接手人加为成员/协作者；
3. 交接完成后，在原机器执行 `npx wrangler logout`，并在 Windows 凭据管理器中删除 GitHub 凭据；
4. 开启双因素认证（2FA）。

---

## 4. 本地运行

### 环境

- Node.js：建议 **20 LTS**（当前构建环境为 Node 20+）
- 包管理器：npm
- 浏览器：Chrome / Edge / Safari（Safari 音频见“已知问题”）

### 安装与开发

```bat
cd /d "C:\Users\OVES\Desktop\蜘蛛侠游戏\game-v8"
npm install
npm run dev
```

Vite 开发地址通常是 `http://localhost:5173`。

### 构建与本地预览

```bat
npm run build
npm run preview
```

- 构建输出：`dist/`
- 预览地址通常是 `http://localhost:4173`
- 也可以双击：
  - `dev.bat`
  - `build.bat`
  - `preview.bat`

### PowerShell 注意

如果 PowerShell 报：

```text
无法加载文件 ... npm.ps1，因为在此系统上禁止运行脚本
```

请使用：

```bat
npm.cmd install
npm.cmd run build
```

或在 `cmd.exe` 中运行。

---

## 5. 部署流程

### 5.1 Cloudflare Pages（主站）

首次登录（接手人自己的账号）：

```bat
npx wrangler login
```

更新并部署：

```bat
cd /d "C:\Users\OVES\Desktop\蜘蛛侠游戏\game-v8"
npm run build
npx wrangler pages deploy dist --project-name=wuhanspiderman --branch=main
```

注意：

- **Cloudflare 不会因为 GitHub push 自动更新**（当前是 Direct Upload）。
- 每次改完代码/资源，必须重新 `npm run build` 再 `wrangler pages deploy`。
- 部署完成后访问：https://wuhanspiderman.pages.dev/

如果 PowerShell 的 `npx.ps1` 被策略拦截，使用：

```bat
npx.cmd wrangler pages deploy dist --project-name=wuhanspiderman --branch=main
```

### 5.2 GitHub Pages（备用站）

```bat
cd /d "C:\Users\OVES\Desktop\蜘蛛侠游戏\game-v8"
git add -A
git commit -m "Update game"
git push origin main
```

push 后 GitHub Actions 会自动：

1. `npm install`
2. `npm run build`
3. 上传 `dist` 到 GitHub Pages

访问：https://demondiscuz.github.io/wuhan-spiderman/

### 5.3 重要：本地 Git 与远端历史

由于交接前曾通过 GitHub API 直接更新资源，**本地 Git 提交历史与 GitHub 远端 `main` 不是同一条线性历史**，但业务文件内容已经对齐。

接手后如果继续用 Git：

- 建议以 GitHub 远端 `main` 为基线重新 clone；
- 或先 `git fetch origin`，确认差异后再处理；
- **不要直接 force push 覆盖远端**，除非确认远端内容不需要保留。

---

## 6. 工程结构

```text
game-v8/
├─ index.html                  入口 HTML（HUD、对白、触控按钮）
├─ package.json                three@0.160.0 + vite@5
├─ package-lock.json
├─ vite.config.js              base: './'
├─ README.md
├─ HANDOVER.md                 本文档
├─ build.bat / dev.bat / preview.bat
├─ .github/
│  └─ workflows/deploy.yml     GitHub Pages 工作流
│
├─ src/
│  ├─ main.js                  状态机、流程、输入、对白、漫画、提示
│  ├─ scenes2d.js              第一章 2D 像素（G01–G03）
│  ├─ scenes3d.js              第二章/第三章 3D（G04–G11）
│  ├─ ui.js                    HUD、对白头像、血条、交互提示
│  ├─ audio.js                 Ogg 音频自动卡位
│  ├─ video.js                 v0 视频卡位
│  └─ style.css                桌面/平板/手机响应式样式
│
├─ public/
│  ├─ boot.webp                启动画面 1920×1080
│  ├─ video/v0.mp4             开场视频 960×540 H.264/AAC
│  ├─ audio/                   29 个 .ogg（Opus）
│  └─ comics/                  12 个 .webp
│
└─ dist/                       构建产物（不提交 Git）
```

### 体积

| 项目 | 体积 / 数量 |
| :--- | ---: |
| `public/audio` | **2.62 MB / 29 个 .ogg** |
| `public/comics` | **1.14 MB / 12 个 .webp** |
| `public/video` | **1.50 MB / 1 个 v0.mp4** |
| `public/boot.webp` | **359 KB** |
| `public` 合计 | **约 5.62 MB / 43 files** |
| `src` | **约 140 KB / 7 files** |
| `dist` 部署包 | **约 6.16 MB / 46 files** |
| `node_modules` | 约 50.58 MB（不部署） |
| `.git` | 约 36.35 MB（本地，不部署） |

### dist 结构

```text
dist/
├─ index.html                  约 8.4 KB
├─ boot.webp                   约 359 KB
├─ assets/
│  ├─ index-*.js               约 526 KB
│  └─ index-*.css              约 25.7 KB
├─ audio/                      29 个 .ogg，约 2.62 MB
├─ comics/                     12 个 .webp，约 1.14 MB
└─ video/v0.mp4                约 1.50 MB
```

---

## 7. 资源规则（替换资源前必读）

### 7.1 音频 `public/audio/*.ogg`

当前 **只保留 Ogg Opus**，`src/audio.js` 只请求 `.ogg`。

固定槽位：

- BGM（5）：
  - `bgm_battle.ogg`
  - `bgm_fly.ogg`
  - `bgm_normal.ogg`
  - `bgm_thanks.ogg`
  - `bgm_wukong.ogg`
- VO（13）：
  - `vo_d00.ogg` 到 `vo_d12.ogg`
- SFX（11）：
  - `sfx_ambient_ny.ogg`
  - `sfx_goo.ogg`
  - `sfx_impact.ogg`
  - `sfx_jet.ogg`
  - `sfx_mech.ogg`
  - `sfx_misc.ogg`
  - `sfx_portal.ogg`
  - `sfx_spider_sense.ogg`
  - `sfx_swing.ogg`
  - `sfx_thunder.ogg`
  - `sfx_wind.ogg`

替换规则：

- **文件名必须保持完全一致**，否则对应语音/音效会静音。
- 编码建议：Ogg Opus；BGM 40 kbps stereo，VO/SFX 32 kbps mono。
- 若需要 Safari/iPad 兼容，可以在 `audio.js` 增加 `.m4a` 回退并重新提供 M4A；当前版本为纯 Ogg。
- 不要把文件改成 `.mp3` 后只改扩展名，必须真实转码。

### 7.2 漫画 `public/comics/*.webp`

当前 12 张：

| 文件 | 尺寸 | 用途 |
| :--- | :--- | :--- |
| `v1.webp` | 646×360 | G05 传送门 |
| `v2.webp` | 646×360 | G07 钢铁侠 |
| `v3.webp` | 646×360 | G08 收容毒液 |
| `v4.webp` | **1290×720** | G11 悟空破云（全屏） |
| `wukong.webp` | **1290×720** | 悟空分镜（全屏） |
| `docock.webp` | 646×360 | G02 第一段对白 |
| `docock2.webp` | 646×360 | G02 第二段对白 |
| `chip_pull.webp` | 646×360 | G03 拔芯片 |
| `handshake.webp` | 646×360 | G03 握手 |
| `track.webp` | 646×360 | G04 追踪 |
| `eddie.webp` | 646×360 | G09 埃迪 |
| `ch1_pixel_bg.webp` | 1696×720 | 第一章像素背景 |

替换规则：

- 建议仍使用 WebP。
- 文件名在 `src/main.js`、`src/scenes2d.js`、`src/scenes3d.js` 中被引用；**改文件名必须同步改代码**。
- 全屏漫画（v4 / wukong）建议保留 720p；其他 360p 足够。

### 7.3 启动画面 `public/boot.webp`

- 当前：1920×1080 WebP，约 359 KB。
- 只使用 WebP，HTML 中不再引用 `boot.jpg`。
- 替换时保持 16:9，避免开始页变形。

### 7.4 开场视频 `public/video/v0.mp4`

- 当前：H.264 + AAC，960×540，12.064s，约 1.50 MB。
- 必须使用浏览器可播放的 H.264/AAC MP4，并加 `-movflags +faststart`。
- 其他 `v1–v4` 不是视频，是漫画图；代码通过 `playVideo` 对 `v1–v4` 显示对应漫画。

---

## 8. 游戏流程与关键触发

| 关卡 | 模式 | 内容 | 关键资源 |
| :--- | :--- | :--- | :--- |
| G01 | 2D 像素 | 武汉江滩、教学小怪、摆荡 | `bgm_fly`、`sfx_wind` |
| G02 | 2D 像素 | 碰到章鱼博士触发对白/战斗 | D01/D02、`docock.webp`、`docock2.webp`、`bgm_battle` |
| G03 | 2D 像素 | 拔芯片、握手、双人离场 | D03/D04、`chip_pull.webp`、`handshake.webp` |
| G04 | 3D | 追踪黑液到龟山电视塔 | D05、`track.webp` |
| G05 | 3D | 龟山电视塔高空平台、传送门 | `v1`/`vo_d06` |
| G06 | 3D | 纽约街巷追踪 | `bgm_normal`、`sfx_ambient_ny` |
| G07 | 3D | 毒液小兵 + 钢铁侠 | D07、`v2.webp` |
| G08 | 3D | 毒液 BOSS | D08/D09、`v3.webp` |
| G09 | 3D | 背埃迪回家、温馨小家 | D10、`eddie.webp` |
| G10 | 3D | 工作台整理战衣（F 三次） | `bgm_normal` |
| G11 | 3D | 抬头 → v4/悟空全屏漫画 → 制作人名单 → 完 | `v4.webp`、`wukong.webp`、`bgm_thanks` |

### 操作

- 桌面：`WASD` 移动、鼠标视角、`Space` 跳、`E`/右键摆荡、左键/`J` 蛛网弹、`Shift` 闪避、`F` 交互、`H` 提示、`P` 暂停、`R` 重开。
- 手机/平板横屏：左下 ◀/▶，右下 跳 / 网 / 丝 / 闪 / F；竖屏会提示横屏。

---

## 9. 关键代码入口

| 文件 | 作用 |
| :--- | :--- |
| `index.html` | 舞台、HUD、对白、漫画层、触控按钮、Boot |
| `src/main.js` | 场景切换、输入、对白队列、漫画/视频、提示、暂停、通关 |
| `src/scenes2d.js` | G01–G03 的 2D 逻辑与像素渲染 |
| `src/scenes3d.js` | G04–G11 的 3D 场景、碰撞、毒液、工作台、悟空 |
| `src/ui.js` | HUD、对白头像、敌方血条、F 提示 |
| `src/audio.js` | Ogg 音频加载、BGM/VO/SFX 总线 |
| `src/video.js` | v0 视频加载与结束回调 |
| `src/style.css` | 桌面 + 移动端响应式、漫画面板、触控布局 |

### 章节映射

`chapterOf(id)` 的逻辑：

- `G01–G03` → `ch1` → 2D 像素
- `G04–G09` → `ch2` → 3D
- `G10–G11` → `ch3` → 3D

---

## 10. 已知限制与注意事项

1. **Safari / iPad 音频**
   - 当前仅提供 Ogg Opus。
   - 部分老版本 Safari/iPadOS 不支持 Ogg，会没有声音。
   - 如果目标用户包含老 iPad，建议在 `audio.js` 增加 `.m4a` 回退，并提供 AAC M4A 文件。

2. **Cloudflare 和 GitHub 是两套部署**
   - GitHub push 只更新 GitHub Pages。
   - Cloudflare 需要手动 `wrangler pages deploy`，否则主站不会更新。
   - 当前主站 Cloudflare 已是最新 720p；GitHub Pages 也已同步 720p。

3. **静态文件 404 回退**
   - Cloudflare Pages 对不存在的路径可能返回 `index.html`（HTTP 200）。
   - 例如旧 `audio/*.m4a` 可能返回 200 但内容是 HTML；游戏不会请求这些路径。

4. **漫画分辨率**
   - 除 `v4`/`wukong` 为 720p 外，其余为 360p；全屏放大会略软，这是为了加载速度做的取舍。

5. **旧根地址**
   - `https://demondiscuz.github.io/` 已撤销，返回 404。
   - 仓库 `demondiscuz/demondiscuz.github.io` 仍存在但没有站点内容，可手动删除；**不要删错 `wuhan-spiderman` 仓库**。

6. **本地 Git 历史**
   - 本地 `main` 与 GitHub 远端 `main` 的提交历史不同（交接前用 API 直接更新过资源），但业务文件一致。
   - 继续维护前先确认远端基线，避免误 force push。

7. **不要删除/重命名**
   - Cloudflare 项目 `wuhanspiderman`
   - GitHub 仓库 `wuhan-spiderman`
   - `public/audio`、`public/comics`、`public/video`、`boot.webp`
   - 否则链接或资源会失效。

---

## 11. 备份与文档

以下内容在 `game-v8` **外面**的父目录：

```text
C:\Users\OVES\Desktop\蜘蛛侠游戏\
├─ v7.md … v16.md              设计/拆分文档，v16 为最新
├─ asset-manifest.json         资源清单
├─ asset-validation.txt        ffprobe 校验记录
├─ _backup_public_v16\         压缩前资源备份（约 31 MB）
├─ ch1\ ch2\ ch3\              原始分镜漫画
└─ 参考图\                     参考图
```

- `_backup_public_v16` 是压缩前备份，可回滚音频/漫画/视频。
- 当前 `game-v8` 已是最新优化版；不要用备份覆盖 `public`，除非要回滚。
- 项目文档最新为 `v16.md`。

---

## 12. 移交检查清单

### 交付前

- [ ] 拷贝整个 `game-v8` 文件夹（可排除 `node_modules`、`.git`、`dist` 后重新安装/构建）。
- [ ] 确认 `public/` 内 29 个 Ogg、12 个 WebP、`boot.webp`、`video/v0.mp4` 完整。
- [ ] `npm ci`（或 `npm install`）成功。
- [ ] `npm run build` 成功，`dist` 约 6.16 MB / 46 files。
- [ ] `npm run preview` 本地可玩。
- [ ] 打开两个线上地址确认可玩。
- [ ] 检查 Cloudflare 主站与 GitHub Pages 的 `v4.webp` 均为 220,490 B（720p）。
- [ ] 把接手人加为 GitHub Collaborator 和 Cloudflare 成员；保持仓库/项目所有者不变以保留 URL。
- [ ] 交接后修改密码、开启 2FA、撤销旧 OAuth/设备登录。
- [ ] 在原机器执行 `npx wrangler logout`，清理 Windows 凭据。

### 接手后

- [ ] 用自己账号登录 Cloudflare / GitHub。
- [ ] 不要删除 `wuhanspiderman` 项目或 `wuhan-spiderman` 仓库。
- [ ] 修改代码后：
  - GitHub：`git push origin main`（自动更新备用站）
  - Cloudflare：`npm run build` + `wrangler pages deploy`（更新主站）
- [ ] 如需改音频，保持文件名和 Ogg 槽位；如需改漫画，保持文件名或同步改代码。
- [ ] 如需绑定自定义域名，优先在 Cloudflare Pages 的 Custom domains 里加，保留 `pages.dev` 地址。

---

## 13. 最小验收命令

```bat
cd /d "C:\Users\OVES\Desktop\蜘蛛侠游戏\game-v8"
npm ci
npm run build
npm run preview
```

浏览器打开：

- 本地：`http://localhost:4173/`
- 主站：https://wuhanspiderman.pages.dev/
- 备用：https://demondiscuz.github.io/wuhan-spiderman/

验收点：

1. 开始页 Boot 正常，点击开始播放 v0。
2. 第一章 2D 像素正常，教学小怪可击飞。
3. G02 碰到章鱼博士后出现 D01/D02 与两张漫画。
4. G03 拔芯片/握手漫画正常，双人向右离场。
5. 第二章 3D 可移动；G05 传送门正常；G08 毒液可被自动收容。
6. 结尾 v4/悟空 720p 全屏漫画连续播放，随后制作人名单与「完」。
7. 手机横屏触控键可用；竖屏提示横屏。

---

**移交文档结束。**
