import { useEffect, useRef } from "react"
import { Animated, View, Text, StyleSheet, Easing } from "react-native"
import Svg, {
  Path, Circle, Text as SvgText, G, Line, Defs,
  RadialGradient, Stop,
} from "react-native-svg"
import { degreeToMountain24 } from "@/lib/fengshui/mountains-24"

// ── Props ──────────────────────────────────────────────────────────────────
type Props = {
  degree: number
  isStable: boolean
  locked: boolean
}

// ── Constants ─────────────────────────────────────────────────────────────
const SIZE   = 320   // rendered size (px)
const VB     = 380   // SVG viewBox side
const CX     = 190   // SVG centre x
const CY     = 190   // SVG centre y
const toR    = (d: number) => (d * Math.PI) / 180

// ── Data ──────────────────────────────────────────────────────────────────
const M24 = [
  { n:"壬", c:345, s:"北",  e:"水" }, { n:"子", c:0,   s:"北",  e:"水" }, { n:"癸", c:15,  s:"北",  e:"水" },
  { n:"丑", c:30,  s:"东北", e:"土" }, { n:"艮", c:45,  s:"东北", e:"土" }, { n:"寅", c:60,  s:"东北", e:"木" },
  { n:"甲", c:75,  s:"东",  e:"木" }, { n:"卯", c:90,  s:"东",  e:"木" }, { n:"乙", c:105, s:"东",  e:"木" },
  { n:"辰", c:120, s:"东南", e:"土" }, { n:"巽", c:135, s:"东南", e:"木" }, { n:"巳", c:150, s:"东南", e:"火" },
  { n:"丙", c:165, s:"南",  e:"火" }, { n:"午", c:180, s:"南",  e:"火" }, { n:"丁", c:195, s:"南",  e:"火" },
  { n:"未", c:210, s:"西南", e:"土" }, { n:"坤", c:225, s:"西南", e:"土" }, { n:"申", c:240, s:"西南", e:"金" },
  { n:"庚", c:255, s:"西",  e:"金" }, { n:"酉", c:270, s:"西",  e:"金" }, { n:"辛", c:285, s:"西",  e:"金" },
  { n:"戌", c:300, s:"西北", e:"土" }, { n:"乾", c:315, s:"西北", e:"金" }, { n:"亥", c:330, s:"西北", e:"水" },
]

const DIZHI = [
  { n:"子",c:0 },{ n:"丑",c:30 },{ n:"寅",c:60 },{ n:"卯",c:90 },
  { n:"辰",c:120 },{ n:"巳",c:150 },{ n:"午",c:180 },{ n:"未",c:210 },
  { n:"申",c:240 },{ n:"酉",c:270 },{ n:"戌",c:300 },{ n:"亥",c:330 },
]

const NINESTAR = [
  { n:"九紫", col:"#5a0808" }, { n:"二黑", col:"#2a1808" }, { n:"三碧", col:"#083a14" },
  { n:"七赤", col:"#3a1400" }, { n:"五黄", col:"#3a2e00" }, { n:"六白", col:"#0c1e38" },
  { n:"八白", col:"#101e2e" }, { n:"一白", col:"#08103a" }, { n:"四绿", col:"#083010" },
]

// 后天八卦（文王，从北顺时针）
const BAGUA_H = [
  { n:"坎", col:"#0c1e38" }, { n:"艮", col:"#1e1604" }, { n:"震", col:"#083a14" }, { n:"巽", col:"#0a3010" },
  { n:"离", col:"#3a0808" }, { n:"坤", col:"#2a1e04" }, { n:"兑", col:"#1a1008" }, { n:"乾", col:"#1e1808" },
]

