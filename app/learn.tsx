/**
 * 风水入门 — 本应用用到的术语，一页看懂（离线内容）
 */
import { useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { Card, Screen } from "@/components/ui"
import { C } from "@/lib/theme"

const TOPICS: { title: string; tag: string; body: string }[] = [
  { tag: "基础", title: "坐向", body: "房屋背靠的方向叫「坐」，大门/主立面朝外的方向叫「向」。坐与向相差 180°。一般以大门所在立面向外的垂直方向为向。本应用用卫星轮廓推算，再用手机罗盘验证。" },
  { tag: "基础", title: "二十四山", body: "把 360° 分成 24 份，每份 15°，用八天干（甲乙丙丁庚辛壬癸）、十二地支和四维卦（乾坤艮巽）命名。比八方位更精细，是玄空飞星排盘的依据。" },
  { tag: "基础", title: "太极点（宅中心）", body: "整栋房屋平面的几何中心，所有方位都从这里量起。不规则户型取轮廓面积重心。站在太极点用罗盘看各房间的方向，就能把房间放进九宫。" },
  { tag: "基础", title: "九宫", body: "以太极点为中心，把房屋分成 3×3 九格：八个方位宫加中宫。每一宫对应一个八卦和五行，如北为坎（水）、南为离（火）。" },
  { tag: "八宅", title: "东四宅 / 西四宅", body: "按坐山把房子分两组：坐北、东、东南、南为东四宅；坐西北、西南、西、东北为西四宅。人也按命卦分东四命、西四命，同组相配为吉。" },
  { tag: "八宅", title: "游年八星", body: "生气、延年、天医、伏位为四吉；祸害、六煞、五鬼、绝命为四凶。大门、主卧、灶口宜落吉方，卫生间、储物间宜压凶方。" },
  { tag: "八宅", title: "命卦", body: "由出生年份和性别算出的卦数（1–9，没有 5）。决定个人的四吉四凶方位，用于床头、书桌、座位的朝向。" },
  { tag: "玄空", title: "三元九运", body: "以 20 年为一运，九运 180 年一循环。2024–2043 为九运，九紫火星当令。房屋按建成或大装修入住的年份定运。" },
  { tag: "玄空", title: "飞星盘", body: "运星入中宫按洛书路径飞布九宫，再由坐山、向首的星各自入中顺飞或逆飞，得到每宫的山星（管人丁健康）与向星（管财运）。" },
  { tag: "玄空", title: "旺山旺向 / 上山下水", body: "当运山星到坐方、向星到向方为「旺山旺向」，丁财两旺；颠倒过来为「上山下水」，需要用屋外形势（背后有水、前方有山）来补救。" },
  { tag: "流年", title: "五黄 · 二黑", body: "每年飞星轮转。五黄廉贞最凶，主意外灾病；二黑巨门为病符。所到方位当年宜静，忌动土装修，传统以铜器、金属物化解。" },
  { tag: "流年", title: "太岁 · 岁破 · 三煞", body: "太岁是当年地支所在方位，宜静不宜冲；其对冲方为岁破，忌动土；三煞按三合局定方位，座位床头宜背靠、不宜面对。" },
  { tag: "峦头", title: "四灵：青龙 白虎 朱雀 玄武", body: "站在屋内面朝大门：左为青龙、右为白虎、前为朱雀、后为玄武。理想格局是后有靠（玄武高）、前开阔（朱雀明堂）、左略高于右。" },
  { tag: "峦头", title: "形煞", body: "外部环境的不利形态：路冲（T 字路口正对大门）、反弓（弯道背离房屋）、天斩（两楼夹缝正对）、尖角、高压线等。距离越近影响越大。" },
]

const TAGS = ["全部", "基础", "八宅", "玄空", "流年", "峦头"]

export default function LearnScreen() {
  const [tag, setTag] = useState("全部")
  const [open, setOpen] = useState<string | null>(null)
  const list = tag === "全部" ? TOPICS : TOPICS.filter((t) => t.tag === tag)

  return (
    <Screen>
      <View style={styles.tags}>
        {TAGS.map((t) => (
          <Pressable key={t} onPress={() => setTag(t)} style={[styles.tag, tag === t && styles.tagOn]}>
            <Text style={[styles.tagText, tag === t && styles.tagTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {list.map((t) => {
        const isOpen = open === t.title
        return (
          <Card key={t.title} onPress={() => setOpen(isOpen ? null : t.title)} style={{ gap: 8 }}>
            <View style={styles.head}>
              <Text style={styles.cat}>{t.tag}</Text>
              <Text style={styles.title}>{t.title}</Text>
              <Text style={styles.chev}>{isOpen ? "−" : "+"}</Text>
            </View>
            {isOpen && <Text style={styles.body}>{t.body}</Text>}
          </Card>
        )
      })}
    </Screen>
  )
}

const styles = StyleSheet.create({
  tags:    { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong },
  tagOn:   { backgroundColor: C.gold, borderColor: C.gold },
  tagText: { fontSize: 12, color: C.textSub, fontWeight: "700" },
  tagTextOn: { color: C.onGold },
  head:  { flexDirection: "row", alignItems: "center", gap: 10 },
  cat:   { fontSize: 10, color: C.goldBright, borderWidth: 1, borderColor: C.goldDeep, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  title: { flex: 1, fontSize: 15, fontWeight: "800", color: C.text },
  chev:  { fontSize: 18, color: C.textMuted, width: 18, textAlign: "center" },
  body:  { fontSize: 14, color: C.textSub, lineHeight: 22 },
})
