/**
 * print-report.ts — 可打印 A4 报告（HTML + 内嵌 SVG 配图）
 *
 * 配图全部由评估数据生成（专业 + 可打印 + 零成本）：
 *   图1 玄空飞星九宫图（山星/向星/运星 + 吉凶着色）
 *   图2 九宫房间布局图（房间放置 + 游年星）
 *   图3 外局相对方位图（三距离环 + 四灵象限 + 地物点位）
 *
 * 原生端走 expo-print（系统打印/存PDF），Web 端新窗口 window.print()。
 */

import type { AssessmentV3, PalaceId } from "@/types/fengshui"
import type { ReportV3 } from "./report-v3"
import { PALACE_ORDER_GRID, PALACE_INFO, ROOM_INFO, RING_CONFIG, type RoomType } from "./palaces"
import { PATTERN_MEANING } from "./flying-stars"

const GOOD_STARS = new Set(["生气", "延年", "天医", "伏位"])

// 与 bazhai-rules.ts 一致的游年表（打印图用）
const EIGHT_MANSIONS: Record<string, Record<string, string>> = {
  N:  { N: "伏位", NE: "五鬼", E: "天医", SE: "生气", S: "延年", SW: "绝命", W: "祸害", NW: "六煞" },
  NE: { NE: "伏位", E: "六煞", SE: "绝命", S: "祸害", SW: "生气", W: "延年", NW: "天医", N: "五鬼" },
  E:  { E: "伏位", SE: "延年", S: "生气", SW: "祸害", W: "绝命", NW: "五鬼", N: "天医", NE: "六煞" },
  SE: { SE: "伏位", S: "天医", SW: "五鬼", W: "六煞", NW: "祸害", N: "生气", NE: "绝命", E: "延年" },
  S:  { S: "伏位", SW: "六煞", W: "五鬼", NW: "绝命", N: "延年", NE: "祸害", E: "生气", SE: "天医" },
  SW: { SW: "伏位", W: "天医", NW: "延年", N: "绝命", NE: "生气", E: "祸害", SE: "五鬼", S: "六煞" },
  W:  { W: "伏位", NW: "生气", N: "祸害", NE: "延年", E: "绝命", SE: "六煞", S: "五鬼", SW: "天医" },
  NW: { NW: "伏位", N: "六煞", NE: "天医", E: "五鬼", SE: "祸害", S: "绝命", SW: "延年", W: "生气" },
}
const MOUNTAIN_TO_DIR8: Record<string, string> = {
  壬: "N", 子: "N", 癸: "N", 丑: "NE", 艮: "NE", 寅: "NE",
  甲: "E", 卯: "E", 乙: "E", 辰: "SE", 巽: "SE", 巳: "SE",
  丙: "S", 午: "S", 丁: "S", 未: "SW", 坤: "SW", 申: "SW",
  庚: "W", 酉: "W", 辛: "W", 戌: "NW", 乾: "NW", 亥: "NW",
}

// ── 图1：玄空飞星九宫图 ──────────────────────────────────────────────────────
function svgFlyingStars(r: ReportV3): string {
  if (!r.flyingStars) return ""
  const fs = r.flyingStars
  const CELL = 110, GAP = 6
  const W = CELL * 3 + GAP * 2

  let cells = ""
  PALACE_ORDER_GRID.forEach((row, ri) => {
    row.forEach((p, ci) => {
      const s = fs.palaces[p]
      const x = ci * (CELL + GAP), y = ri * (CELL + GAP)
      const isCenter = p === "CENTER"
      const isWealth = !isCenter && s.facing === fs.period
      const isHealth = !isCenter && s.mountain === fs.period
      const bg = isCenter ? "#f0e4cc" : isWealth ? "#e3f2e6" : isHealth ? "#e8eef7" : "#fdf8ee"
      cells += `
  <g>
    <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="8" fill="${bg}" stroke="#c8a878" stroke-width="1.2"/>
    <text x="${x + CELL / 2}" y="${y + 20}" text-anchor="middle" font-size="12" fill="#8d6b4c">${PALACE_INFO[p].label} ${PALACE_INFO[p].bagua}</text>
    <text x="${x + CELL / 2 - 18}" y="${y + 58}" text-anchor="middle" font-size="28" font-weight="bold" fill="#6b3e1a">${s.mountain}</text>
    <text x="${x + CELL / 2 + 18}" y="${y + 58}" text-anchor="middle" font-size="28" font-weight="bold" fill="#1a4b6b">${s.facing}</text>
    <text x="${x + CELL / 2}" y="${y + 82}" text-anchor="middle" font-size="13" fill="#9b8878">${s.base}</text>
    ${isWealth ? `<text x="${x + CELL / 2}" y="${y + 100}" text-anchor="middle" font-size="10" fill="#2d6a3f" font-weight="bold">★ 当运财位</text>` : ""}
    ${isHealth && !isWealth ? `<text x="${x + CELL / 2}" y="${y + 100}" text-anchor="middle" font-size="10" fill="#1a4b6b" font-weight="bold">★ 当运丁位</text>` : ""}
  </g>`
    })
  })
  return `<svg viewBox="0 0 ${W} ${W}" width="340" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`
}

