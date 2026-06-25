import type { LngLat } from "@/types";

// 标准 Web 墨卡托投影(slippy map), 世界在某 zoom 下的像素尺寸 = 256 * 2^zoom
const TILE = 256;

export function worldSize(zoom: number): number {
  return TILE * Math.pow(2, zoom);
}

// 经纬度 -> 世界像素坐标(给定 zoom)
export function lngLatToWorld([lng, lat]: LngLat, zoom: number): [number, number] {
  const size = worldSize(zoom);
  const x = ((lng + 180) / 360) * size;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size;
  return [x, y];
}

// 世界像素坐标 -> 经纬度
export function worldToLngLat([x, y]: [number, number], zoom: number): LngLat {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lng, lat];
}

// 计算能容纳所有点的中心与 zoom(带 padding)
export function fitBounds(
  points: LngLat[],
  width: number,
  height: number,
  padding = 120
): { center: LngLat; zoom: number } {
  if (points.length === 1) return { center: points[0], zoom: 14 };

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of points) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  const center: LngLat = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  // 逐级试探最大可容纳 zoom
  for (let zoom = 18; zoom >= 2; zoom--) {
    const tl = lngLatToWorld([minLng, maxLat], zoom);
    const br = lngLatToWorld([maxLng, minLat], zoom);
    const w = Math.abs(br[0] - tl[0]);
    const h = Math.abs(br[1] - tl[1]);
    if (w <= width - padding * 2 && h <= height - padding * 2) {
      return { center, zoom };
    }
  }
  return { center, zoom: 11 };
}
