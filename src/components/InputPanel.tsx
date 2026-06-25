import { MapPin, Plus, X, Compass, RotateCcw, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { PERSON_COLORS, TRAVEL_MODES } from "@/constants";

export default function InputPanel() {
  const persons = useAppStore((s) => s.persons);
  const mode = useAppStore((s) => s.mode);
  const loading = useAppStore((s) => s.loading);
  const setAddress = useAppStore((s) => s.setAddress);
  const setMode = useAppStore((s) => s.setMode);
  const addPerson = useAppStore((s) => s.addPerson);
  const removePerson = useAppStore((s) => s.removePerson);
  const calculate = useAppStore((s) => s.calculate);
  const reset = useAppStore((s) => s.reset);

  const validCount = persons.filter((p) => p.address.trim()).length;
  const canCalc = validCount >= 2 && !loading;

  return (
    <div className="w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-white/40 bg-white/75 p-5 shadow-[0_8px_40px_rgba(28,46,42,0.18)] backdrop-blur-xl">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-800">
          聚点
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          输入每个人的位置，选择通勤方式，找到最均衡的中点。
        </p>
      </div>

      {/* 通勤方式切换: 不同方式会得到不同的中心点 */}
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100/80 p-1">
        {TRAVEL_MODES.map((m) => {
          const Icon = m.icon;
          const active = m.key === mode;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
                active
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
              aria-pressed={active}
            >
              <Icon size={15} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {persons.map((p, i) => (
          <div key={p.id} className="group relative">
            <div className="flex items-center gap-2.5 rounded-xl border border-stone-200/80 bg-white/80 px-3 py-2 transition focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-200">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: PERSON_COLORS[i % PERSON_COLORS.length] }}
              >
                {i + 1}
              </span>
              <input
                value={p.address}
                onChange={(e) => setAddress(p.id, e.target.value)}
                placeholder={`${p.label}的位置，如「望京」「国贸」`}
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCalc) calculate();
                }}
              />
              {persons.length > 2 && (
                <button
                  onClick={() => removePerson(p.id)}
                  className="shrink-0 rounded-full p-1 text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100"
                  aria-label="删除"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {p.error && (
              <p className="ml-9 mt-1 text-[11px] text-red-500">{p.error}</p>
            )}
          </div>
        ))}
      </div>

      {persons.length < 6 && (
        <button
          onClick={addPerson}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2 text-xs font-medium text-stone-500 transition hover:border-amber-400 hover:text-amber-600"
        >
          <Plus size={14} /> 添加一个人
        </button>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={calculate}
          disabled={!canCalc}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition enabled:hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Compass size={16} />
          )}
          {loading ? "计算中…" : "计算中心点"}
        </button>
        <button
          onClick={reset}
          className="flex items-center justify-center rounded-xl border border-stone-200 bg-white/70 px-3 text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          aria-label="重置"
          title="重置"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {validCount < 2 && (
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-stone-400">
          <MapPin size={12} /> 至少填写 2 个位置才能计算
        </p>
      )}
    </div>
  );
}
