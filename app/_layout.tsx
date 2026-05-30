import { Stack } from "expo-router"
import { useEffect } from "react"
import { readStorageValue, writeStorageValue } from "@/lib/storage"
import { useAppStore } from "@/store/useAppStore"

const STORAGE_KEY = "fengshui-app-state-v2"

type PersistedState = {
  hasAcceptedDisclaimer?: boolean
  profile?: ReturnType<typeof useAppStore.getState>["profile"]
  address?: string
  standingPoints?: ReturnType<typeof useAppStore.getState>["standingPoints"]
  currentFullAssessment?: ReturnType<typeof useAppStore.getState>["currentFullAssessment"]
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
          profile:               snapshot.profile ?? null,
          address:               snapshot.address ?? "",
          standingPoints:        snapshot.standingPoints ?? [],
          currentFullAssessment: snapshot.currentFullAssessment ?? null,
          history:               snapshot.history ?? [],
        })
      }
      useAppStore.setState({ hydrated: true })
    }

    void hydrate()

    const unsubscribe = useAppStore.subscribe((state) => {
      if (!state.hydrated) return
      void writeStorageValue<PersistedState>(STORAGE_KEY, {
        hasAcceptedDisclaimer: state.hasAcceptedDisclaimer,
        profile:               state.profile,
        address:               state.address,
        standingPoints:        state.standingPoints,
        currentFullAssessment: state.currentFullAssessment,
        history:               state.history,
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return (
    <Stack screenOptions={{ headerTitleAlign: "center" }}>
      <Stack.Screen name="index"          options={{ title: "风水评估", headerShown: false }} />
      <Stack.Screen name="address"        options={{ title: "房产地址" }} />
      <Stack.Screen name="setup"          options={{ title: "个人信息" }} />
      <Stack.Screen name="compass"        options={{ title: "罗盘采集" }} />
      <Stack.Screen name="point-select"   options={{ title: "选择站点" }} />
      <Stack.Screen name="direction-map"  options={{ title: "方位标记" }} />
      <Stack.Screen name="point-analysis" options={{ title: "站点分析" }} />
      <Stack.Screen name="synthesis"      options={{ title: "综合报告" }} />
      <Stack.Screen name="history"        options={{ title: "历史记录" }} />
      <Stack.Screen name="settings"       options={{ title: "设置" }} />
    </Stack>
  )
}
