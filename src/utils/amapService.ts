import type {
  LngLat,
  PersonRoute,
  Restaurant,
  RouteSegment,
  TravelMode,
} from "@/types";
import { haversine, estimateDuration } from "@/utils/geo";
import { loadAMap, useRealAmap } from "@/utils/amapLoader";

export const hasAmapKey = useRealAmap;

// ---------------- Mock 数据 ----------------

// 预置一些常见城市/地标的坐标, 命中关键字即返回; 否则在默认城市范围内伪随机生成
const MOCK_PLACES: Record<string, LngLat> = {
  天安门: [116.397, 39.908],
  国贸: [116.461, 39.909],
  中关村: [116.31, 39.983],
  望京: [116.47, 40.0],
  五道口: [116.337, 39.992],
  西二旗: [116.302, 40.053],
  通州: [116.658, 39.909],
  亦庄: [116.506, 39.795],
  回龙观: [116.337, 40.073],
  天通苑: [116.418, 40.073],
  上地: [116.305, 40.03],
  三里屯: [116.455, 39.937],
  朝阳门: [116.434, 39.924],
  西单: [116.373, 39.907],
  东直门: [116.434, 39.941],
  人民广场: [121.475, 31.231],
  陆家嘴: [121.506, 31.245],
  徐家汇: [121.437, 31.195],
  虹桥: [121.32, 31.197],
  张江: [121.59, 31.205],
};

// 简单 hash, 让相同地址稳定映射到同一伪随机坐标
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function mockGeocode(address: string): LngLat | null {
  const text = address.trim();
  if (!text) return null;
  for (const key of Object.keys(MOCK_PLACES)) {
    if (text.includes(key)) return MOCK_PLACES[key];
  }
  // 兜底: 在北京范围内根据地址 hash 生成稳定坐标
  const h = hashStr(text);
  const lng = 116.25 + ((h % 1000) / 1000) * 0.5; // 116.25 ~ 116.75
  const lat = 39.8 + (((h >> 10) % 1000) / 1000) * 0.3; // 39.8 ~ 40.1
  return [Number(lng.toFixed(4)), Number(lat.toFixed(4))];
}

const CATEGORIES = [
  "川菜",
  "粤菜",
  "火锅",
  "日料",
  "西餐",
  "湘菜",
  "烧烤",
  "面馆",
  "咖啡简餐",
  "东北菜",
];
const NAME_PREFIX = ["老", "小", "大", "蜀", "京", "潮", "湘", "粤", "渔", "膳"];
const NAME_CORE = ["味轩", "食堂", "厨房", "private", "小馆", "人家", "记", "坊", "栈", "源"];

function mockRestaurants(center: LngLat): Restaurant[] {
  const list: Restaurant[] = [];
  const base = hashStr(center.join(","));
  for (let i = 0; i < 12; i++) {
    const h = hashStr(`${base}-${i}`);
    const dLng = (((h % 200) - 100) / 100) * 0.012;
    const dLat = ((((h >> 8) % 200) - 100) / 100) * 0.012;
    const loc: LngLat = [
      Number((center[0] + dLng).toFixed(5)),
      Number((center[1] + dLat).toFixed(5)),
    ];
    const cat = CATEGORIES[h % CATEGORIES.length];
    const name =
      NAME_PREFIX[(h >> 3) % NAME_PREFIX.length] +
      NAME_CORE[(h >> 6) % NAME_CORE.length] +
      cat;
    list.push({
      id: `mock-${i}`,
      name,
      category: cat,
      avgPrice: 40 + (h % 16) * 10,
      rating: Number((3.8 + ((h >> 4) % 12) / 10).toFixed(1)),
      distance: Math.round(haversine(center, loc)),
      location: loc,
    });
  }
  return list.sort((a, b) => a.distance - b.distance);
}

// ---------------- 对外服务接口 ----------------

