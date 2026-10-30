# 九宫风水 · App Store 上架手册

> 按顺序做，每一步都能打勾。代码里能做的部分都已经做好，下面主要是**只有你本人能在 Apple / Expo / Cloudflare 后台操作**的事。

---

## 0. 先确认：那 99 美元还在不在

Apple 开发者会员是**按年付费**的（每年 99 美元），不是一次性买断。

1. 登录 <https://developer.apple.com/account> → 「会员资格详细信息」（Membership details）。
2. 看「到期日期」：
   - **还没过期**：会员资格还在，直接往下做，越早提交越划算。
   - **已经过期**：需要续费才能上架（Apple 一般不退已过期的会费）。续费后，之前创建过的 Bundle ID、App 记录都还在。

> 这次之所以「交了钱却没上架」，主要是 App 本身还没到能上架的程度，而不是钱白花了：
> 内购只是模拟弹窗、`app.json` 引用的图标和启动图文件根本不存在（打包会失败），而且没有隐私政策网址。这些问题这次都已修好（见第 7 节）。

---

## 1. 一次性准备（约 1 小时）

| # | 事项 | 在哪里做 |
|---|------|---------|
| 1.1 | 签署 **付费 App 协议**（Paid Apps Agreement），填写**税务**和**银行账户**。不做这步，内购商品永远是「缺少元数据」，审核也过不了 | App Store Connect → 「协议、税务和银行业务」 |
| 1.2 | 注册 Expo 账号（免费） | <https://expo.dev/signup> |
| 1.3 | Windows 电脑装好 Node.js LTS（<https://nodejs.org>） | 浏览器 |

**全程不需要 Mac。** iOS 包由 Expo 的 EAS 在云端 Mac 上打，证书和描述文件也由 EAS 自动生成、保存在云端；提交到 App Store Connect 也是 EAS 代劳。App Store Connect 的表单在任何电脑的浏览器里都能填。

---

## 2. 部署后端（AI 代理 + 隐私政策网页）

### 2.1 AI 代理 Worker（深度报告用）

```bash
cd worker
npx wrangler deploy
npx wrangler secret put MINIMAX_API_KEY   # 粘贴你的 MiniMax Key
npx wrangler secret put APP_TOKEN         # 输入 fs-app-2026（与 lib/ai-client.ts 里的 AI_WORKER_TOKEN 一致）
```

部署后浏览器打开 `https://fengshui-ai.lodaviddai.workers.dev/health`，看到 `"configured":true` 即可。
**审核期间 Worker 必须在线**——审核员会真的买一次深度报告（沙盒环境，不扣钱）。即便 Worker 挂了，App 也会自动出离线规则版报告，不会空白。

### 2.2 隐私政策 / 支持页面

1. 打开 `public/support.html`，把两处 `SUPPORT_EMAIL` 换成你愿意公开的客服邮箱。
2. 运行 `deploy.bat`（或 `npm run export:web` 后 `wrangler pages deploy dist --project-name=fengshui`）。
3. 确认这两个网址能打开（上架表单要填）：
   - 隐私政策：`https://fengshui-78g.pages.dev/privacy.html`
   - 技术支持：`https://fengshui-78g.pages.dev/support.html`

---

## 3. 在 App Store Connect 建 App 和内购

### 3.1 新建 App

App Store Connect → 「App」→ ＋ →「新建 App」

| 字段 | 填写 |
|------|------|
| 平台 | iOS |
| 名称 | `九宫风水 - 阳宅罗盘勘宅`（被占用就换成 `九宫风水·卫星罗盘`） |
| 主要语言 | 简体中文 |
| 套装 ID | `com.davidlo.fengshuiapp`（下拉里没有就先跑一次第 4 步的打包，EAS 会自动注册） |
| SKU | `fengshui-app-001`（随便填，只给自己看） |

建好后在「App 信息」页记下 **Apple ID**（一串数字）。

### 3.2 内购商品

App → 「功能」→「App 内购买项目」→ ＋