// 先天八卦（伏羲），yao: 1=阳 0=阴，从北顺时针
const BAGUA_XT = [
  { n:"坤", yao:[0,0,0] as number[] }, { n:"艮", yao:[1,0,0] as number[] },
  { n:"坎", yao:[0,1,0] as number[] }, { n:"巽", yao:[1,1,0] as number[] },
  { n:"震", yao:[0,0,1] as number[] }, { n:"离", yao:[1,0,1] as number[] },
  { n:"兑", yao:[0,1,1] as number[] }, { n:"乾", yao:[1,1,1] as number[] },
]

const ELE_COL: Record<string, string> = {
  水:"#0c1e38", 木:"#083a14", 火:"#3a0808", 土:"#2a1e04", 金:"#2a2010",
}
const DZ_COL: Record<string, string> = {
  子:"#0c1e38", 丑:"#1a1608", 寅:"#083a14", 卯:"#083a14", 辰:"#1e1604",
  巳:"#3a0808", 午:"#3a0808", 未:"#1e1604", 申:"#1e1604", 酉:"#1a1008",
  戌:"#1e1604", 亥:"#0c1e38",
}

// ── SVG helpers ───────────────────────────────────────────────────────────
function arc(r1: number, r2: number, s: number, e: number): string {
  const sr = s - 90, er = e - 90, lg = (e - s) > 180 ? 1 : 0
  const x1 = CX + r2 * Math.cos(toR(sr)), y1 = CY + r2 * Math.sin(toR(sr))
  const x2 = CX + r2 * Math.cos(toR(er)), y2 = CY + r2 * Math.sin(toR(er))
  const x3 = CX + r1 * Math.cos(toR(er)), y3 = CY + r1 * Math.sin(toR(er))
  const x4 = CX + r1 * Math.cos(toR(sr)), y4 = CY + r1 * Math.sin(toR(sr))
  return `M${x1},${y1} A${r2},${r2} 0 ${lg},1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${lg},0 ${x4},${y4} Z`
}

function txtPos(r: number, angleDeg: number) {
  const a = toR(angleDeg - 90)
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) }
}

