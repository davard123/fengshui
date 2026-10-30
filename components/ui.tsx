/**
 * ui.tsx — 共享界面组件（全部页面统一外观）
 */
import type { ReactNode } from "react"
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { C, F, R, S } from "@/lib/theme"

// ── 页面容器 ────────────────────────────────────────────────────────────────
export function Screen({
  children, scroll = true, topInset = false, style,
}: {
  children: ReactNode
  scroll?: boolean
  /** 无导航栏的页面（Tab 首页等）需要自己让出状态栏高度 */
  topInset?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const insets = useSafeAreaInsets()
  const pad = {
    paddingTop: (topInset ? insets.top : 0) + S.lg,
    paddingBottom: insets.bottom + S.xxl,
  }
  if (!scroll) {
    return <View style={[styles.screen, styles.screenInner, pad, style]}>{children}</View>
  }
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenInner, pad, style]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

// ── 卡片 ────────────────────────────────────────────────────────────────────
export function Card({
  children, style, tone, onPress,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  tone?: "gold" | "good" | "bad" | "warn"
  onPress?: () => void
}) {
  const toneStyle =
    tone === "gold" ? { borderColor: C.goldDeep, backgroundColor: "#211a10" } :
    tone === "good" ? { borderColor: "#2c4a38", backgroundColor: C.goodBg } :
    tone === "bad"  ? { borderColor: "#5a2c20", backgroundColor: C.badBg } :
    tone === "warn" ? { borderColor: "#5a4520", backgroundColor: C.warnBg } : null
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, toneStyle, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    )
  }
  return <View style={[styles.card, toneStyle, style]}>{children}</View>
}

// ── 按钮 ────────────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

export function Button({
  title, onPress, variant = "primary", disabled, loading, icon, style, small,
}: {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  style?: StyleProp<ViewStyle>
  small?: boolean
}) {
  const v = BTN[variant]
  const off = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn, small && styles.btnSmall, v.box,
        off && styles.btnDisabled, pressed && !off && styles.pressed, style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} size="small" />
      ) : (
        <View style={styles.btnRow}>
          {icon}
          <Text style={[styles.btnText, small && styles.btnTextSmall, v.text]}>{title}</Text>
        </View>
      )}
    </Pressable>
  )
}

const BTN: Record<ButtonVariant, { box: ViewStyle; text: TextStyle }> = {
  primary:   { box: { backgroundColor: C.gold }, text: { color: C.onGold } },
  secondary: { box: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.goldDeep }, text: { color: C.goldBright } },
  ghost:     { box: { backgroundColor: "transparent", paddingVertical: 10 }, text: { color: C.textMuted, textDecorationLine: "underline" } },
  danger:    { box: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#6a3024" }, text: { color: C.bad } },
}

// ── 文字 ────────────────────────────────────────────────────────────────────
export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>
}
export function Body({ children, style, muted }: { children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[styles.body, muted && { color: C.textMuted }, style]}>{children}</Text>
}
export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.small, style]}>{children}</Text>
}
export function Em({ children }: { children: ReactNode }) {
  return <Text style={styles.em}>{children}</Text>
}

/** 卡片小标题：左侧古铜竖线 */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionBar} />
      <Text style={styles.sectionText}>{children}</Text>
      {right}
    </View>
  )
}

// ── 流程步骤页头 ─────────────────────────────────────────────────────────────
export const FLOW_STEPS = ["定位", "定向", "外局", "内局", "细节", "报告"] as const

export function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle?: ReactNode }) {
  return (
    <View style={styles.stepWrap}>
      <View style={styles.stepTrack}>
        {FLOW_STEPS.map((name, i) => {
          const n = i + 1
          const done = n < step
          const cur = n === step
          return (
            <View key={name} style={styles.stepItem}>
              <View style={[styles.stepDot, done && styles.stepDotDone, cur && styles.stepDotCur]}>
                <Text style={[styles.stepDotText, (done || cur) && { color: C.onGold }]}>{n}</Text>
              </View>
              <Text style={[styles.stepName, cur && { color: C.goldBright }]}>{name}</Text>
            </View>
          )
        })}
      </View>
      <Text style={styles.h1}>{title}</Text>
      {subtitle ? <Text style={styles.body}>{subtitle}</Text> : null}
    </View>
  )
}

// ── 提示条 ──────────────────────────────────────────────────────────────────
export function Notice({ tone = "info", children }: { tone?: "info" | "good" | "bad" | "warn"; children: ReactNode }) {
  const t = NOTICE[tone]
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.small, { color: t.fg }]}>{children}</Text>
    </View>
  )
}
const NOTICE = {
  info: { bg: C.infoBg, fg: C.info, border: "#25374a" },
  good: { bg: C.goodBg, fg: C.good, border: "#2c4a38" },
  bad:  { bg: C.badBg,  fg: C.bad,  border: "#5a2c20" },
  warn: { bg: C.warnBg, fg: C.warn, border: "#5a4520" },
}

