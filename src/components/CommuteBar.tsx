import { Fragment } from "react";
import { ChevronRight, Footprints } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PERSON_COLORS, getTravelMode } from "@/constants";
import type { PersonRoute, RouteSegment } from "@/types";

// 单段路线徽章: 地铁/公交显示线路名, 步行显示步行图标
function SegmentBadge({ seg }: { seg: RouteSegment }) {
  if (seg.type === "walk") {
    return (
      <span className="flex items-center gap-0.5 text-stone-400">
        <Footprints size={11} />
        {seg.distance != null && seg.distance >= 100 && (
          <span className="text-[10px]">{formatMeters(seg.distance)}</span>
        )}
      </span>
    );
  }
  if (seg.type === "drive") {
    return (
      <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
        驾车{seg.distance != null ? ` ${formatMeters(seg.distance)}` : ""}
      </span>
    );
  }
  const isSubway = seg.type === "subway";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
        isSubway
          ? "bg-sky-100 text-sky-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {seg.name || (isSubway ? "地铁" : "公交")}
    </span>
  );
}

function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}公里` : `${m}米`;
}

// 单个人的通勤路线卡片
function RouteCard({
  label,
  color,
  route,
}: {
  label: string;
  color: string;
  route: PersonRoute;
}) {
  // 只展示乘车/步行的关键段(过滤掉碎片步行后若为空则保留)
  const segs = route.segments;

  return (
    <div className="flex min-w-[180px] flex-col gap-1.5 rounded-xl border border-stone-200/70 bg-white/70 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="max-w-[60px] truncate text-xs font-semibold text-stone-700">
          {label}
        </span>
        <span className="ml-auto font-display text-base font-bold leading-none text-stone-800">
          {route.duration}
          <span className="ml-0.5 text-[10px] font-medium text-stone-400">分钟</span>
        </span>
      </div>

      {/* 路线分段: 几号线转几号线 */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {segs.map((seg, i) => (
          <Fragment key={i}>
            {i > 0 && <ChevronRight size={11} className="text-stone-300" />}
            <SegmentBadge seg={seg} />
          </Fragment>
        ))}
      </div>

      {/* 辅助信息: 步行距离 / 票价 */}
      <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-stone-400">
        {route.walkingDistance != null && route.walkingDistance > 0 && (
          <span>步行 {formatMeters(route.walkingDistance)}</span>
        )}
        {route.cost != null && route.cost > 0 && <span>¥{route.cost}</span>}
        {route.approx && <span className="text-amber-500">估算</span>}
      </div>
    </div>
  );
}

// 计算完成后, 在底部居中展示每人到目的地(选中餐厅, 默认为中心点)的真实通勤路线
export default function CommuteBar() {
  const persons = useAppStore((s) => s.persons);
  const result = useAppStore((s) => s.result);
  const mode = useAppStore((s) => s.mode);
  const selectedId = useAppStore((s) => s.selectedId);
  const destinationRoutes = useAppStore((s) => s.destinationRoutes);
  const routingDest = useAppStore((s) => s.routingDest);
  const restaurants = useAppStore((s) => s.restaurants);

  if (!result) return null;

  // 选中餐厅时展示到餐厅的路线, 否则展示到中心点的路线
  const showingDest = selectedId != null;
  const routes = showingDest ? destinationRoutes ?? [] : result.routes;
  const target = showingDest
    ? restaurants.find((r) => r.id === selectedId)
    : undefined;

  const items = persons
    .map((p, i) => ({ p, i, route: routes[i] }))
    .filter((x): x is { p: typeof x.p; i: number; route: PersonRoute } =>
      Boolean(x.route)
    );

  const modeConfig = getTravelMode(mode);
  const ModeIcon = modeConfig.icon;

  // 正在规划到选中餐厅的路线
  if (showingDest && routingDest && items.length === 0) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/40 bg-white/80 px-4 py-3 text-xs text-stone-500 shadow-[0_8px_40px_rgba(28,46,42,0.18)] backdrop-blur-xl">
        <ModeIcon size={13} className="text-amber-600" />
        正在规划到 {target?.name ?? "目的地"} 的路线…
      </div>
    );
  }

  if (items.length === 0) return null;

  const times = items.map((x) => x.route.duration);
  const max = Math.max(...times);
  const min = Math.min(...times);
  const spread = max - min;

  return (
    <div className="pointer-events-auto flex max-w-[calc(100vw-32px)] flex-col gap-2 rounded-2xl border border-white/40 bg-white/80 px-4 py-3 shadow-[0_8px_40px_rgba(28,46,42,0.18)] backdrop-blur-xl">
      <div className="flex items-center gap-2 px-0.5">
        <span className="flex items-center gap-1 text-xs font-semibold text-stone-700">
          <ModeIcon size={13} className="text-amber-600" />
          {showingDest ? (
            <>
              去
              <span className="max-w-[140px] truncate text-amber-600">
                {target?.name ?? "目的地"}
              </span>
              的{modeConfig.label}路线
            </>
          ) : (
            <>{modeConfig.label}通勤路线</>
          )}
        </span>
        <span className="text-[11px] text-stone-400">
          {spread <= 5 ? "时间非常均衡" : spread <= 12 ? "时间比较均衡" : "时间略有差异"}
          · 最大相差 {spread} 分钟
        </span>
        {routingDest && (
          <span className="text-[10px] text-stone-400">更新中…</span>
        )}
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto pb-0.5">
        {items.map(({ p, i, route }) => (
          <RouteCard
            key={p.id}
            label={p.label}
            color={PERSON_COLORS[i % PERSON_COLORS.length]}
            route={route}
          />
        ))}
      </div>
    </div>
  );
}
