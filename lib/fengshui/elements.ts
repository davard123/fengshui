import type { StandingPointType } from "@/types/fengshui"

// ─── 元素分组 ─────────────────────────────────────────────────────────────────

export type ElementGroup = {
  group: string
  items: string[]
}

// ─── 室外大门（24山）可选元素 ─────────────────────────────────────────────────

export const OUTDOOR_ELEMENTS: ElementGroup[] = [
  {
    group: "山水",
    items: ["山/高地", "水（湖河海）", "小溪水渠", "低洼地"],
  },
  {
    group: "道路",
    items: ["小路街道", "主干道", "高速公路"],
  },
  {
    group: "路形",
    items: ["弯道朝向大门", "弯道背离大门", "T字路口正对", "路冲直射"],
  },
  {
    group: "建筑",
    items: ["低矮建筑", "高楼", "尖顶建筑", "方形建筑", "圆形建筑"],
  },
  {
    group: "自然",
    items: ["树林密树", "空地/开阔", "草坪绿地"],
  },
  {
    group: "特殊",
    items: ["高压线", "停车场", "墓地", "加油站", "医院", "工业设施"],
  },
]

// ─── 室内元素（按站点类型） ──────────────────────────────────────────────────

const INDOOR_COMMON: ElementGroup[] = [
  {
    group: "门",
    items: ["大门", "主卧门", "次卧门", "儿童房门", "厨房门", "卫生间门", "书房门", "储物间门"],
  },
  {
    group: "窗",
    items: ["落地窗", "普通窗户", "阳台门", "天窗"],
  },
  {
    group: "结构",
    items: ["实墙", "开阔/无遮挡", "柱子", "楼梯向上↑", "楼梯向下↓", "壁炉"],
  },
]

const HOUSE_CENTER_ELEMENTS: ElementGroup[] = [
  {
    group: "功能区",
    items: ["客厅", "主卧", "次卧", "厨房", "卫生间", "书房", "餐厅", "储物间", "车库", "院子"],
  },
  ...INDOOR_COMMON,
]

const LIVING_ROOM_ELEMENTS: ElementGroup[] = [
  {
    group: "气口",
    items: ["大门", "阳台门", "落地窗"],
  },
  {
    group: "相邻空间",
    items: ["餐厅", "厨房", "主卧", "走廊", "玄关"],
  },
  {
    group: "家具方位",
    items: ["沙发朝向", "电视墙", "财位摆件"],
  },
  ...INDOOR_COMMON,
]

const MASTER_BEDROOM_ELEMENTS: ElementGroup[] = [
  {
    group: "床位",
    items: ["床头靠墙", "床头朝向此方"],
  },
  {
    group: "冲克",
    items: ["卫生间门正对床", "镜子正对床头", "窗户在床头上方", "梁压床"],
  },
  {
    group: "家具",
    items: ["卫生间门", "镜子", "衣柜", "书桌"],
  },
  ...INDOOR_COMMON,
]

const KITCHEN_ELEMENTS: ElementGroup[] = [
  {
    group: "灶台",
    items: ["灶台朝向此方", "灶火口朝向此方"],
  },
  {
    group: "水火冲",
    items: ["水槽", "冰箱", "洗碗机"],
  },
  {
    group: "门窗",
    items: ["厨房门", "窗户", "油烟机排烟方向"],
  },
  {
    group: "结构",
    items: ["实墙", "开阔"],
  },
]

const STUDY_ELEMENTS: ElementGroup[] = [
  {
    group: "书桌",
    items: ["书桌朝向此方", "书桌背靠此方"],
  },
  {
    group: "文昌",
    items: ["书架", "文昌塔摆件"],
  },
  ...INDOOR_COMMON,
]

const FRONT_DOOR_INSIDE_ELEMENTS: ElementGroup[] = [
  {
    group: "正对方向",
    items: ["走廊", "客厅", "主卧门", "卫生间门", "厨房门", "楼梯向下↓", "楼梯向上↑", "另一扇门（穿堂）"],
  },
  {
    group: "左右两侧",
    items: ["客厅", "餐厅", "走廊", "储物间", "实墙"],
  },
  ...INDOOR_COMMON,
]

const YARD_ELEMENTS: ElementGroup[] = [
  {
    group: "地形",
    items: ["高地/坡", "低洼", "平坦开阔"],
  },
  {
    group: "植物",
    items: ["大树", "灌木丛", "草坪"],
  },
  {
    group: "设施",
    items: ["游泳池", "停车位", "围墙", "篱笆", "门"],
  },
  {
    group: "邻居",
    items: ["邻居高楼", "邻居低房", "邻居围墙"],
  },
]

const GARAGE_ELEMENTS: ElementGroup[] = [
  {
    group: "入户",
    items: ["通往室内的门", "楼梯"],
  },
  {
    group: "结构",
    items: ["车库大门朝向此方", "实墙", "窗户", "储物区"],
  },
]

// ─── 按站点类型获取元素清单 ────────────────────────────────────────────────────

export function getElementsForPoint(type: StandingPointType): ElementGroup[] {
  switch (type) {
    case "outdoor":           return OUTDOOR_ELEMENTS
    case "house-center":      return HOUSE_CENTER_ELEMENTS
    case "living-room":       return LIVING_ROOM_ELEMENTS
    case "master-bedroom":    return MASTER_BEDROOM_ELEMENTS
    case "kitchen":           return KITCHEN_ELEMENTS
    case "study":             return STUDY_ELEMENTS
    case "front-door-inside": return FRONT_DOOR_INSIDE_ELEMENTS
    case "yard":              return YARD_ELEMENTS
    case "garage":            return GARAGE_ELEMENTS
    case "custom":            return [...OUTDOOR_ELEMENTS, ...INDOOR_COMMON]
  }
}

// 展平元素为字符串数组（用于搜索/显示）
export function flatElements(groups: ElementGroup[]): string[] {
  return groups.flatMap((g) => g.items)
}
