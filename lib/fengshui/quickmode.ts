/**
 * 判断 profile 是否为"快速模式"（未填写真实出生信息）
 * 兼容旧档案（无 isQuickMode 字段但 birthDetails 标有"快速模式"）
 */
import type { UserProfile } from "@/types/fengshui"

export function isQuickModeProfile(profile: UserProfile | null | undefined): boolean {
  if (!profile) return true
  if (profile.isQuickMode === true) return true
  // 兼容旧档案
  if (profile.birthDetails?.includes("快速模式")) return true
  return false
}