// ── Pre-rendered disc (static JSX, no state) ───────────────────────────────
function LuopanDisc() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${VB} ${VB}`}>
      <Defs>
        <RadialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#2e1e08" />
          <Stop offset="100%" stopColor="#1a0e03" />
        </RadialGradient>
      </Defs>

      {/* 底盘 */}
      <Circle cx={CX} cy={CY} r={188} fill="url(#bgGrad)" stroke="#6a4a10" strokeWidth={1.5} />
      <Circle cx={CX} cy={CY} r={185} fill="none" stroke="#c8a030" strokeWidth={1.5} />
      <Circle cx={CX} cy={CY} r={181} fill="none" stroke="#8b6010" strokeWidth={0.5} strokeDasharray="5,3" />

      {/* ── 圈1：二十四山 r=160-179 ── */}
      <G>
        {M24.map((m) => {
          const s = m.c - 7.5, e = m.c + 7.5
          const { x, y } = txtPos(170, m.c)
          return (
            <G key={m.n + m.c}>
              <Path d={arc(160, 179, s, e)} fill={ELE_COL[m.e] ?? "#1a1a08"} stroke="#c8a030" strokeWidth={0.8} />
              <SvgText
                x={x} y={y} fontSize={11} fill="#f0d060" fontFamily="serif"
                textAnchor="middle" alignmentBaseline="central"
                rotation={m.c} originX={x} originY={y}
              >{m.n}</SvgText>
            </G>
          )
        })}
      </G>

      {/* ── 圈2：十二地支 r=138-157 ── */}
      <G>
        {DIZHI.map((d) => {
          const s = d.c - 15, e = d.c + 15
          const { x, y } = txtPos(148, d.c)
          return (
            <G key={d.n}>
              <Path d={arc(138, 157, s, e)} fill={DZ_COL[d.n] ?? "#1a1008"} stroke="#c8a030" strokeWidth={0.8} />
              <SvgText
                x={x} y={y} fontSize={10} fill="#d4a840" fontFamily="serif"
                textAnchor="middle" alignmentBaseline="central"
                rotation={d.c} originX={x} originY={y}
              >{d.n}</SvgText>
            </G>
          )
        })}
      </G>

      {/* ── 圈3：九星 r=116-135（9×40°）── */}
      <G>
        {NINESTAR.map((ns, i) => {
          const sa = i * 40, ea = (i + 1) * 40, mid = sa + 20
          const { x, y } = txtPos(126, mid)
          return (
            <G key={ns.n}>
              <Path d={arc(116, 135, sa, ea)} fill={ns.col} stroke="#c8a030" strokeWidth={0.8} />
              <SvgText
                x={x} y={y} fontSize={8} fill="#c8a030" fontFamily="serif"
                textAnchor="middle" alignmentBaseline="central"
                rotation={mid} originX={x} originY={y}
              >{ns.n}</SvgText>
            </G>
          )
        })}
      </G>

      {/* ── 圈4：后天八卦 r=94-113 ── */}
      <G>
        {BAGUA_H.map((b, i) => {
          const sa = i * 45, ea = (i + 1) * 45, mid = sa + 22.5
          const { x, y } = txtPos(104, mid)
          return (
            <G key={b.n}>
              <Path d={arc(94, 113, sa, ea)} fill={b.col} stroke="#c8a030" strokeWidth={0.8} />
              <SvgText
                x={x} y={y} fontSize={12} fill="#f0d060" fontFamily="serif"
                textAnchor="middle" alignmentBaseline="central"
                rotation={mid} originX={x} originY={y}
              >{b.n}</SvgText>
            </G>
          )
        })}
      </G>

      {/* ── 圈5：先天八卦爻线 r=74-91 ── */}
      <G>
        {BAGUA_XT.map((b, i) => {
          const sa = i * 45, ea = (i + 1) * 45, mid = sa + 22.5
          const a = toR(mid - 90)
          const bx = CX + 83 * Math.cos(a), by = CY + 83 * Math.sin(a)
          const lineW = 9, gap = 3.5
          return (
            <G key={b.n}>
              <Path d={arc(74, 91, sa, ea)} fill="#100a02" stroke="#c8a030" strokeWidth={0.8} />
              {[0, 1, 2].map((li) => {
                const lx = bx, ly = by + (li - 1) * gap
                const isYang = b.yao[2 - li] === 1
                if (isYang) {
                  return (
                    <Line key={li}
                      x1={lx - lineW / 2} y1={ly} x2={lx + lineW / 2} y2={ly}
                      stroke="#f0d060" strokeWidth={2} strokeLinecap="round"
                      rotation={mid} originX={bx} originY={by}
                    />
                  )
                }
                return (
                  <G key={li}>
                    <Line
                      x1={lx - lineW / 2} y1={ly} x2={lx - 1.5} y2={ly}
                      stroke="#c8a030" strokeWidth={2} strokeLinecap="round"
                      rotation={mid} originX={bx} originY={by}
                    />
                    <Line
                      x1={lx + 1.5} y1={ly} x2={lx + lineW / 2} y2={ly}
                      stroke="#c8a030" strokeWidth={2} strokeLinecap="round"
                      rotation={mid} originX={bx} originY={by}
                    />
                  </G>
                )
              })}
            </G>
          )
        })}
      </G>

      {/* ── 天池 ── */}
      <Circle cx={CX} cy={CY} r={72} fill="#f2e8d0" stroke="#8b6010" strokeWidth={2.5} />
      <Circle cx={CX} cy={CY} r={67} fill="none" stroke="#c8a030" strokeWidth={0.8} strokeDasharray="4,4" />
      <SvgText x={CX - 9} y={CY + 1} fontSize={14} fill="#3a1a00" fontFamily="serif"
        textAnchor="middle" alignmentBaseline="central">天</SvgText>
      <SvgText x={CX + 9} y={CY + 1} fontSize={14} fill="#3a1a00" fontFamily="serif"
        textAnchor="middle" alignmentBaseline="central">池</SvgText>
    </Svg>
  )
}

// ── Needle (fixed, non-rotating) ───────────────────────────────────────────
function LuopanNeedle({ degree, mountain }: { degree: number; mountain: { name: string } }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${VB} ${VB}`} style={StyleSheet.absoluteFillObject}>
      {/* 红针（北/朝上） */}
      <Path d={`M${CX},110 L${CX - 6},${CY} L${CX + 6},${CY} Z`}
        fill="#cc2200" opacity={0.95} />
      {/* 金针（南/朝下） */}
      <Path d={`M${CX},270 L${CX - 6},${CY} L${CX + 6},${CY} Z`}
        fill="#c8b060" opacity={0.85} />
      {/* 铜钉 */}
      <Circle cx={CX} cy={CY} r={9} fill="#6a4010" stroke="#c8a030" strokeWidth={2} />
      <Circle cx={CX} cy={CY} r={4} fill="#f0d060" />
      {/* 山名 + 度数 */}
      <SvgText x={CX} y={CY + 28} fontSize={16} fill="#1a0800" fontFamily="serif"
        textAnchor="middle" alignmentBaseline="central" fontWeight="bold">{mountain.name}</SvgText>
      <SvgText x={CX} y={CY + 44} fontSize={10} fill="#5a3a08" fontFamily="serif"
        textAnchor="middle" alignmentBaseline="central">{Math.round(degree)}°</SvgText>
    </Svg>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export function LuopanView({ degree, isStable, locked }: Props) {
  const discAnim = useRef(new Animated.Value(0)).current
  const prevDeg  = useRef(degree)
  const cumul    = useRef(0)

  useEffect(() => {
    let delta = degree - prevDeg.current
    if (delta >  180) delta -= 360
    if (delta < -180) delta += 360
    cumul.current  += delta
    prevDeg.current = degree

    Animated.timing(discAnim, {
      toValue:         -cumul.current,
      duration:        180,
      easing:          Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [degree])

  const discRotate = discAnim.interpolate({
    inputRange:  [-7200, 7200],
    outputRange: ["-7200deg", "7200deg"],
  })

  const mountain    = degreeToMountain24(degree)
  const statusColor = locked ? "#c8a030" : isStable ? "#4a7c59" : "#8b6510"

  return (
    <View style={styles.wrapper}>
      {/* 外框圆形边界 */}
      <View style={[styles.frame, { borderColor: statusColor }]}>
        {/* 旋转盘面 */}
        <Animated.View style={[styles.disc, { transform: [{ rotate: discRotate }] }]}>
          <LuopanDisc />
        </Animated.View>

        {/* 固定指针层 */}
        <LuopanNeedle degree={degree} mountain={mountain} />

        {/* 顶部 ▼ 标记 */}
        <View style={styles.topPin} pointerEvents="none">
          <Text style={styles.topPinText}>▼</Text>
        </View>
      </View>

      {/* 状态文字 */}
      <Text style={[styles.status, { color: statusColor }]}>
        {locked
          ? `已锁定 · ${mountain.name}山 · ${mountain.sector}方`
          : isStable
            ? "方向稳定，可以锁定"
            : "正在校准，请保持手机水平…"}
      </Text>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 12,
  },
  frame: {
    width:          SIZE,
    height:         SIZE,
    borderRadius:   SIZE / 2,
    borderWidth:    3,
    overflow:       "hidden",
    alignItems:     "center",
    justifyContent: "center",
    backgroundColor: "#0e0a04",
  },
  disc: {
    width:    SIZE,
    height:   SIZE,
    position: "absolute",
  },
  topPin: {
    position:  "absolute",
    top:       2,
    alignSelf: "center",
  },
  topPinText: {
    fontSize:   14,
    color:      "#cc2200",
    fontWeight: "900",
  },
  status: {
    fontSize:   13,
    fontWeight: "700",
    textAlign:  "center",
  },
})
