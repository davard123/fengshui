import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAppStore } from "@/store/useAppStore"
import { C } from "@/lib/theme"

type IconName = keyof typeof Ionicons.glyphMap

const TAB_ICON: Record<string, [IconName, IconName]> = {
  index:   ["compass", "compass-outline"],
  tools:   ["grid", "grid-outline"],
  history: ["albums", "albums-outline"],
  me:      ["person-circle", "person-circle-outline"],
}

export default function TabsLayout() {
  const accepted = useAppStore((s) => s.hasAcceptedDisclaimer)
  const hydrated = useAppStore((s) => s.hydrated)
  const showBar = hydrated && accepted

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.goldBright,
        tabBarInactiveTintColor: C.textFaint,
        tabBarStyle: showBar
          ? { backgroundColor: "#100d0a", borderTopColor: C.line }
          : { display: "none" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = TAB_ICON[route.name] ?? ["ellipse", "ellipse-outline"]
          return <Ionicons name={focused ? on : off} size={size - 2} color={color} />
        },
        sceneStyle: { backgroundColor: C.bg },
      })}
    >
      <Tabs.Screen name="index"   options={{ title: "勘宅" }} />
      <Tabs.Screen name="tools"   options={{ title: "工具" }} />
      <Tabs.Screen name="history" options={{ title: "记录" }} />
      <Tabs.Screen name="me"      options={{ title: "我的" }} />
    </Tabs>
  )
}
