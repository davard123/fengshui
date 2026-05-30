/**
 * DirectionRing — SVG-based tappable compass ring
 * Each sector is a pie slice; filled sectors are highlighted.
 * The facing direction always renders at top (renderAngle handles this).
 */
import { View, Text, StyleSheet } from "react-native"
import Svg, { Path, Circle, Text as SvgText, G } from "react-native-svg"
import type { RingSegment } from "@/lib/fengshui/mountains-24"

type Props = {
  segments: RingSegment[]
  filledMap: Record<string, string[]>
  onSegmentPress: (segment: RingSegment) => void
  size?: number
}

const toR = (d: number) => (d * Math.PI) / 180

function sectorPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number,
): string {
  // Rotate so 0° = top (subtract 90°)
  const s = startDeg - 90, e = endDeg - 90
  const lg = (endDeg - startDeg) > 180 ? 1 : 0
  const x1 = cx + outerR * Math.cos(toR(s)), y1 = cy + outerR * Math.sin(toR(s))
  const x2 = cx + outerR * Math.cos(toR(e)), y2 = cy + outerR * Math.sin(toR(e))
  const x3 = cx + innerR * Math.cos(toR(e)), y3 = cy + innerR * Math.sin(toR(e))
  const x4 = cx + innerR * Math.cos(toR(s)), y4 = cy + innerR * Math.sin(toR(s))
  return `M${x1},${y1} A${outerR},${outerR} 0 ${lg},1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${lg},0 ${x4},${y4} Z`
}

export function DirectionRing({
  segments, filledMap, onSegmentPress, size = 300,
}: Props) {
  const cx       = size / 2
  const cy       = size / 2
  const outerR   = size / 2 - 6
  const innerR   = size / 2 - 72    // leave centre for count display
  const labelR   = size / 2 - 36    // mid-ring radius for text
  const segCount = segments.length
  const segAngle = 360 / segCount   // 15° for 24-山, 45° for 8-方位

  const filledCount = Object.values(filledMap).filter((v) => v.length > 0).length

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle cx={cx} cy={cy} r={outerR} fill="#1a0e03" stroke="#6a4a10" strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={outerR - 2} fill="none" stroke="#c8a030" strokeWidth={1} />

        {/* Sectors */}
        {segments.map((seg) => {
          const filled  = (filledMap[seg.direction] ?? []).length > 0
          // renderAngle already accounts for the facing-at-top rotation.
          // Each segment spans ±segAngle/2 around its renderAngle.
          const midAngle  = seg.renderAngle
          const startAngle = midAngle - segAngle / 2
          const endAngle   = midAngle + segAngle / 2

          const fillColor   = filled   ? "#8d6b4c" : "#1e1608"
          const strokeColor = "#c8a030"
          const textColor   = filled   ? "#fff"    : "#d4a840"

          // Label position (mid of sector)
          const labelAngle = toR(midAngle - 90)
          const lx = cx + labelR * Math.cos(labelAngle)
          const ly = cy + labelR * Math.sin(labelAngle)

          return (
            <G key={seg.direction}>
              <Path
                d={sectorPath(cx, cy, innerR, outerR, startAngle, endAngle)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={0.8}
                onPress={() => onSegmentPress(seg)}
              />
              <SvgText
                x={lx} y={ly}
                fontSize={segCount === 24 ? 10 : 13}
                fill={textColor}
                fontFamily="serif"
                fontWeight={filled ? "bold" : "normal"}
                textAnchor="middle"
                alignmentBaseline="central"
                rotation={midAngle}
                originX={lx}
                originY={ly}
              >
                {seg.label}
              </SvgText>
              {filled && (
                <Circle
                  cx={lx + 0}
                  cy={ly + (segCount === 24 ? 8 : 10)}
                  r={2.5}
                  fill="#f0d060"
                  rotation={midAngle}
                  originX={lx}
                  originY={ly}
                />
              )}
            </G>
          )
        })}

        {/* Inner ring border */}
        <Circle cx={cx} cy={cy} r={innerR} fill="#0e0a04" stroke="#c8a030" strokeWidth={1} />
        <Circle cx={cx} cy={cy} r={innerR - 4} fill="none" stroke="#8b6010" strokeWidth={0.5} strokeDasharray="3,3" />

        {/* Centre: count display */}
        <Circle cx={cx} cy={cy} r={innerR - 8} fill="#2a1808" />
        <SvgText
          x={cx} y={cy - 8}
          fontSize={30} fill="#f5e6c8" fontFamily="serif" fontWeight="bold"
          textAnchor="middle" alignmentBaseline="central"
        >{filledCount}</SvgText>
        <SvgText
          x={cx} y={cy + 16}
          fontSize={10} fill="#a89070" fontFamily="serif"
          textAnchor="middle" alignmentBaseline="central"
        >已标记</SvgText>

        {/* Top marker pin */}
        <Circle cx={cx} cy={6} r={4} fill="#cc2200" />
      </Svg>
    </View>
  )
}
