/**
 * purchases.ts — 深度报告内购（$1.99 一次性，按评估解锁）
 *
 * 架构：
 *   App Store 正式版 → RevenueCat（react-native-purchases）
 *     产品 ID: deep_report_199 (Non-Consumable per assessment → 实际用 Consumable，
 *     因为每套房产单独购买一次)
 *   当前（无 Apple 开发者账号）→ 测试模式：模拟购买流程，直接解锁
 *
 * TODO(上架前):
 *   1. App Store Connect 创建 Consumable 商品 deep_report_199（$1.99）
 *   2. npx expo install react-native-purchases && EAS Build
 *   3. 把下面 purchaseDeepReport 的 stub 换成 Purchases.purchaseProduct()
 *   4. AI 调用改走 Cloudflare Worker 代理（开发者侧 MiniMax Key），
 *      不再要求用户自带 API Key
 */
import { Platform, Alert } from "react-native"

export const DEEP_REPORT_PRICE = "$1.99"
export const DEEP_REPORT_PRODUCT_ID = "deep_report_199"

// 测试模式开关：上架版本必须改为 false
export const PURCHASE_TEST_MODE = true

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: "cancelled" | "unavailable" | "error"; message?: string }

export async function purchaseDeepReport(): Promise<PurchaseResult> {
  if (PURCHASE_TEST_MODE) {
    // 测试模式：模拟 App Store 购买确认框
    return new Promise((resolve) => {
      if (Platform.OS === "web") {
        const yes = typeof window !== "undefined" &&
          window.confirm(`[测试模式]\n解锁深度报告 ${DEEP_REPORT_PRICE}？\n（正式版将走 App Store 内购）`)
        resolve(yes ? { ok: true } : { ok: false, reason: "cancelled" })
        return
      }
      Alert.alert(
        "解锁深度报告",
        `${DEEP_REPORT_PRICE} · 一次性购买\n\n[测试模式] 正式版将通过 App Store 内购完成支付。`,
        [
          { text: "取消", style: "cancel", onPress: () => resolve({ ok: false, reason: "cancelled" }) },
          { text: `模拟购买 ${DEEP_REPORT_PRICE}`, onPress: () => resolve({ ok: true }) },
        ],
      )
    })
  }

  // ── 正式版（RevenueCat）──────────────────────────────────────────────
  // import Purchases from "react-native-purchases"
  // try {
  //   const products = await Purchases.getProducts([DEEP_REPORT_PRODUCT_ID])
  //   if (!products.length) return { ok: false, reason: "unavailable" }
  //   await Purchases.purchaseStoreProduct(products[0])
  //   return { ok: true }
  // } catch (e: any) {
  //   if (e.userCancelled) return { ok: false, reason: "cancelled" }
  //   return { ok: false, reason: "error", message: String(e?.message ?? e) }
  // }
  return { ok: false, reason: "unavailable", message: "内购未配置" }
}
