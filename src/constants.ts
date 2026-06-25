import type { LngLat, TravelMode } from "@/types";
import { Car, Bus, Footprints, type LucideIcon } from "lucide-react";

// 通勤方式配置: 图标 + 标签 + 近似平均时速(km/h)+ 端点固定耗时(分钟)
// 速度用于无路径规划时的直线近似估算, 不同方式会得到不同的均衡中心点。
export interface TravelModeConfig {
  key: TravelMode;
  label: string;
  icon: LucideIcon;
  speedKmh: number; // 平均时速
  baseMinutes: number; // 端点步行/等待固定耗时
}

export const TRAVEL_MODES: TravelModeConfig[] = [
  { key: "driving", label: "驾车", icon: Car, speedKmh: 30, baseMinutes: 3 },
  { key: "transit", label: "公共交通", icon: Bus, speedKmh: 18, baseMinutes: 8 },
  { key: "walking", label: "步行", icon: Footprints, speedKmh: 5, baseMinutes: 0 },
];

export function getTravelMode(mode: TravelMode): TravelModeConfig {
  return TRAVEL_MODES.find((m) => m.key === mode) ?? TRAVEL_MODES[1];
}

// 每个人的标记配色(按顺序分配)
export const PERSON_COLORS = [
  "#2f6f62",
  "#c0562b",
  "#3a6ea5",
  "#8a5a9e",
  "#b08300",
  "#1f8a70",
];

// 中心点强调色
export const ACCENT = "#e6892a";

// 地图初始视图(北京全景)
export const INITIAL_CENTER: LngLat = [116.405, 39.92];
export const INITIAL_ZOOM = 11;
