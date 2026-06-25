import { Star, Footprints, UtensilsCrossed } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { Restaurant } from "@/types";

// 距离(米) -> 步行分钟估算(步行 80 米/分钟)
function walkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

function RestaurantCard({
  r,
  active,
  selected,
  onEnter,
  onLeave,
  onClick,
}: {
  r: Restaurant;
  active: boolean;
  selected: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  return (
    <div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className={`cursor-pointer rounded-xl border px-3.5 py-3 transition ${
        selected
          ? "border-amber-500 bg-amber-100/90 shadow-md ring-1 ring-amber-400"
          : active
          ? "border-amber-400 bg-amber-50/90 shadow-md"
          : "border-stone-200/70 bg-white/70 hover:border-stone-300 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800">{r.name}</h3>
        {r.rating != null && (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600">
            <Star size={12} className="fill-amber-500 text-amber-500" />
            {r.rating}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-600">
          {r.category}
        </span>
        {r.avgPrice != null && <span>¥{r.avgPrice}/人</span>}
        <span className="flex items-center gap-1">
          <Footprints size={11} /> 步行约 {walkMinutes(r.distance)} 分钟
        </span>
        <span className="text-stone-400">{r.distance}m</span>
      </div>
      {selected && (
        <p className="mt-1.5 text-[10px] font-medium text-amber-600">
          已选为目的地，下方显示各自到这里的路线
        </p>
      )}
    </div>
  );
}

export default function RestaurantList() {
  const restaurants = useAppStore((s) => s.restaurants);
  const result = useAppStore((s) => s.result);
  const highlightId = useAppStore((s) => s.highlightId);
  const selectedId = useAppStore((s) => s.selectedId);
  const setHighlight = useAppStore((s) => s.setHighlight);
  const selectRestaurant = useAppStore((s) => s.selectRestaurant);

  if (!result) return null;

  return (
    <div className="flex max-h-[calc(100vh-48px)] w-[330px] max-w-[calc(100vw-32px)] flex-col rounded-2xl border border-white/40 bg-white/75 shadow-[0_8px_40px_rgba(28,46,42,0.18)] backdrop-blur-xl">
      <div className="border-b border-stone-200/70 px-5 py-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-stone-800">
          <UtensilsCrossed size={18} className="text-amber-600" />
          中点附近的餐厅
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
          点击任意一家，查看大家各自到这里的通勤路线。
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {restaurants.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-stone-400">
            该位置附近暂未找到餐厅
          </p>
        ) : (
          restaurants.map((r) => (
            <RestaurantCard
              key={r.id}
              r={r}
              active={r.id === highlightId}
              selected={r.id === selectedId}
              onEnter={() => setHighlight(r.id)}
              onLeave={() => setHighlight(null)}
              onClick={() =>
                selectRestaurant(r.id === selectedId ? null : r.id)
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