| 字段 | 填写 |
|------|------|
| 类型 | **消耗型项目**（每套房产单独购买一次） |
| 参考名称 | 深度风水报告 |
| 产品 ID | `deep_report_199`（必须一字不差，代码里写死了） |
| 价格 | 1.99 美元 |
| 本地化显示名称 | 深度风水报告 |
| 本地化描述 | 为当前这套房产生成 800–1000 字深度分析与改善排期 |
| 审核截图 | 用 `store/screenshots/2-report.png`，或真机报告页底部的付费卡片截图 |

> 第一次提交时，内购商品要在 App 版本页的「App 内购买项目」区域**勾选**，和 App 一起送审。

---

## 4. 打包并上传（Windows PC 即可）

### 方式 A：双击 `release-ios.bat`（第一次必须用这个）

在项目文件夹里双击 **`release-ios.bat`**，它会依次：安装依赖 → 检查代码 → 登录 Expo → 云端打包 → 自动提交到 App Store Connect。

第一次运行会在窗口里问你几件事，照下面回答：

| 提问 | 回答 |
|------|------|
| Expo 账号 / 密码 | 第 1.2 步注册的账号 |
| Create a project / link to existing project? | Yes |
| Do you want to log in to your Apple account? | **Yes**，输入 Apple ID 和密码，再输入手机上收到的 6 位验证码 |
| Generate a new Apple Distribution Certificate? | Yes |
| Generate a new Apple Provisioning Profile? | Yes |
| Generate a new App Store Connect API Key? | Yes |
| What would you like your iOS bundle identifier to be? | 直接回车（`com.davidlo.fengshuiapp`） |

打包约 15–25 分钟，结束后自动上传，再过 10–30 分钟在 App Store Connect 的 TestFlight 里就能看到。

> Apple 账号密码只在你自己电脑上输入给 Apple / EAS，不会写进代码。
> 跑完后 `app.json` 会多出 `projectId`，请提交到 GitHub。

### 方式 B：以后在 GitHub 网页上点按钮（连电脑都不用开）

第一次用方式 A 跑通后，证书已经保存在 EAS 云端，以后可以完全在 GitHub 网页上发版：

1. 准备 App Store Connect API 密钥：App Store Connect → 用户和访问 → 集成 → App Store Connect API → 生成密钥（权限选「App 管理」），下载 `AuthKey_XXXX.p8`（只能下载一次，保存好）。
2. Expo 令牌：expo.dev → 头像 → Account settings → Access tokens → Create。
3. GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret，逐个添加：

   | 名称 | 内容 |
   |------|------|
   | `EXPO_TOKEN` | 第 2 步的 Expo 令牌 |
   | `ASC_APP_ID` | App 信息页的 Apple ID（一串数字） |
   | `ASC_KEY_ID` | API 密钥的「密钥 ID」 |
   | `ASC_ISSUER_ID` | API 密钥页面上方的「Issuer ID」 |
   | `ASC_API_KEY_P8` | 用记事本打开 `.p8` 文件，全选复制粘贴 |

4. 仓库 → **Actions** → 「iOS 打包并提交 App Store」→ **Run workflow**。约 30 分钟后新版本出现在 TestFlight。

工作流定义在 `.github/workflows/ios-release.yml`；GitHub 只负责发指令和等结果，真正的打包在 EAS 云端完成。

### 上传后：TestFlight 自测

**先用 TestFlight 在自己手机上走一遍完整流程，尤其是：**

- [ ] 罗盘能转、能锁定
- [ ] 地址搜索 → 卫星图 → 确认轮廓
- [ ] 买深度报告（TestFlight 里是沙盒支付，不扣钱）→ 报告生成
- [ ] 导出 PDF → 分享

最后回到 App Store Connect，在版本页选中这个 build，填完第 5 节资料后点「提交审核」——这一步也是在浏览器里完成。

---

## 5. 填写上架资料

### 5.1 文案（直接复制）

**副标题**（≤30 字）
```
八宅·玄空飞星·卫星罗盘看风水
```

