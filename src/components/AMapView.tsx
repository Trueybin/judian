import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { loadAMap } from "@/utils/amapLoader";
import {
  PERSON_COLORS,
  ACCENT,
  INITIAL_CENTER,
  INITIAL_ZOOM,
} from "@/constants";

// 生成人物编号标记的 DOM 内容
function personMarkerContent(index: number, label: string): string {
  const color = PERSON_COLORS[index % PERSON_COLORS.length];
  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%);">
      <div style="background:rgba(28,38,36,0.82);color:#fff;font-size:11px;padding:2px 6px;border-radius:6px;white-space:nowrap;margin-bottom:3px;">${label}</div>
      <div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font-weight:700;font-size:13px;">${index + 1}</span>
      </div>
    </div>`;
}

// 中心点标记内容
function centerMarkerContent(): string {
  return `
    <div style="transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:46px;height:46px;border-radius:50%;background:${ACCENT}33;animation:juPulse 1.6s ease-out infinite;"></div>
      <div style="width:26px;height:26px;border-radius:50%;background:${ACCENT};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div>
      </div>
    </div>`;
}

export default function AMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.Map | null>(null);
  const amapRef = useRef<typeof AMap | null>(null);
  const overlaysRef = useRef<unknown[]>([]);
  const restaurantMarkersRef = useRef<Map<string, AMap.Marker>>(new Map());
  const [failed, setFailed] = useState(false);

  const persons = useAppStore((s) => s.persons);
  const result = useAppStore((s) => s.result);
  const restaurants = useAppStore((s) => s.restaurants);
  const highlightId = useAppStore((s) => s.highlightId);
  const selectedId = useAppStore((s) => s.selectedId);
  const destinationRoutes = useAppStore((s) => s.destinationRoutes);
  const fitTick = useAppStore((s) => s.fitTick);
  const setHighlight = useAppStore((s) => s.setHighlight);
  const selectRestaurant = useAppStore((s) => s.selectRestaurant);

  // 初始化地图
  useEffect(() => {
    let disposed = false;
    loadAMap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;
        amapRef.current = AMap;
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom: INITIAL_ZOOM,
          center: INITIAL_CENTER,
          mapStyle: "amap://styles/whitesmoke",
          scrollWheel: true, // 鼠标滚轮缩放
          zooms: [3, 19],
        });
      })
      .catch(() => setFailed(true));

    return () => {
      disposed = true;
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, []);

  // 重绘所有覆盖物
  useEffect(() => {
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    // 清理旧覆盖物
    if (overlaysRef.current.length) {
      map.remove(overlaysRef.current);
      overlaysRef.current = [];
    }
    restaurantMarkersRef.current.clear();

    const added: unknown[] = [];

    // 餐厅标记(底层)
    for (const r of restaurants) {
      const marker = new AMap.Marker({
        position: r.location,
        anchor: "center",
        content: restaurantDot(r.id === highlightId, r.id === selectedId),
        zIndex: r.id === selectedId ? 70 : 50,
      });
      marker.on("mouseover", () => setHighlight(r.id));
      marker.on("mouseout", () => setHighlight(null));
      marker.on("click", () =>
        selectRestaurant(r.id === selectedId ? null : r.id)
      );
      restaurantMarkersRef.current.set(r.id, marker);
      added.push(marker);
    }

    // 连线: 各人 -> 目的地(选中餐厅则到餐厅, 否则到中心点)。
    // 优先用真实路线折线, 缺失时回退直线。
    if (result) {
      const showingDest = selectedId != null;
      const dest = showingDest
        ? restaurants.find((r) => r.id === selectedId)?.location ?? result.center
        : result.center;
      const routes = showingDest ? destinationRoutes : result.routes;
      persons.forEach((p, idx) => {
        if (!p.location) return;
        const color = PERSON_COLORS[idx % PERSON_COLORS.length];
        const route = routes?.[idx] ?? null;
        const path =
          route && route.path.length >= 2 ? route.path : [p.location, dest];
        const approx = !route || route.approx || route.path.length < 2;
        const line = new AMap.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: approx ? 0.4 : 0.85,
          strokeWeight: approx ? 1.5 : 4,
          strokeStyle: approx ? "dashed" : "solid",
          lineJoin: "round",
          lineCap: "round",
          zIndex: 40,
        });
        added.push(line);
      });
    }

    // 人物标记
    persons.forEach((p, idx) => {
      if (!p.location) return;
      const marker = new AMap.Marker({
        position: p.location,
        anchor: "bottom-center",
        content: personMarkerContent(idx, p.label),
        zIndex: 80,
      });
      added.push(marker);
    });

    // 中心点标记(顶层)
    if (result) {
      const marker = new AMap.Marker({
        position: result.center,
        anchor: "center",
        content: centerMarkerContent(),
        zIndex: 100,
      });
      added.push(marker);
    }

    map.add(added);
    overlaysRef.current = added;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persons, result, restaurants, selectedId, destinationRoutes]);

  // 高亮联动: 仅更新餐厅标记样式, 不重建全部
  useEffect(() => {
    restaurantMarkersRef.current.forEach((marker, id) => {
      marker.setContent(restaurantDot(id === highlightId, id === selectedId));
    });
  }, [highlightId, selectedId]);

  // 计算后自动聚焦: 将所有覆盖物纳入视野
  useEffect(() => {
    if (fitTick === 0) return;
    const map = mapRef.current;
    if (!map || !result) return;
    map.setFitView(
      overlaysRef.current as unknown[],
      false,
      [120, 120, 120, 120],
      16
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTick]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-stone-100 text-sm text-stone-500">
        高德地图加载失败,请检查 Key 配置或网络
      </div>
    );
  }

  return <div ref={containerRef} className="absolute inset-0 h-full w-full" />;
}

// 餐厅圆点标记
function restaurantDot(highlighted: boolean, selected = false): string {
  if (selected) {
    return `<div style="width:22px;height:22px;border-radius:50%;background:${ACCENT};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="width:7px;height:7px;border-radius:50%;background:#fff;"></div></div>`;
  }
  const size = highlighted ? 18 : 12;
  const bg = highlighted ? "#c0392b" : "#7a8b87";
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`;
}
