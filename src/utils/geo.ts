import type { LngLat, TravelMode } from "@/types";
import { getTravelMode } from "@/constants";

const EARTH_RADIUS = 6371000; // 米

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

// 两点间直线距离(米), Haversine 公式
export function haversine(a: LngLat, b: LngLat): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(s));
}

// 几何质心
export function centroid(points: LngLat[]): LngLat {
  const sum = points.reduce<[number, number]>(
    (acc, [lng, lat]) => [acc[0] + lng, acc[1] + lat],
    [0, 0]
  );
  return [sum[0] / points.length, sum[1] / points.length];
}

// 在质心周围生成候选点(同心圆 + 中心),用于均衡打分
export function generateCandidates(points: LngLat[]): LngLat[] {
  const c = centroid(points);
  // 以各点到质心的最大距离作为撒点半径基准
  const maxDist = Math.max(...points.map((p) => haversine(p, c)), 1000);
  // 经纬度近似换算: 1 度纬度约 111000 米
  const radiusDeg = Math.min(maxDist, 6000) / 111000;

  const candidates: LngLat[] = [c];
  const rings = [0.4, 0.8]; // 两圈
  const perRing = 8;
  for (const r of rings) {
    for (let i = 0; i < perRing; i++) {
      const angle = (i / perRing) * 2 * Math.PI;
      const dLat = radiusDeg * r * Math.sin(angle);
      const lngScale = Math.cos(toRad(c[1])) || 1;
      const dLng = (radiusDeg * r * Math.cos(angle)) / lngScale;
      candidates.push([c[0] + dLng, c[1] + dLat]);
    }
  }
  return candidates;
}

// 估算通勤时间(分钟): 用直线距离 + 所选通勤方式的平均时速近似
// 不同方式时速不同, 因此同一组人会得到不同的均衡中心点。
export function estimateDuration(
  from: LngLat,
  to: LngLat,
  mode: TravelMode = "transit"
): number {
  const { speedKmh, baseMinutes } = getTravelMode(mode);
  const meters = haversine(from, to);
  const speed = (speedKmh * 1000) / 60; // 米/分钟
  return Math.round(meters / speed + baseMinutes);
}

// 方差: 衡量各人通勤时间是否均衡, 越小越公平
function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
}

// 从候选点中挑选"各人通勤时间最均衡"的点
// 打分 = 方差(主) + 平均时间(次, 轻微权重), 避免选到大家都很远的均衡点
export function pickBalancedCenter(
  points: LngLat[],
  mode: TravelMode = "transit"
): {
  center: LngLat;
  durations: number[];
} {
  const candidates = generateCandidates(points);
  let best: LngLat = candidates[0];
  let bestScore = Infinity;
  let bestDurations: number[] = [];

  for (const cand of candidates) {
    const durations = points.map((p) => estimateDuration(p, cand, mode));
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    const score = variance(durations) + mean * 0.5;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
      bestDurations = durations;
    }
  }
  return { center: best, durations: bestDurations };
}