**宣传文本**（≤170 字，可随时改，不用重新审核）
```
2026 丙午年流年飞星已更新：一键查看今年五黄、二黑、太岁、三煞落在你家哪个房间。
```

**描述**
```
九宫风水把传统阳宅勘察的流程，装进了你的手机。

【六步完成一次专业勘宅】
1. 定位：输入地址，在卫星图上找到房屋轮廓，自动求出宅中心（太极点）
2. 定向：选大门所在的立面，再用手机罗盘到门口实测，精确到二十四山
3. 外局：以宅中心为原点，50 米 / 200 米 / 1 公里三环看周边道路、水体、高楼与形煞
4. 内局：把大门、主卧、灶位、书房等放进九宫，八宅游年星与玄空飞星同时判定
5. 细节：镜子对床、开门见灶、横梁压顶……常见居家细节逐项自查
6. 报告：七级综合评级、分层得分、各方面运势倾向、优先改善行动，可导出 PDF

【随手可用的风水工具】
· 罗盘：实时显示度数、二十四山、八卦方位
· 个人命卦：输入出生年份，查自己的四吉四凶方位——床头、书桌、大门宜朝哪里
· 流年飞星：今年与明年的九宫飞星，五黄、二黑、太岁、岁破、三煞方位与化解
· 风水入门：坐向、九宫、八宅、玄空、峦头术语一页看懂

【深度报告】
为每套房产生成 800–1000 字的深度分析：逐房间布置建议、五行调理、今年流年宜忌，以及按「立刻做 / 一个月内 / 装修时」排好的改善清单。

【隐私】
无需注册账号。你的地址、户型、出生年份只保存在本机。

本应用内容基于传统风水文化，仅供文化与娱乐参考，不构成购房、投资、装修或健康方面的任何建议。
```

**关键词**（≤100 字符，逗号分隔、不加空格）
```
风水,罗盘,八宅,玄空飞星,流年,九宫,阳宅,命卦,吉凶方,家居,买房,装修,五黄,太岁,fengshui,compass,bagua
```

**版本更新说明**
```
全新设计：古铜罗盘风格界面
新增：流年飞星、个人吉凶方、独立罗盘、风水入门
新增：公寓模式（无需地图，直接罗盘定向）
报告：总评仪表、分层得分、运势倾向、PDF 分享
```

### 5.2 截图

`store/screenshots/` 里已生成 5 张 **1290×2796**（iPhone 6.9 英寸）截图，按文件名顺序上传即可：
首页 → 综合报告 → 九宫内局 → 流年飞星 → 个人吉凶方。
（`app.json` 里已关闭 iPad 支持，所以**不需要** iPad 截图。）

### 5.3 其他表单

| 项目 | 建议 |
|------|------|
| 类别 | 主要：**生活**（Lifestyle）；次要：参考（Reference） |
| 年龄分级 | 问卷全部选「无」→ 4+ |
| 隐私政策网址 | `https://fengshui-78g.pages.dev/privacy.html` |
| 技术支持网址 | `https://fengshui-78g.pages.dev/support.html` |
| App 隐私（营养标签） | 选 **「不收集数据」**。依据：App 没有账号、不做分析统计；地址和坐标只是实时发给地图服务用于显示，不留存；AI 请求经 Worker 转发，不存储。若以后加了统计/崩溃上报，要回来改。 |
| 价格 | 免费（靠内购收费） |
| 销售范围 | **取消勾选「中国大陆」**。大陆区要求 ICP 备案，而且对占卜/命理类内容审核很严。建议上：美国、加拿大、中国香港、中国台湾、新加坡、马来西亚、澳大利亚、新西兰、英国。 |
| 版权 | `2026 David Lo` |

### 5.4 给审核员的备注（App 审核信息 → 备注）

