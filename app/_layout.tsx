import { Stack } from "expo-router"
import { useEffect } from "react"
import { StatusBar } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { readStorageValue, writeStorageValue } from "@/lib/storage"
import { useAppStore } from "@/store/useAppStore"
import { C } from "@/lib/theme"

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
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.goldBright,
          headerTitleStyle: { color: C.text, fontWeight: "800" },
          headerShadowVisible: false,
          headerBackTitle: "返回",
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)"      options={{ headerShown: false, title: "首页" }} />
        <Stack.Screen name="address"     options={{ title: "定位房屋" }} />
        <Stack.Screen name="orientation" options={{ title: "定向" }} />
        <Stack.Screen name="exterior"    options={{ title: "外局" }} />
        <Stack.Screen name="palaces"     options={{ title: "九宫内局" }} />
        <Stack.Screen name="room-detail" options={{ title: "房间细节" }} />
        <Stack.Screen name="report"      options={{ title: "综合报告" }} />
        <Stack.Screen name="setup"       options={{ title: "住户命卦", presentation: "modal" }} />
        <Stack.Screen name="kua"         options={{ title: "个人吉凶方" }} />
        <Stack.Screen name="annual"      options={{ title: "流年飞星" }} />
        <Stack.Screen name="compass"     options={{ title: "罗盘" }} />
        <Stack.Screen name="learn"       options={{ title: "风水入门" }} />
        <Stack.Screen name="privacy"     options={{ title: "隐私政策" }} />
        <Stack.Screen name="ai-settings" options={{ title: "高级设置" }} />
      </Stack>
    </SafeAreaProvider>
  )
}
