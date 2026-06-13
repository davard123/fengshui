/**
 * fengshui-ai — AI 代理 Worker
 *
 * 开发者的 MiniMax Key 存在 Worker Secret（MINIMAX_API_KEY），永不进客户端。
 * POST /generate  { system, prompt, maxTokens? }
 *   → { ok: true, text }  |  { ok: false, error }
 *
 * 稳定性设计：
 *   - 上游调用失败/超时自动重试 1 次
 *   - 截断（stop_reason=max_tokens）自动续写一轮拼接
 *   - 60s 上游超时（MiniMax 推理模型较慢）
 *   - CORS 全开（App/Web 都能调）
 *
 * 部署：
 *   cd worker && npx wrangler deploy
 *   npx wrangler secret put MINIMAX_API_KEY   ← 粘贴你的 MiniMax Key
 */

const MINIMAX_URL = "https://api.minimaxi.com/anthropic/v1/messages"
const MODEL = "MiniMax-M2.5-highspeed"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  })
}

async function minimaxOnce(apiKey, system, messages, maxTokens) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 60_000)
  try {
    const res = await fetch(MINIMAX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
      signal: controller.signal,
    })
    const raw = await res.text()
    if (!res.ok) return { ok: false, error: `upstream ${res.status}: ${raw.slice(0, 150)}` }

    let data
    try { data = JSON.parse(raw) } catch { return { ok: false, error: "parse error" } }
    const text =
      data?.content?.find?.((c) => c.type === "text")?.text ||
      data?.choices?.[0]?.message?.content || ""
    const stop = data?.stop_reason ?? data?.choices?.[0]?.finish_reason ?? ""
    if (!text) return { ok: false, error: "empty response" }
    return { ok: true, text, truncated: stop === "max_tokens" || stop === "length" }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) }
  } finally {
    clearTimeout(timer)
  }
}

async function withRetry(fn) {
  const r1 = await fn()
  if (r1.ok) return r1
  await new Promise((r) => setTimeout(r, 800))
  return fn()
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS })
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return json({ ok: true, configured: !!env.MINIMAX_API_KEY })
    }

    if (url.pathname !== "/generate" || request.method !== "POST") {
      return json({ ok: false, error: "not found" }, 404)
    }
    if (!env.MINIMAX_API_KEY) {
      return json({ ok: false, error: "worker not configured (missing MINIMAX_API_KEY secret)" }, 503)
    }

    let body
    try { body = await request.json() } catch {
      return json({ ok: false, error: "invalid json" }, 400)
    }
    const { system, prompt, maxTokens } = body || {}
    if (!system || !prompt) return json({ ok: false, error: "missing system/prompt" }, 400)
    const mt = Math.min(Math.max(Number(maxTokens) || 4000, 500), 8000)

    // 主回答（带重试）
    const first = await withRetry(() =>
      minimaxOnce(env.MINIMAX_API_KEY, system, [{ role: "user", content: prompt }], mt))
    if (!first.ok) return json({ ok: false, error: first.error }, 502)

    // 截断自动续写
    if (first.truncated) {
      const cont = await minimaxOnce(env.MINIMAX_API_KEY, system, [
        { role: "user", content: prompt },
        { role: "assistant", content: first.text },
        { role: "user", content: "你刚才的回答被截断了。请从中断处直接继续写完剩余内容，不要重复已写过的部分，不要加任何开场白。" },
      ], mt)
      if (cont.ok && cont.text) return json({ ok: true, text: first.text + cont.text })
    }
    return json({ ok: true, text: first.text })
  },
}
