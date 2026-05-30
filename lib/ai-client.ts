/**
 * AI 客户端 — 支持 MiniMax（主）和 Claude（备用）
 * MiniMax API 兼容 OpenAI 格式
 */
import AsyncStorage from "@react-native-async-storage/async-storage"

const MINIMAX_KEY_STORAGE = "minimax-api-key"
const CLAUDE_KEY_STORAGE  = "claude-api-key"

// MiniMax — 使用 Anthropic 兼容接口（和 Claude 同格式，直接复用）
const MINIMAX_ANTHROPIC_URL = "https://api.minimaxi.com/anthropic"
const MINIMAX_MODEL_KEY     = "minimax-model"
const MINIMAX_MODEL_DEFAULT = "MiniMax-M2.7-highspeed"  // 速度快，适合实时分析

// Claude 备用配置
const CLAUDE_BASE_URL = "https://api.anthropic.com/v1"
const CLAUDE_MODEL    = "claude-3-5-haiku-20241022"

// ── API Key 管理 ───────────────────────────────────────────────────────────────

export async function getMinimaxKey():  Promise<string | null> {
  return AsyncStorage.getItem(MINIMAX_KEY_STORAGE)
}
export async function setMinimaxKey(k: string) {
  await AsyncStorage.setItem(MINIMAX_KEY_STORAGE, k.trim())
}
export async function removeMinimaxKey() {
  await AsyncStorage.removeItem(MINIMAX_KEY_STORAGE)
}
export async function hasMinimaxKey(): Promise<boolean> {
  const k = await getMinimaxKey(); return !!k && k.length > 10
}

export async function getMinimaxModel(): Promise<string> {
  const m = await AsyncStorage.getItem(MINIMAX_MODEL_KEY)
  return m?.trim() || MINIMAX_MODEL_DEFAULT
}
export async function setMinimaxModel(m: string) {
  await AsyncStorage.setItem(MINIMAX_MODEL_KEY, m.trim())
}

export async function getClaudeKey():  Promise<string | null> {
  return AsyncStorage.getItem(CLAUDE_KEY_STORAGE)
}
export async function setClaudeKey(k: string) {
  await AsyncStorage.setItem(CLAUDE_KEY_STORAGE, k.trim())
}
export async function removeClaudeKey() {
  await AsyncStorage.removeItem(CLAUDE_KEY_STORAGE)
}

// 向后兼容旧接口
export const getApiKey    = getClaudeKey
export const setApiKey    = setClaudeKey
export const removeApiKey = removeClaudeKey
export async function hasApiKey(): Promise<boolean> {
  return (await hasMinimaxKey()) || !!(await getClaudeKey())
}

// ── 返回类型 ───────────────────────────────────────────────────────────────────
export type AiResult =
  | { ok: true;  text: string }
  | { ok: false; error: string }

