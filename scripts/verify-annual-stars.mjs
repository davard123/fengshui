/**
 * 流年飞星基准验证
 * 用法: node scripts/verify-annual-stars.mjs
 * 基准：公开通书 —— 2024 三碧入中（五黄到西）、2025 二黑（五黄到东北）、2026 一白（五黄到南、二黑到西北）、2027 九紫（五黄到北）
 */
import fs from "node:fs"
import ts from "typescript"

const src = fs.readFileSync(new URL("../lib/fengshui/annual-stars.ts", import.meta.url), "utf8")
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
const mod = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"))

const cases = [
  { year: 2024, center: 3, ganzhi: "甲辰", five: "W" },
  { year: 2025, center: 2, ganzhi: "乙巳", five: "NE" },
  { year: 2026, center: 1, ganzhi: "丙午", five: "S", two: "NW", taisui: "S", suipo: "N", sansha: "N" },
  { year: 2027, center: 9, ganzhi: "丁未", five: "N" },
]
let fail = 0
for (const c of cases) {
  const ch = mod.computeAnnualChart(c.year)
  const find = (n) => Object.keys(ch.palaces).find((p) => p !== "CENTER" && ch.palaces[p] === n)
  const checks = [
    ["入中", ch.centerStar, c.center], ["干支", ch.ganzhi, c.ganzhi], ["五黄", find(5), c.five],
    ...(c.two ? [["二黑", find(2), c.two]] : []),
    ...(c.taisui ? [["太岁", ch.taisui.palace, c.taisui], ["岁破", ch.suipo.palace, c.suipo], ["三煞", ch.sansha.palace, c.sansha]] : []),
  ]
  for (const [name, got, want] of checks) {
    const ok = got === want
    if (!ok) fail++
    console.log(`${ok ? "✓" : "✗"} ${c.year} ${name}: ${got}${ok ? "" : ` (应为 ${want})`}`)
  }
}
console.log(fail ? `\n${fail} 项失败 ✗` : "\n流年飞星全部验证通过 ✓")
process.exit(fail ? 1 : 0)
