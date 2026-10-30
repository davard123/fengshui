import { StyleSheet, Text } from "react-native"
import { Card, Screen } from "@/components/ui"
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/lib/privacy-text"
import { C } from "@/lib/theme"

export default function PrivacyScreen() {
  return (
    <Screen>
      <Text style={styles.updated}>更新日期：{PRIVACY_UPDATED}</Text>
      {PRIVACY_SECTIONS.map((s) => (
        <Card key={s.title} style={{ gap: 8 }}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </Card>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  updated: { fontSize: 12, color: C.textMuted },
  title:   { fontSize: 15, fontWeight: "800", color: C.goldBright },
  body:    { fontSize: 14, color: C.textSub, lineHeight: 22 },
})
