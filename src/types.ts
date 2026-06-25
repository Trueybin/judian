// 核心数据类型定义

export type LngLat = [number, number]; // [经度, 纬度]

// 通勤方式: 驾车 / 公共交通(公交+地铁) / 步行
export type TravelMode = "driving" | "transit" | "walking";

export interface Person {
  id: string;
  label: string; // 显示名称, 如 "我" "朋友1"
  address: string; // 用户输入的地址文本
  location?: LngLat; // 地理编码后填充
  error?: string; // 地址解析失败提示
}

// 一段通勤路程的类型: 步行 / 公交 / 地铁 / 驾车
export type SegmentType = "walk" | "bus" | "subway" | "drive";

// 通勤路线的一段(如 步行到地铁站, 或乘坐某条地铁线路)
export interface RouteSegment {
  type: SegmentType;
  name?: string; // 线路名, 如 "地铁10号线" "公交302路" (步行/驾车段为空)
  stops?: number; // 该段经过站数(公交/地铁)
  distance?: number; // 该段距离(米)
}

// 某个人到中心点的完整通勤路线
export interface PersonRoute {
  mode: TravelMode;
  duration: number; // 总耗时(分钟)
  distance: number; // 总距离(米)
  walkingDistance?: number; // 步行总距离(米, 公交方式)
  cost?: number; // 票价(元, 公交方式)
  segments: RouteSegment[]; // 路线分段, 用于展示 "几号线转几号线"
  path: LngLat[]; // 路线折线坐标, 用于地图绘制
  approx?: boolean; // 是否为直线估算的兜底结果
}

export interface CenterResult {
  center: LngLat; // 计算出的最优中心点
  durations: number[]; // 中心点到每个人的预计通勤时间(分钟), 与 persons 顺序一致
  routes: (PersonRoute | null)[]; // 每个人的真实通勤路线, 与 persons 顺序一致(无坐标为 null)
}

export interface Restaurant {
  id: string;
  name: string;
  category: string; // 菜系分类
  avgPrice?: number; // 人均
  rating?: number; // 基础评分
  distance: number; // 距中心点距离(米)
  location: LngLat;
}

export interface ViewState {
  center: LngLat;
  zoom: number;
}
