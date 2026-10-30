/**
 * purchases.ts — 深度报告内购（$1.99，消耗型，每套房产购买一次）
 *
 * iOS/Android 正式版：expo-iap（StoreKit 2 / Play Billing），产品 ID 见 DEEP_REPORT_PRODUCT_ID
 *   - App Store Connect 里创建「消耗型项目」deep_report_199，价格 $1.99
 *   - 解锁状态记录在该评估上（assessment.aiUnlocked），随历史记录保存在本机
 * 开发调试（__DEV__ / Expo Go 无原生模块）与 Web 版：模拟购买确认框
 */
import { Alert, Platform } from "react-native"

export const DEEP_REPORT_PRODUCT_ID = "deep_report_199"
const FALLBACK_PRICE = "$1.99"

export type PurchaseResult =
  | { ok: true }
  | { ok: false; reason: "cancelled" | "unavailable" | "error"; message?: string }

// expo-iap 是原生模块：Web 与 Expo Go 中不存在，必须惰性加载
type IapModule = typeof import("expo-iap")
let iapCache: IapModule | null | undefined
function loadIap(): IapModule | null {
  if (iapCache !== undefined) return iapCache
  if (Platform.OS === "web") return (iapCache = null)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    iapCache = require("expo-iap") as IapModule
  } catch {
    iapCache = null
  }
  return iapCache
}

/** 没有可用的商店连接时走模拟购买（仅开发构建与网页版） */
export function isPurchaseTestMode(): boolean {
  return Platform.OS === "web" || (__DEV__ && !loadIap())
}

let connected = false
async function ensureConnection(iap: IapModule): Promise<boolean> {
  if (connected) return true
  try {
    connected = await iap.initConnection()
  } catch {
    connected = false
  }
  return connected
}

/** 从商店读本地化价格（拿不到则用默认 $1.99） */
export async function getDeepReportPrice(): Promise<string> {
  const iap = loadIap()
  if (!iap || !(await ensureConnection(iap))) return FALLBACK_PRICE
  try {
    const products = await iap.fetchProducts({ skus: [DEEP_REPORT_PRODUCT_ID], type: "in-app" })
    const p = Array.isArray(products) ? products[0] : null
    return (p && "displayPrice" in p && p.displayPrice) || FALLBACK_PRICE
  } catch {
    return FALLBACK_PRICE
  }
}

export async function purchaseDeepReport(): Promise<PurchaseResult> {
  if (isPurchaseTestMode()) return simulatePurchase()

  const iap = loadIap()
  if (!iap) return { ok: false, reason: "unavailable", message: "当前设备不支持应用内购买" }
  if (!(await ensureConnection(iap))) {
    return { ok: false, reason: "unavailable", message: "无法连接 App Store，请检查网络后重试" }
  }

  return new Promise<PurchaseResult>((resolve) => {
    let settled = false
    const done = (r: PurchaseResult) => {
      if (settled) return
      settled = true
      okSub.remove()
      errSub.remove()
      resolve(r)
    }

    const okSub = iap.purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== DEEP_REPORT_PRODUCT_ID) return
      try {
        // 消耗型：必须 finish，否则下一次无法再次购买
        await iap.finishTransaction({ purchase, isConsumable: true })
      } catch {}
      done({ ok: true })
    })
    const errSub = iap.purchaseErrorListener((err) => {
      if (String(err.code) === "user-cancelled") done({ ok: false, reason: "cancelled" })
      else done({ ok: false, reason: "error", message: err.message })
    })

    iap.fetchProducts({ skus: [DEEP_REPORT_PRODUCT_ID], type: "in-app" })
      .then(() => iap.requestPurchase({
        request: { apple: { sku: DEEP_REPORT_PRODUCT_ID }, google: { skus: [DEEP_REPORT_PRODUCT_ID] } },
        type: "in-app",
      }))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e)
        done(/cancel/i.test(msg) ? { ok: false, reason: "cancelled" } : { ok: false, reason: "error", message: msg })
      })
  })
}

function simulatePurchase(): Promise<PurchaseResult> {
  return new Promise((resolve) => {
    if (Platform.OS === "web") {
      const yes = typeof window !== "undefined" &&
        window.confirm(`[演示模式]\n解锁深度报告 ${FALLBACK_PRICE}？\n（App 版通过 App Store 内购支付）`)
      resolve(yes ? { ok: true } : { ok: false, reason: "cancelled" })
      return
    }
    Alert.alert(
      "解锁深度报告",
      `${FALLBACK_PRICE} · 一次性购买\n\n[开发模式] 正式版通过 App Store 内购支付。`,
      [
        { text: "取消", style: "cancel", onPress: () => resolve({ ok: false, reason: "cancelled" }) },
        { text: `模拟购买 ${FALLBACK_PRICE}`, onPress: () => resolve({ ok: true }) },
      ],
    )
  })
}
