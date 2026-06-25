import { useEffect, useRef } from "react";
import type { LngLat } from "@/types";
import { fitBounds, worldToLngLat, lngLatToWorld } from "@/utils/projection";
import {
  drawBaseMap,
  drawPersonMarker,
  drawCenterMarker,
  drawRestaurantMarker,
  drawConnections,
  project,
  type Camera,
} from "@/utils/mapDraw";
import { useAppStore } from "@/store/useAppStore";
import { PERSON_COLORS, ACCENT, INITIAL_CENTER, INITIAL_ZOOM } from "@/constants";

export default function MapCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<{ center: LngLat; zoom: number }>({
    center: INITIAL_CENTER,
    zoom: INITIAL_ZOOM,
  });
  const sizeRef = useRef({ width: 0, height: 0 });
  const animRef = useRef<number>(0);
  const pulseRef = useRef(0);
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });
  // fitView 动画目标
  const fitAnimRef = useRef<{
    from: { center: LngLat; zoom: number };
    to: { center: LngLat; zoom: number };
    start: number;
    duration: number;
    active: boolean;
  } | null>(null);

  const persons = useAppStore((s) => s.persons);
  const result = useAppStore((s) => s.result);
  const restaurants = useAppStore((s) => s.restaurants);
  const highlightId = useAppStore((s) => s.highlightId);
  const fitTick = useAppStore((s) => s.fitTick);
  const setHighlight = useAppStore((s) => s.setHighlight);

  // 用 ref 持有最新数据供渲染循环读取
  const dataRef = useRef({ persons, result, restaurants, highlightId });
  dataRef.current = { persons, result, restaurants, highlightId };

  // 渲染循环
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      const { width, height } = sizeRef.current;

      // fitView 缓动
      const fa = fitAnimRef.current;
      if (fa?.active) {
        const t = Math.min(1, (performance.now() - fa.start) / fa.duration);
        const e = 1 - Math.pow(1 - t, 3); // easeOutCubic
        camRef.current = {
          center: [
            fa.from.center[0] + (fa.to.center[0] - fa.from.center[0]) * e,
            fa.from.center[1] + (fa.to.center[1] - fa.from.center[1]) * e,
          ],
          zoom: fa.from.zoom + (fa.to.zoom - fa.from.zoom) * e,
        };
        if (t >= 1) fa.active = false;
      }

      const cam: Camera = {
        center: camRef.current.center,
        zoom: camRef.current.zoom,
        width,
        height,
      };

      drawBaseMap(ctx, cam);

      const { persons, result, restaurants, highlightId } = dataRef.current;
      const personScreen = persons
        .filter((p) => p.location)
        .map((p) => ({
          p,
          xy: project(p.location as LngLat, cam),
        }));

      // 连线
      if (result) {
        const centerXY = project(result.center, cam);
        drawConnections(
          ctx,
          personScreen.map((s) => s.xy),
          centerXY
        );
      }

      // 餐厅点
      for (const r of restaurants) {
        const [x, y] = project(r.location, cam);
        drawRestaurantMarker(ctx, x, y, r.id === highlightId);
      }

      // 人物标记
      personScreen.forEach((s, i) => {
        const idx = persons.findIndex((p) => p.id === s.p.id);
        drawPersonMarker(
          ctx,
          s.xy[0],
          s.xy[1],
          idx,
          PERSON_COLORS[idx % PERSON_COLORS.length],
          s.p.label
        );
        void i;
      });

      // 中心点
      if (result) {
        const [x, y] = project(result.center, cam);
        pulseRef.current = (pulseRef.current + 0.012) % 1;
        drawCenterMarker(ctx, x, y, ACCENT, pulseRef.current);
      }

      animRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // 监听 fitTick: 计算完成后聚焦到所有人 + 中心点
  useEffect(() => {
    if (fitTick === 0) return;
    const { width, height } = sizeRef.current;
    const r = dataRef.current.result;
    if (!r) return;
    const pts: LngLat[] = [
      ...persons.filter((p) => p.location).map((p) => p.location as LngLat),
      r.center,
    ];
    const target = fitBounds(pts, width, height, 140);
    fitAnimRef.current = {
      from: { ...camRef.current },
      to: target,
      start: performance.now(),
      duration: 900,
      active: true,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTick]);

  // 滚轮缩放(以光标位置为锚点)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const { width, height } = sizeRef.current;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const cam = camRef.current;
    const delta = -e.deltaY * 0.0015;
    const newZoom = Math.max(3, Math.min(18, cam.zoom + delta * 4));

    // 保持光标下的地理点不动
    const beforeWorld = lngLatToWorld(cam.center, cam.zoom);
    const cursorWorldBefore: [number, number] = [
      beforeWorld[0] + (px - width / 2),
      beforeWorld[1] + (py - height / 2),
    ];
    const geoUnderCursor = worldToLngLat(cursorWorldBefore, cam.zoom);

    const afterCursorWorld = lngLatToWorld(geoUnderCursor, newZoom);
    const newCenterWorld: [number, number] = [
      afterCursorWorld[0] - (px - width / 2),
      afterCursorWorld[1] - (py - height / 2),
    ];
    fitAnimRef.current = null;
    camRef.current = {
      center: worldToLngLat(newCenterWorld, newZoom),
      zoom: newZoom,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, active: true };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.active) return;
    const cam = camRef.current;
    const w = lngLatToWorld(cam.center, cam.zoom);
    const moved: [number, number] = [
      w[0] - (e.clientX - d.x),
      w[1] - (e.clientY - d.y),
    ];
    fitAnimRef.current = null;
    camRef.current = { center: worldToLngLat(moved, cam.zoom), zoom: cam.zoom };
    dragRef.current = { x: e.clientX, y: e.clientY, active: true };
  };
  const endDrag = () => {
    dragRef.current.active = false;
  };

  // 点击餐厅点 -> 高亮
  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { width, height } = sizeRef.current;
    const cam: Camera = {
      center: camRef.current.center,
      zoom: camRef.current.zoom,
      width,
      height,
    };
    let hit: string | null = null;
    for (const r of dataRef.current.restaurants) {
      const [x, y] = project(r.location, cam);
      if (Math.hypot(x - px, y - py) < 12) {
        hit = r.id;
        break;
      }
    }
    setHighlight(hit);
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onClick={handleClick}
    />
  );
}
