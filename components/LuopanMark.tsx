/**
 * LuopanMark — 装饰用静态罗盘（首页主视觉 / 空状态）
 * 三圈：后天八卦卦象 · 二十四山 · 刻度；中心天池指针。
 * 与 assets/icon.svg（应用图标源文件）保持同一套视觉。
 */
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg"
import { C } from "@/lib/theme"

// 后天八卦，自北顺时针；yao 自下（靠圆心）而上，1=阳 0=阴
const TRIGRAMS: { n: string; yao: number[] }[] = [
  { n: "坎", yao: [0, 1, 0] }, { n: "艮", yao: [0, 0, 1] },
  { n: "震", yao: [1, 0, 0] }, { n: "巽", yao: [0, 1, 1] },
  { n: "离", yao: [1, 0, 1] }, { n: "坤", yao: [0, 0, 0] },
  { n: "兑", yao: [1, 1, 0] }, { n: "乾", yao: [1, 1, 1] },
]

const M24 = ["子", "癸", "丑", "艮", "寅", "甲", "卯", "乙", "辰", "巽", "巳", "丙",
             "午", "丁", "未", "坤", "申", "庚", "酉", "辛", "戌", "乾", "亥", "壬"]

export function LuopanMark({ size = 220, needle = 0 }: { size?: number; needle?: number }) {
  const c = 100
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const pt = (r: number, d: number) => ({ x: c + r * Math.cos(rad(d)), y: c + r * Math.sin(rad(d)) })

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Circle cx={c} cy={c} r={98} fill="#1a150f" stroke={C.goldDeep} strokeWidth={1.5} />
      <Circle cx={c} cy={c} r={93} fill="none" stroke={C.gold} strokeWidth={0.6} opacity={0.6} />

      {/* 刻度圈 */}
      {Array.from({ length: 72 }, (_, i) => {
        const d = i * 5
        const a = pt(93, d), b = pt(i % 3 === 0 ? 88 : 90.5, d)
        return <Line key={`t${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.goldDeep} strokeWidth={0.6} />
      })}

      {/* 二十四山 */}
      <Circle cx={c} cy={c} r={86} fill="none" stroke={C.goldDeep} strokeWidth={0.6} />
      {M24.map((n, i) => {
        const d = i * 15
        const p = pt(78, d)
        const sep1 = pt(86, d + 7.5), sep2 = pt(70, d + 7.5)
        return (
          <G key={`m${n}`}>
            <Line x1={sep1.x} y1={sep1.y} x2={sep2.x} y2={sep2.y} stroke={C.goldDeep} strokeWidth={0.4} />
            <SvgText
              x={p.x} y={p.y + 3} fontSize={8} fontWeight="700" textAnchor="middle"
              fill={i % 6 === 0 ? C.goldBright : C.gold}
              transform={`rotate(${d} ${p.x} ${p.y})`}
            >{n}</SvgText>
          </G>
        )
      })}

      {/* 八卦卦象 */}
      <Circle cx={c} cy={c} r={70} fill="none" stroke={C.goldDeep} strokeWidth={0.6} />
      {TRIGRAMS.map((t, i) => {
        const d = i * 45
        const center = pt(55, d)
        return (
          <G key={t.n} transform={`rotate(${d} ${center.x} ${center.y})`}>
            {t.yao.map((y, j) => {
              // j=0 最下爻，靠圆心（y 方向朝外为负）
              const yy = center.y + 6 - j * 6
              return y === 1 ? (
                <Line key={j} x1={center.x - 9} y1={yy} x2={center.x + 9} y2={yy} stroke={C.gold} strokeWidth={2.4} />
              ) : (
                <G key={j}>
                  <Line x1={center.x - 9} y1={yy} x2={center.x - 2} y2={yy} stroke={C.gold} strokeWidth={2.4} />
                  <Line x1={center.x + 2} y1={yy} x2={center.x + 9} y2={yy} stroke={C.gold} strokeWidth={2.4} />
                </G>
              )
            })}
          </G>
        )
      })}

      {/* 天池 */}
      <Circle cx={c} cy={c} r={38} fill="none" stroke={C.goldDeep} strokeWidth={0.6} />
      <Circle cx={c} cy={c} r={26} fill="#241c12" stroke={C.gold} strokeWidth={2} />
      <Circle cx={c} cy={c} r={22} fill="none" stroke={C.goldDeep} strokeWidth={0.6} />
      <G transform={`rotate(${needle} ${c} ${c})`}>
        <Path d={`M${c} ${c - 20} L${c + 3.2} ${c} L${c - 3.2} ${c} Z`} fill="#c8553d" />
        <Path d={`M${c} ${c + 20} L${c + 3.2} ${c} L${c - 3.2} ${c} Z`} fill={C.textSub} />
      </G>
      <Circle cx={c} cy={c} r={3} fill={C.goldBright} />
    </Svg>
  )
}
