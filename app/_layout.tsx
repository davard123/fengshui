import { Stack } from "expo-router"
import { useEffect } from "react"
import { readStorageValue, writeStorageValue } from "@/lib/storage"
import { useAppStore } from "@/store/useAppStore"

const STORAGE_KEY = "fengshui-app-state-v3"

type PersistedState = {
  hasAcceptedDisclaimer?: boolean
  profile?: ReturnType<typeof useAppStore.getState>["profile"]
  assessment?: ReturnType<typeof useAppStore.getState>["assessment"]
  history?: ReturnType<typeof useAppStore.getState>["history"]
}

export default function RootLayout() {
  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const snapshot = await readStorageValue<PersistedState | null>(STORAGE_KEY, null)
      if (cancelled) return
      if (snapshot) {
        useAppStore.setState({
          hasAcceptedDisclaimer: snapshot.hasAcceptedDisclaimer ?? false,
          profile:    snapshot.profile ?? null,
          assessment: snapshot.assessment ?? null,
          history:    snapshot.history ?? [],
        })
      }
      useAppStore.setState({ hydrated: true })
    }

    void hydrate()

    const unsubscribe = useAppStore.subscribe((state) => {
      if (!state.hydrated) return
      void writeStorageValue<PersistedState>(STORAGE_KEY, {
        hasAcceptedDisclaimer: state.hasAcceptedDisclaimer,
        profile:    state.profile,
        assessment: state.assessment,
        history:    state.history,
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index"       options={{ title: "风水评估", headerShown: false }} />
      <Stack.Screen name="address"     options={{ title: "定位房屋" }} />
      <Stack.Screen name="orientation" options={{ title: "定向" }} />
      <Stack.Screen name="exterior"    options={{ title: "外局" }} />
      <Stack.Screen name="palaces"     options={{ title: "九宫内局" }} />
      <Stack.Screen name="room-detail" options={{ title: "房间细节" }} />
      <Stack.Screen name="report"      options={{ title: "综合报告" }} />
      <Stack.Screen name="setup"       options={{ title: "住户信息" }} />
      <Stack.Screen name="history"     options={{ title: "历史记录" }} />
      <Stack.Screen name="settings"    options={{ title: "设置" }} />
    </Stack>
  )
}