// ── 芯片 ────────────────────────────────────────────────────────────────────
export function Chip({
  label, active, onPress, icon, style,
}: { label: string; active?: boolean; onPress?: () => void; icon?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed, style]}
    >
      {icon ? <Text style={styles.chipIcon}>{icon}</Text> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

export function Badge({ label, tone = "gold" }: { label: string; tone?: "gold" | "good" | "bad" | "muted" }) {
  const t =
    tone === "good" ? { bg: C.goodBg, fg: C.good } :
    tone === "bad"  ? { bg: C.badBg, fg: C.bad } :
    tone === "muted"? { bg: C.surface2, fg: C.textMuted } :
                      { bg: "#2c2213", fg: C.goldBright }
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  )
}

// ── 输入框 ──────────────────────────────────────────────────────────────────
export function Field({ label, error, style, ...rest }: TextInputProps & { label?: string; error?: string | null }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={C.textFaint}
        style={[styles.input, !!error && { borderColor: C.bad }, style]}
        {...rest}
      />
      {error ? <Text style={[styles.small, { color: C.bad }]}>{error}</Text> : null}
    </View>
  )
}

// ── 列表行 ──────────────────────────────────────────────────────────────────
export function ListRow({
  icon, title, subtitle, right, onPress,
}: { icon?: string; title: string; subtitle?: string; right?: ReactNode; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && styles.pressed]}
    >
      {icon ? <Text style={styles.listIcon}>{icon}</Text> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.small}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={styles.chevron}>›</Text> : null)}
    </Pressable>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

/** 分数条：-max..+max，中线为 0 */
export function ScoreBar({ label, score: raw, max = 6 }: { label: string; score: number; max?: number }) {
  const score = Math.round(raw * 10) / 10
  const clamped = Math.max(-max, Math.min(max, score))
  const pct = Math.abs(clamped) / max * 50
  const pos = clamped >= 0
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.scoreTrack}>
        <View style={styles.scoreMid} />
        <View
          style={[
            styles.scoreFill,
            pos ? { left: "50%", backgroundColor: C.good } : { right: "50%", backgroundColor: C.bad },
            { width: `${pct}%` },
          ]}
        />
      </View>
      <Text style={[styles.scoreNum, { color: score > 0 ? C.good : score < 0 ? C.bad : C.textMuted }]}>
        {score > 0 ? `+${score}` : score}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  screenInner: { paddingHorizontal: S.xl, gap: S.lg, flexGrow: 1 },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg,
    borderWidth: 1, borderColor: C.line, gap: S.md,
  },
  pressed: { opacity: 0.75 },

  btn: {
    borderRadius: R.lg, paddingVertical: 15, paddingHorizontal: S.lg,
    alignItems: "center", justifyContent: "center", minHeight: 50,
  },
  btnSmall:    { paddingVertical: 9, minHeight: 38, borderRadius: R.md },
  btnRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  btnText:     { fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  btnTextSmall:{ fontSize: 13 },
  btnDisabled: { opacity: 0.4 },

  h1:   { ...F.h1, color: C.text },
  h2:   { ...F.h2, color: C.text },
  body: { ...F.body, color: C.textSub },
  small:{ ...F.small, color: C.textMuted },
  em:   { fontWeight: "800", color: C.goldBright },

  sectionRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBar:  { width: 3, height: 16, borderRadius: 2, backgroundColor: C.gold },
  sectionText: { ...F.h3, color: C.text, flex: 1 },

  stepWrap:  { gap: S.sm },
  stepTrack: { flexDirection: "row", justifyContent: "space-between", marginBottom: S.sm },
  stepItem:  { alignItems: "center", gap: 4, flex: 1 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface,
  },
  stepDotDone: { backgroundColor: C.goldDeep, borderColor: C.goldDeep },
  stepDotCur:  { backgroundColor: C.gold, borderColor: C.goldBright },
  stepDotText: { fontSize: 11, fontWeight: "800", color: C.textMuted },
  stepName:    { fontSize: 10, color: C.textFaint, fontWeight: "700" },

  notice: { borderRadius: R.md, padding: S.md, borderWidth: 1 },

  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.pill,
    paddingHorizontal: 13, paddingVertical: 8, backgroundColor: C.surface,
  },
  chipActive:     { backgroundColor: C.gold, borderColor: C.gold },
  chipIcon:       { fontSize: 14 },
  chipText:       { fontSize: 13, fontWeight: "700", color: C.textSub },
  chipTextActive: { color: C.onGold },

  badge:     { borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "800" },

  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textSub },
  input: {
    borderWidth: 1, borderColor: C.lineStrong, borderRadius: R.md,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: C.surface2, fontSize: 16, color: C.text,
  },

  listRow:   { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  listIcon:  { fontSize: 22, width: 30, textAlign: "center" },
  listTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  chevron:   { fontSize: 22, color: C.textFaint },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.lineStrong },

  scoreRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreLabel: { width: 64, fontSize: 12, color: C.textSub, fontWeight: "700" },
  scoreTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.surface2, overflow: "hidden" },
  scoreMid:   { position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, backgroundColor: C.lineStrong },
  scoreFill:  { position: "absolute", top: 0, bottom: 0, borderRadius: 4 },
  scoreNum:   { width: 30, fontSize: 12, fontWeight: "800", textAlign: "right" },
})