// ── 图2：九宫房间布局图 ──────────────────────────────────────────────────────
function svgRoomLayout(a: AssessmentV3): string {
  const CELL = 110, GAP = 6
  const W = CELL * 3 + GAP * 2
  const sittingDir8 = a.orientation ? MOUNTAIN_TO_DIR8[a.orientation.sittingMountain] : null
  const energies = sittingDir8 ? EIGHT_MANSIONS[sittingDir8] : null

  const roomsIn = (p: PalaceId) =>
    a.placements.filter((pl) => (pl.palaces ?? [pl.primaryPalace]).includes(p))
      .map((pl) => ROOM_INFO[pl.room as RoomType]?.label ?? pl.room)

  let cells = ""
  PALACE_ORDER_GRID.forEach((row, ri) => {
    row.forEach((p, ci) => {
      const x = ci * (CELL + GAP), y = ri * (CELL + GAP)
      const isCenter = p === "CENTER"
      const energy = !isCenter && energies ? energies[p] : null
      const good = energy ? GOOD_STARS.has(energy) : null
      const rooms = roomsIn(p)
      const bg = isCenter ? "#f0e4cc" : good === true ? "#eaf5ec" : good === false ? "#fbeeea" : "#fdf8ee"
      const roomLines = rooms.slice(0, 3).map((rm, i) =>
        `<text x="${x + CELL / 2}" y="${y + 58 + i * 16}" text-anchor="middle" font-size="12" font-weight="bold" fill="#2a2118">${rm}</text>`
      ).join("")
      cells += `
  <g>
    <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="8" fill="${bg}" stroke="#c8a878" stroke-width="1.2"/>
    <text x="${x + CELL / 2}" y="${y + 20}" text-anchor="middle" font-size="12" fill="#8d6b4c">${PALACE_INFO[p].label}</text>
    ${energy ? `<text x="${x + CELL / 2}" y="${y + 38}" text-anchor="middle" font-size="12" font-weight="bold" fill="${good ? "#2d6a3f" : "#b03020"}">${energy}</text>` : ""}
    ${roomLines || (isCenter ? `<text x="${x + CELL / 2}" y="${y + 62}" text-anchor="middle" font-size="11" fill="#bbaa90">太极</text>` : "")}
  </g>`
    })
  })
  return `<svg viewBox="0 0 ${W} ${W}" width="340" xmlns="http://www.w3.org/2000/svg">${cells}</svg>`
}

// ── 图3：外局相对方位图（三环 + 四灵 + 地物）────────────────────────────────
function svgExteriorMap(a: AssessmentV3): string {
  const features = a.external.filter((f) => f.confirmed)
  const SIZE = 360, C = SIZE / 2
  const R_NEAR = 50, R_MID = 100, R_FAR = 160
  const facing = a.orientation?.facingDegree ?? 0

  // 地物点位：按 ring 放置半径，按（方位角-朝向角）放置角度——朝向永远朝上
  const dots = features.map((f) => {
    const rel = ((f.bearingFromCenter - facing) % 360 + 360) % 360
    const rad = (rel - 90) * Math.PI / 180
    const rr = f.ring === "near" ? R_NEAR * 0.75 : f.ring === "mid" ? (R_NEAR + R_MID) / 2 : (R_MID + R_FAR) / 2
    const x = C + rr * Math.cos(rad), y = C + rr * Math.sin(rad)
    const isSha = ["T字路口", "反弓", "天斩", "墓地", "高压", "尖", "高速"].some((k) => f.kind.includes(k))
    return `
  <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${isSha ? "#b03020" : "#3a7af0"}"/>
  <text x="${x.toFixed(1)}" y="${(y - 9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#46392c">${f.kind.slice(0, 6)} ${f.distance}m</text>`
  }).join("")

  return `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="340" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${C}" cy="${C}" r="${R_FAR}" fill="none" stroke="#d8c8a8" stroke-width="1" stroke-dasharray="3,5"/>
  <circle cx="${C}" cy="${C}" r="${R_MID}" fill="none" stroke="#c8a878" stroke-width="1" stroke-dasharray="6,4"/>
  <circle cx="${C}" cy="${C}" r="${R_NEAR}" fill="none" stroke="#b08850" stroke-width="1.5"/>
  <line x1="${C - R_FAR}" y1="${C}" x2="${C + R_FAR}" y2="${C}" stroke="#e8dcc4" stroke-width="1"/>
  <line x1="${C}" y1="${C - R_FAR}" x2="${C}" y2="${C + R_FAR}" stroke="#e8dcc4" stroke-width="1"/>
  <polygon points="${C},${C - R_FAR - 14} ${C - 7},${C - R_FAR + 2} ${C + 7},${C - R_FAR + 2}" fill="#b03020"/>
  <text x="${C}" y="${C - R_FAR - 20}" text-anchor="middle" font-size="13" font-weight="bold" fill="#b03020">前 · 朱雀（朝向）</text>
  <text x="${C}" y="${C + R_FAR + 26}" text-anchor="middle" font-size="12" fill="#46392c">后 · 玄武（坐山）</text>
  <text x="${C - R_FAR - 8}" y="${C + 4}" text-anchor="end" font-size="12" fill="#46392c">左 · 青龙</text>
  <text x="${C + R_FAR + 8}" y="${C + 4}" text-anchor="start" font-size="12" fill="#46392c">右 · 白虎</text>
  <circle cx="${C}" cy="${C}" r="6" fill="#b03020"/>
  <text x="${C}" y="${C + 22}" text-anchor="middle" font-size="10" fill="#8d6b4c">宅(太极点)</text>
  <text x="${C + 6}" y="${C - R_NEAR + 14}" font-size="9" fill="#9b8878">${RING_CONFIG.near.label}</text>
  <text x="${C + 6}" y="${C - R_MID + 14}" font-size="9" fill="#9b8878">${RING_CONFIG.mid.label}</text>
  <text x="${C + 6}" y="${C - R_FAR + 14}" font-size="9" fill="#9b8878">${RING_CONFIG.far.label}</text>
  ${dots}
</svg>`
}

// ── findings → 打印行 ────────────────────────────────────────────────────────
function findingRows(
  items: { name: string; location: string; description: string; classic?: string; suggestion?: string; score: number }[],
): string {
  return items.map((f) => `
    <div class="finding ${f.score >= 0 ? "good" : "bad"}">
      <div class="f-head">${f.score >= 0 ? "✓" : "⚠"} <b>${f.name}</b> <span class="f-loc">${f.location}</span></div>
      <div class="f-desc">${f.description}</div>
      ${f.classic ? `<div class="f-classic">📜 ${f.classic}</div>` : ""}
      ${f.suggestion ? `<div class="f-sug">💡 ${f.suggestion}</div>` : ""}
    </div>`).join("")
}

// ── 主函数 ───────────────────────────────────────────────────────────────────
export function buildPrintHTML(a: AssessmentV3, r: ReportV3): string {
  const date = new Date().toLocaleDateString("zh-CN")
  const fsPattern = r.flyingStars ? PATTERN_MEANING[r.flyingStars.pattern] : null
  const allNeg = [...r.exterior, ...(r.bazhai?.findings ?? []), ...r.interior].filter((f) => f.score < 0).sort((x, y) => x.score - y.score)
  const allPos = [...r.exterior, ...(r.bazhai?.findings ?? []), ...r.interior].filter((f) => f.score > 0).sort((x, y) => y.score - x.score)

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<title>风水评估报告 - ${a.address}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Songti SC", serif;
    color: #2a2118; background: #fff;
    max-width: 720px; margin: 0 auto; padding: 28px 32px;
    font-size: 13px; line-height: 1.65;
  }
  @media print {
    body { padding: 0; max-width: none; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .finding, .sec, figure { page-break-inside: avoid; }
  }
  .cover { text-align: center; border-bottom: 3px double #b08850; padding-bottom: 18px; margin-bottom: 22px; }
  .cover h1 { font-size: 26px; letter-spacing: 6px; color: #6b3e1a; }
  .cover .addr { font-size: 15px; margin-top: 8px; }
  .cover .meta { font-size: 11px; color: #8d6b4c; margin-top: 6px; }
  .rating-badge {
    display: inline-block; margin-top: 12px;
    font-size: 30px; font-weight: 900; letter-spacing: 4px;
    padding: 6px 28px; border: 2.5px solid currentColor; border-radius: 12px;
  }
  .summary { margin-top: 10px; font-size: 13px; color: #46392c; }

  .sec { margin-top: 24px; }
  .sec h2 {
    font-size: 16px; color: #6b3e1a;
    border-left: 5px solid #b08850; padding-left: 10px;
    margin-bottom: 10px;
  }
  .sec h3 { font-size: 13px; color: #8d6b4c; margin: 10px 0 6px; }

  figure { text-align: center; margin: 14px 0; }
  figcaption { font-size: 11px; color: #9b8878; margin-top: 6px; }

  .kv { display: flex; gap: 16px; flex-wrap: wrap; margin: 8px 0; }
  .kv .item { background: #faf5ea; border: 1px solid #e3d0b0; border-radius: 8px; padding: 8px 14px; }
  .kv .k { font-size: 10px; color: #8d6b4c; }
  .kv .v { font-size: 15px; font-weight: bold; color: #2a2118; }

  .finding { border-left: 4px solid; border-radius: 6px; padding: 8px 12px; margin: 8px 0; background: #fbf8f2; }
  .finding.good { border-color: #2d6a3f; }
  .finding.bad  { border-color: #b03020; }
  .f-head { font-size: 13px; }
  .f-loc  { font-size: 10px; color: #9b8878; margin-left: 6px; }
  .f-desc { font-size: 12px; color: #46392c; margin-top: 3px; }
  .f-classic { font-size: 11px; color: #8d6b4c; font-style: italic; margin-top: 3px; }
  .f-sug  { font-size: 12px; color: #2d6a3f; margin-top: 3px; }

  .actions { background: #f5eedd; border-radius: 10px; padding: 14px 16px; }
  .actions ol { padding-left: 20px; }
  .actions li { margin: 5px 0; }

  .ai-text { white-space: pre-wrap; background: #fbf8f2; border: 1px solid #e8dcc4; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; }

  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e3d0b0; font-size: 10px; color: #9b8878; text-align: center; line-height: 1.8; }
  .print-btn {
    position: fixed; top: 16px; right: 16px;
    padding: 10px 22px; background: #6b3e1a; color: #fff;
    border: none; border-radius: 10px; font-size: 14px; cursor: pointer;
  }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">🖨 打印 / 存PDF</button>

<div class="cover">
  <h1>阳宅风水评估报告</h1>
  <div class="addr">${a.address}</div>
  <div class="meta">${r.orientationText}${a.builtYear ? ` · ${a.builtYear}年建造` : ""} · 评估日期 ${date}</div>
  <div class="rating-badge" style="color:${r.overallScore >= 0 ? "#2d6a3f" : "#b03020"};">${r.overallRating}</div>
  <div class="summary">${r.summary}</div>
</div>

${r.flyingStars ? `
<div class="sec">
  <h2>一、玄空飞星盘</h2>
  <p>${r.flyingStarSummary ?? ""}</p>
  ${fsPattern ? `<p style="margin-top:6px;color:#6b3e1a;"><b>布局要领：</b>${fsPattern.advice}</p>` : ""}
  <figure>
    ${svgFlyingStars(r)}
    <figcaption>图1 · 玄空飞星九宫图（每宫左=山星 右=向星 下=运星；绿底=当运财位 蓝底=当运丁位）</figcaption>
  </figure>
  ${r.palaceNotes.length > 0 ? `<h3>宫位要点</h3>${r.palaceNotes.map((n) => `<div class="finding ${n.good ? "good" : "bad"}"><div class="f-desc">${n.good ? "✓" : "⚠"} ${n.text}</div></div>`).join("")}` : ""}
</div>` : ""}

<div class="sec">
  <h2>${r.flyingStars ? "二" : "一"}、九宫房间布局（八宅）</h2>
  ${r.bazhai ? `<div class="kv">
    <div class="item"><div class="k">宅卦</div><div class="v">${r.bazhai.houseGua}</div></div>
    ${r.bazhai.kuaGroup ? `<div class="item"><div class="k">住户命卦</div><div class="v">${r.bazhai.kuaGroup}</div></div>` : ""}
    ${r.bazhai.groupMatch !== undefined ? `<div class="item"><div class="k">人宅匹配</div><div class="v">${r.bazhai.groupMatch ? "✓ 相配" : "✗ 不配"}</div></div>` : ""}
  </div>` : ""}
  <figure>
    ${svgRoomLayout(a)}
    <figcaption>图2 · 房间宫位布局图（绿底=吉星宫 红底=凶星宫；正北朝上）</figcaption>
  </figure>
  ${r.bazhai && r.bazhai.findings.length > 0 ? findingRows(r.bazhai.findings) : ""}
</div>

<div class="sec page-break">
  <h2>${r.flyingStars ? "三" : "二"}、外局形势（峦头）</h2>
  <figure>
    ${svgExteriorMap(a)}
    <figcaption>图3 · 外局相对方位图（朝向朝上；红点=形煞类 蓝点=一般地物；三环=近50m/中200m/远1km）</figcaption>
  </figure>
  ${r.exterior.length > 0 ? findingRows(r.exterior) : `<p style="color:#9b8878;">未发现显著外局格局。</p>`}
</div>

${r.interior.length > 0 ? `
<div class="sec">
  <h2>${r.flyingStars ? "四" : "三"}、室内细节</h2>
  ${findingRows(r.interior)}
</div>` : ""}

${r.topActions.length > 0 ? `
<div class="sec">
  <h2>${r.flyingStars ? "五" : "四"}、优先改善行动</h2>
  <div class="actions"><ol>${r.topActions.map((t) => `<li>${t}</li>`).join("")}</ol></div>
</div>` : ""}

${a.reportText ? `
<div class="sec page-break">
  <h2>${r.flyingStars ? "六" : "五"}、深度综合分析</h2>
  <div class="ai-text">${a.reportText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
</div>` : ""}

${allPos.length + allNeg.length > 0 ? `
<div class="sec">
  <h2>附录 · 格局总表</h2>
  <h3>有利格局（${allPos.length}）</h3>
  ${allPos.map((f) => `<div style="font-size:12px;margin:2px 0;">✓ ${f.name}（${f.location}）</div>`).join("")}
  <h3>不利格局（${allNeg.length}）</h3>
  ${allNeg.map((f) => `<div style="font-size:12px;margin:2px 0;">⚠ ${f.name}（${f.location}）</div>`).join("")}
</div>` : ""}

<div class="footer">
  本报告基于传统风水文化（玄空飞星·八宅·峦头）与公开地理数据自动生成，仅供文化参考与娱乐，<br>
  不构成购房、投资、医疗或任何重大决策建议。 · 九宫风水参考 App · ${date}
</div>
</body>
</html>`
}
