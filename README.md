# 九宫风水

阳宅风水评估 App（iOS / Android / Web），Expo SDK 54 + React Native + expo-router。

## 功能

**六步勘宅**（`app/address → orientation → exterior → palaces → room-detail → report`）
1. 定位：地址 → OSM 建筑轮廓 / 卫星图手描 → 太极点；公寓可跳过地图
2. 定向：立面法向候选 + 罗盘实测 → 二十四山坐向；建成年份定元运
3. 外局：50m / 200m / 1km 三环，Overpass 自动识别 + 地图点选 / 按方位手动添加
4. 内局：房间入九宫（点选或罗盘定宫），八宅游年星 + 玄空飞星
5. 细节：房间是/否清单 + 床头/灶口/书桌罗盘测量
6. 报告：七级评级仪表、分层得分、运势倾向、飞星盘、流年、格局明细、改善行动、PDF 分享；
   付费深度报告（$1.99 内购，AI 生成，离线规则兜底）

**工具**：罗盘、个人命卦吉凶方、流年飞星（五黄/二黑/太岁/岁破/三煞）、风水入门

## 目录

| 路径 | 内容 |
|------|------|
| `app/(tabs)/` | 底部四个 Tab：勘宅、工具、记录、我的 |
| `app/*.tsx` | 评估流程与工具页 |
| `components/ui.tsx` | 共享界面组件；颜色等设计令牌在 `lib/theme.ts` |
| `lib/fengshui/` | 规则引擎：飞星、八宅、外局、室内、流年、命卦、报告、打印 |
| `lib/geo/` | 地理编码、建筑轮廓、地图 HTML |
| `lib/purchases.ts` | 内购（expo-iap） |
| `lib/ai-client.ts` + `worker/` | AI 深度报告（Cloudflare Worker 代理） |
| `public/` | 隐私政策、支持页（随网页版部署） |
| `store/screenshots/` | App Store 截图（1290×2796） |
| `docs/APP_STORE.md` | **上架手册** |
| `design/` | 视觉参考图 |

## 开发

```bash
npm install
npm run typecheck
npm run web                      # 浏览器预览（罗盘/内购为模拟）
node scripts/verify-flying-stars.mjs
node scripts/verify-annual-stars.mjs
```

内购、罗盘需要原生模块，真机调试请用开发构建：`eas build --profile development --platform ios`，
或在 Mac 上 `npm run ios`。Expo Go 中内购自动降级为模拟购买。

## 发布

见 [docs/APP_STORE.md](docs/APP_STORE.md)。简要：`npm run build:ios && npm run submit:ios`。