// 地理编码: 地址 -> 坐标。有 Key 时用高德 Geocoder 插件(规避跨域), 否则用 mock。
export async function geocode(address: string): Promise<LngLat | null> {
  if (!useRealAmap) {
    await new Promise((r) => setTimeout(r, 120));
    return mockGeocode(address);
  }
  try {
    const AMap = await loadAMap();
    const geocoder = new AMap.Geocoder({});
    return await new Promise<LngLat | null>((resolve) => {
      geocoder.getLocation(address, (status, result) => {
        if (
          status === "complete" &&
          result.info === "OK" &&
          result.geocodes?.length
        ) {
          const loc = result.geocodes[0].location;
          resolve([loc.lng, loc.lat]);
        } else {
          resolve(null);
        }
      });
    });
  } catch {
    return mockGeocode(address);
  }
}

// 周边餐厅搜索: 中心点 -> 餐厅列表。有 Key 时用高德 PlaceSearch 插件, 否则用 mock。
export async function searchRestaurants(center: LngLat): Promise<Restaurant[]> {
  if (!useRealAmap) {
    await new Promise((r) => setTimeout(r, 200));
    return mockRestaurants(center);
  }
  try {
    const AMap = await loadAMap();
    const placeSearch = new AMap.PlaceSearch({
      type: "餐饮服务",
      pageSize: 15,
      pageIndex: 1,
      extensions: "all",
    });
    return await new Promise<Restaurant[]>((resolve) => {
      placeSearch.searchNearBy("", center, 1500, (status, result) => {
        const pois = result?.poiList?.pois;
        if (status === "complete" && result.info === "OK" && pois?.length) {
          const list = pois.map((p, i) => {
            const loc: LngLat = [p.location.lng, p.location.lat];
            return {
              id: p.id || `poi-${i}`,
              name: p.name,
              category: (p.type || "").split(";").pop() || "餐厅",
              avgPrice: p.cost != null ? Number(p.cost) || undefined : undefined,
              rating: undefined,
              distance:
                p.distance != null
                  ? Math.round(p.distance)
                  : Math.round(haversine(center, loc)),
              location: loc,
            } as Restaurant;
          });
          resolve(list.sort((a, b) => a.distance - b.distance));
        } else {
          resolve(mockRestaurants(center));
        }
      });
    });
  } catch {
    return mockRestaurants(center);
  }
}

// ---------------- 路径规划 ----------------

// 把高德返回的坐标点数组转为 LngLat[]
function toPath(points?: { lng: number; lat: number }[]): LngLat[] {
  if (!points?.length) return [];
  return points.map((p) => [p.lng, p.lat] as LngLat);
}