```
This app is a feng shui (traditional Chinese home-layout) assessment tool. It is not a fortune-telling or horoscope app: it analyzes a real house using its satellite footprint, the phone's compass heading, nearby map features (OpenStreetMap), and a room-by-room layout, then applies classical rules (Eight Mansions, Flying Stars, landform analysis).

How to test without visiting a house:
1. Tap 开始勘宅评估 (Start assessment). Enter any US address, e.g. "1 Apple Park Way, Cupertino, CA", tap 查找 (Search), then confirm the outlined building on the map.
   Alternatively tap 跳过地图，用罗盘定向 (Skip map) to use the compass only.
2. On the orientation step, tap any of the four direction cards (or use the compass).
3. Continue through 外局 (surroundings) and 九宫内局 (room layout): select 大门 (front door) and tap a grid cell, then 主卧 (master bedroom) and tap another cell.
4. Continue to the report.

In-app purchase: "deep_report_199" (consumable, $1.99) unlocks an extended written report for the current property. It appears at the bottom of the report screen (解锁深度报告).

No account or login is required. All user data stays on device.
```

---

## 6. 提交与常见拒审

点「添加以供审核」→「提交」。一般 1–3 天出结果。

| 可能的拒审 | 应对 |
|-----------|------|
| **4.3 垃圾内容**（风水/占卜类 App 太多） | 回复审核员：本 App 的核心是卫星轮廓 + 罗盘实测 + 地图地物分析的房屋勘察工具，不是星座/抽签类，并附上第 5.4 节的测试流程。必要时录一段 1 分钟的屏幕录像说明。 |
| **2.1 App 完整性**（审核时深度报告没出来） | 检查 Worker `/health`；审核期间别改 Worker。 |
| **3.1.1 内购** | 确认内购商品已勾选随版本提交、状态为「准备提交」。 |
| **5.1.1 定位权限说明** | 权限文案已写明「只读取真北方向、不记录位置」；如被追问，回复同样内容。 |
| **Guideline 2.3.8 截图与实际不符** | 截图来自真实界面，若后续改了 UI 记得重截（`node` 截图脚本见第 8 节）。 |

---

## 7. 本次代码层面已修好的上架阻碍

- [x] **真实内购**：接入 `expo-iap`（StoreKit 2），消耗型 `deep_report_199`，购买后 `finishTransaction`；只在开发构建 / 网页版走模拟购买
- [x] **图标与启动图**：`assets/icon.png`（1024×1024，无透明通道）、`splash-icon.png`、`adaptive-icon.png`、`favicon.png`；源文件 `assets/icon.svg`
- [x] **隐私**：App 内隐私政策页 + 可公开访问的 `privacy.html` / `support.html`；`PrivacyInfo.xcprivacy`（UserDefaults 声明）由 `app.json` 生成
- [x] **权限文案**：定位 / 运动传感器说明改为具体用途
- [x] **iPad**：关闭 `supportsTablet`，免做 iPad 适配和截图
- [x] **普通用户不再看到「填 API Key」**：AI Key 移到「我的 → 高级设置」，默认走服务器
- [x] **数据删除**：「我的 → 清除本机全部数据」
- [x] **Worker 防滥用**：`X-App-Token` 校验 + prompt 长度上限
- [x] **EAS 配置**：`eas.json`（production 自动递增 build 号）
- [x] **免 Mac 发布**：`release-ios.bat`（Windows 一键）+ `.github/workflows/ios-release.yml`（GitHub 网页一键）
- [x] 已在 Linux 上跑通 `expo prebuild --platform ios`，确认所有 config plugin 能正常生成原生工程

---

## 8. 以后发新版本

1. 改代码 → `npm run typecheck`
2. `app.json` 里把 `version` 改成新版本号（如 `1.1.0`；build 号 EAS 会自动加）
3. 双击 `release-ios.bat`，或在 GitHub Actions 里点 Run workflow
4. App Store Connect 里新建版本 → 选这个 build → 写更新说明 → 提交

重新生成商店截图：

```bash
npm run export:web
# 然后用 Playwright 以 430×932、deviceScaleFactor=3 截图（得到 1290×2796）
```