// ── MiniMax 调用（Anthropic 兼容接口）────────────────────────────────────────
async function callMinimax(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens     = 1500,
): Promise<AiResult> {
  const apiKey = await getMinimaxKey()
  if (!apiKey) return { ok: false, error: "未设置 MiniMax API Key" }

  const model = await getMinimaxModel()

  try {
    const res = await fetch(`${MINIMAX_ANTHROPIC_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system:   systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    })

    const rawBody = await res.text()

    if (!res.ok) {
      if (res.status === 401) return { ok: false, error: "MiniMax API Key 无效，请检查" }
      if (res.status === 429) return { ok: false, error: "请求过于频繁，请稍后重试" }
      return { ok: false, error: `MiniMax API 错误 ${res.status}: ${rawBody.slice(0, 200)}` }
    }

    // 解析响应：兼容 Anthropic 格式 + OpenAI 兼容格式
    let data: any
    try { data = JSON.parse(rawBody) } catch {
      return { ok: false, error: `响应解析失败：${rawBody.slice(0, 100)}` }
    }

    // Anthropic 格式: { content: [{ type: "text", text: "..." }] }
    const anthropicText = data?.content?.find?.((c: any) => c.type === "text")?.text as string | undefined
    // OpenAI 格式: { choices: [{ message: { content: "..." } }] }
    const openaiText = data?.choices?.[0]?.message?.content as string | undefined

    const text = anthropicText || openaiText || ""

    if (!text) {
      // 输出原始响应帮助调试
      console.warn("[MiniMax] 空响应:", rawBody.slice(0, 300))
      return { ok: false, error: `AI 未返回有效内容。原始响应: ${rawBody.slice(0, 100)}` }
    }
    return { ok: true, text }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `网络错误：${msg}` }
  }
}

// ── Claude 调用（备用）────────────────────────────────────────────────────────
async function callClaude(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens     = 1500,
): Promise<AiResult> {
  const apiKey = await getClaudeKey()
  if (!apiKey) return { ok: false, error: "未设置 Claude API Key" }

  try {
    const res = await fetch(`${CLAUDE_BASE_URL}/messages`, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages:   [{ role: "user", content: userPrompt }],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      if (res.status === 401) return { ok: false, error: "Claude API Key 无效" }
      return { ok: false, error: `Claude API 错误 ${res.status}: ${body.slice(0,100)}` }
    }

    const data = await res.json() as {
      content: { type: string; text: string }[]
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? ""
    if (!text) return { ok: false, error: "AI 未返回有效内容" }
    return { ok: true, text }

  } catch (err) {
    return { ok: false, error: `网络错误：${err instanceof Error ? err.message : String(err)}` }
  }
}

// ── 统一入口：优先 MiniMax，没有则用 Claude ────────────────────────────────────
export async function analyzeWithAI(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens     = 1500,
): Promise<AiResult> {
  if (await hasMinimaxKey()) {
    return callMinimax(systemPrompt, userPrompt, maxTokens)
  }
  if (await getClaudeKey()) {
    return callClaude(systemPrompt, userPrompt, maxTokens)
  }
  return { ok: false, error: "请先在设置页填写 MiniMax 或 Claude API Key" }
}

// 向后兼容
export const analyzeWithClaude = analyzeWithAI

// ── 便捷包装 ──────────────────────────────────────────────────────────────────
import { buildPointPrompt, buildSynthesisPrompt, POINT_CONFIGS } from "@/lib/fengshui/ai-prompts"
import type { StandingPoint, UserProfile, FocusArea } from "@/types/fengshui"

export async function analyzeStandingPoint(
  point:      StandingPoint,
  profile:    UserProfile,
  address:    string,
  allPoints?: StandingPoint[],
): Promise<AiResult> {
  const config = POINT_CONFIGS[point.type] ?? POINT_CONFIGS.custom
  const systemPrompt = `${config.systemRole}。规则已由系统预先计算，你无需重新推导。专注于：综合判断、通俗解释影响、可操作建议。语气积极建设，先讲优势再讲问题最后给建议，300字以内。`
  const userPrompt = buildPointPrompt(point, profile, address, allPoints)
  return analyzeWithAI(systemPrompt, userPrompt, 1000)
}

export async function synthesizeAllPoints(
  standingPoints: StandingPoint[],
  profile:        UserProfile,
  address:        string,
  focusAreas:     FocusArea[] = [],
): Promise<AiResult> {
  const focusHint = focusAreas.length > 0
    ? `\n用户特别关注：${focusAreas.join("、")}，请在报告中重点针对这些方面给出分析和建议。`
    : ""
  const systemPrompt = `你是一位资深综合风水顾问，善于整合多角度勘察数据给出全面实用建议。${focusHint}
报告要求：中文，500字左右，结构清晰，分整体格局、主要问题、改善建议三段输出。`
  const userPrompt = buildSynthesisPrompt(standingPoints, profile, address)
  return analyzeWithAI(systemPrompt, userPrompt, 2000)
}