// 逆地理编码取所在城市(公交换乘需指定城市)
export async function getCity(location: LngLat): Promise<string | undefined> {
  if (!useRealAmap) return undefined;
  try {
    const AMap = await loadAMap();
    const geocoder = new AMap.Geocoder({});
    return await new Promise<string | undefined>((resolve) => {
      geocoder.getAddress(location, (status, result) => {
        if (status === "complete" && result.info === "OK") {
          resolve(result.regeocode?.addressComponent?.city || undefined);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch {
    return undefined;
  }
}

// 直线估算兜底路线(无 Key 或路径规划失败时使用)
function mockRoute(from: LngLat, to: LngLat, mode: TravelMode): PersonRoute {
  const duration = estimateDuration(from, to, mode);
  const distance = Math.round(haversine(from, to));
  const typeMap: Record<TravelMode, RouteSegment["type"]> = {
    driving: "drive",
    transit: "bus",
    walking: "walk",
  };
  return {
    mode,
    duration,
    distance,
    segments: [{ type: typeMap[mode], distance }],
    path: [from, to],
    approx: true,
  };
}

// 驾车路线
async function planDriving(from: LngLat, to: LngLat): Promise<PersonRoute> {
  const AMap = await loadAMap();
  const driving = new AMap.Driving({ policy: 0 }); // 0 = LEAST_TIME
  return await new Promise<PersonRoute>((resolve) => {
    driving.search(from, to, (status, result) => {
      const route = result?.routes?.[0];
      if (status === "complete" && result.info === "OK" && route) {
        const path: LngLat[] = [];
        for (const step of route.steps || []) {
          path.push(...toPath(step.path));
        }
        resolve({
          mode: "driving",
          duration: Math.max(1, Math.round((route.time || 0) / 60)),
          distance: Math.round(route.distance || haversine(from, to)),
          segments: [
            { type: "drive", distance: Math.round(route.distance || 0) },
          ],
          path: path.length ? path : [from, to],
        });
      } else {
        resolve(mockRoute(from, to, "driving"));
      }
    });
  });
}

// 步行路线
async function planWalking(from: LngLat, to: LngLat): Promise<PersonRoute> {
  const AMap = await loadAMap();
  const walking = new AMap.Walking({});
  return await new Promise<PersonRoute>((resolve) => {
    walking.search(from, to, (status, result) => {
      const route = result?.routes?.[0];
      if (status === "complete" && result.info === "OK" && route) {
        const path: LngLat[] = [];
        for (const step of route.steps || []) {
          path.push(...toPath(step.path));
        }
        resolve({
          mode: "walking",
          duration: Math.max(1, Math.round((route.time || 0) / 60)),
          distance: Math.round(route.distance || haversine(from, to)),
          walkingDistance: Math.round(route.distance || 0),
          segments: [
            { type: "walk", distance: Math.round(route.distance || 0) },
          ],
          path: path.length ? path : [from, to],
        });
      } else {
        resolve(mockRoute(from, to, "walking"));
      }
    });
  });
}

// 从线路全名提取简短名称, 如 "地铁10号线(巴沟--成都...)" -> "10号线"
function shortLineName(full?: string): string {
  if (!full) return "";
  const name = full.replace(/\(.*\)$/, "").trim();
  return name.replace(/^地铁/, "").replace(/^公交/, "");
}

// 公交换乘路线(含地铁), 整合步行
async function planTransit(
  from: LngLat,
  to: LngLat,
  city?: string
): Promise<PersonRoute> {
  const AMap = await loadAMap();
  const transfer = new AMap.Transfer({
    policy: 0, // LEAST_TIME
    city: city || "全国",
    cityd: city || undefined,
  });
  return await new Promise<PersonRoute>((resolve) => {
    transfer.search(from, to, (status, result) => {
      const plan = result?.plans?.[0];
      if (status === "complete" && result.info === "OK" && plan) {
        const segments: RouteSegment[] = [];
        const path: LngLat[] = [];
        for (const seg of plan.segments || []) {
          // 步行段
          if (seg.walking?.distance) {
            const wd = Math.round(seg.walking.distance);
            // 仅保留较明显的步行段(>50m), 避免碎片
            if (wd > 50) {
              segments.push({ type: "walk", distance: wd });
            }
            for (const step of seg.walking.steps || []) {
              path.push(...toPath(step.path));
            }
            if (seg.walking.path) path.push(...toPath(seg.walking.path));
          }
          // 公交/地铁段
          const transit = seg.transit;
          const line = transit?.lines?.[0];
          if (line?.name) {
            const isSubway = (line.type || "").includes("地铁");
            segments.push({
              type: isSubway ? "subway" : "bus",
              name: shortLineName(line.name),
              stops: (line.via_num ?? 0) + 1,
            });
          }
          if (transit?.path) path.push(...toPath(transit.path));
        }
        const cost = plan.cost != null ? Number(plan.cost) : undefined;
        resolve({
          mode: "transit",
          duration: Math.max(1, Math.round((plan.time || 0) / 60)),
          distance: Math.round(plan.distance || haversine(from, to)),
          walkingDistance:
            plan.walking_distance != null
              ? Math.round(plan.walking_distance)
              : undefined,
          cost: Number.isFinite(cost) ? cost : undefined,
          segments: segments.length ? segments : [{ type: "bus" }],
          path: path.length ? path : [from, to],
        });
      } else {
        resolve(mockRoute(from, to, "transit"));
      }
    });
  });
}

// 统一路径规划入口: 根据通勤方式取每人到中心点的真实路线与耗时, 失败回退直线估算。
export async function planRoute(
  from: LngLat,
  to: LngLat,
  mode: TravelMode,
  city?: string
): Promise<PersonRoute> {
  if (!useRealAmap) {
    await new Promise((r) => setTimeout(r, 120));
    return mockRoute(from, to, mode);
  }
  try {
    if (mode === "driving") return await planDriving(from, to);
    if (mode === "walking") return await planWalking(from, to);
    return await planTransit(from, to, city);
  } catch {
    return mockRoute(from, to, mode);
  }
}
