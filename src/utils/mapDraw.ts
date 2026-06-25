import type { LngLat } from "@/types";
import { lngLatToWorld } from "@/utils/projection";

export interface Camera {
  center: LngLat;
  zoom: number;
  width: number;
  height: number;
}

// 经纬度 -> 屏幕像素(基于相机)
export function project(p: LngLat, cam: Camera): [number, number] {
  const w = lngLatToWorld(p, cam.zoom);
  const c = lngLatToWorld(cam.center, cam.zoom);
  return [cam.width / 2 + (w[0] - c[0]), cam.height / 2 + (w[1] - c[1])];
}

// 程序化绘制类地图底图: 米色陆地 + 网格化路网 + 几条主干道, 跟随投影平移缩放
export function drawBaseMap(ctx: CanvasRenderingContext2D, cam: Camera) {
  const { width, height } = cam;
  // 陆地底色
  ctx.fillStyle = "#eae4d6";
  ctx.fillRect(0, 0, width, height);

  const cWorld = lngLatToWorld(cam.center, cam.zoom);
  const originX = cam.width / 2 - cWorld[0];
  const originY = cam.height / 2 - cWorld[1];

  // 次级路网网格(随 zoom 自适应密度)
  const baseStep = 64; // 世界像素间距基准
  const step = baseStep;
  const startX = ((originX % step) + step) % step;
  const startY = ((originY % step) + step) % step;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#ddd5c4";
  ctx.beginPath();
  for (let x = startX; x < width; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = startY; y < height; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 主干道(更粗更稀)
  const majorStep = step * 4;
  const mStartX = ((originX % majorStep) + majorStep) % majorStep;
  const mStartY = ((originY % majorStep) + majorStep) % majorStep;
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  for (let x = mStartX; x < width; x += majorStep) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = mStartY; y < height; y += majorStep) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 一条斜向"河流"装饰, 固定在世界坐标系
  ctx.strokeStyle = "#bcd8d6";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.beginPath();
  const rp = (lng: number, lat: number) => {
    const w = lngLatToWorld([lng, lat], cam.zoom);
    return [originX + w[0], originY + w[1]] as [number, number];
  };
  const river: LngLat[] = [
    [116.2, 40.1],
    [116.35, 39.98],
    [116.45, 39.92],
    [116.6, 39.8],
  ];
  river.forEach((pt, i) => {
    const [x, y] = rp(pt[0], pt[1]);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.lineCap = "butt";
}

// 绘制人物标记: 编号气泡
export function drawPersonMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  index: number,
  color: string,
  label: string
) {
  const r = 16;
  ctx.save();
  // 阴影针脚
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8, y - 20);
  ctx.lineTo(x + 8, y - 20);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // 圆
  ctx.beginPath();
  ctx.arc(x, y - 32, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  // 编号
  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), x, y - 32);
  // 名称标签
  ctx.font = "12px sans-serif";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(28,38,36,0.82)";
  ctx.fillRect(x - tw / 2 - 6, y - 70, tw + 12, 18);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, x, y - 61);
  ctx.restore();
}

// 绘制中心点标记: 强调色靶心
export function drawCenterMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  accent: string,
  pulse: number
) {
  ctx.save();
  // 脉冲光环
  ctx.beginPath();
  ctx.arc(x, y, 16 + pulse * 18, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(230,140,40,${0.28 * (1 - pulse)})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
}

// 绘制餐厅标记: 小圆点, 高亮时放大
export function drawRestaurantMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  highlighted: boolean
) {
  ctx.save();
  const r = highlighted ? 9 : 6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = highlighted ? "#c0392b" : "#7a8b87";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#fff";
  ctx.stroke();
  ctx.restore();
}

// 连线: 各人 -> 中心点
export function drawConnections(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  center: [number, number]
) {
  ctx.save();
  ctx.strokeStyle = "rgba(40,70,66,0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  for (const p of points) {
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}
