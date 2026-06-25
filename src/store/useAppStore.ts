import { create } from "zustand";
import type {
  CenterResult,
  LngLat,
  Person,
  PersonRoute,
  Restaurant,
  TravelMode,
} from "@/types";
import { geocode, searchRestaurants, planRoute, getCity } from "@/utils/amapService";
import { pickBalancedCenter } from "@/utils/geo";

let idSeq = 0;
const nextId = () => `p-${++idSeq}`;

function makePerson(label: string, address = ""): Person {
  return { id: nextId(), label, address };
}

interface AppState {
  persons: Person[];
  mode: TravelMode;
  result: CenterResult | null;
  restaurants: Restaurant[];
  loading: boolean;
  highlightId: string | null; // 高亮的餐厅 id(鼠标悬停)
  selectedId: string | null; // 选中作为目的地的餐厅 id(点击)
  destinationRoutes: (PersonRoute | null)[] | null; // 各人到选中餐厅的路线
  routingDest: boolean; // 正在规划到选中餐厅的路线
  fitTick: number; // 自增触发地图聚焦

  setAddress: (id: string, address: string) => void;
  setMode: (mode: TravelMode) => void;
  addPerson: () => void;
  removePerson: (id: string) => void;
  calculate: () => Promise<void>;
  setHighlight: (id: string | null) => void;
  selectRestaurant: (id: string | null) => Promise<void>;
  reset: () => void;
}

const FRIEND_LABELS = ["我", "朋友1", "朋友2", "朋友3", "朋友4", "朋友5"];

export const useAppStore = create<AppState>((set, get) => ({
  persons: [makePerson(FRIEND_LABELS[0]), makePerson(FRIEND_LABELS[1])],
  mode: "transit",
  result: null,
  restaurants: [],
  loading: false,
  highlightId: null,
  selectedId: null,
  destinationRoutes: null,
  routingDest: false,
  fitTick: 0,

  setAddress: (id, address) =>
    set((s) => ({
      persons: s.persons.map((p) =>
        p.id === id ? { ...p, address, error: undefined } : p
      ),
    })),

  setMode: (mode) => {
    const prevSelected = get().selectedId;
    set({ mode });
    // 已有计算结果时, 切换通勤方式立即按新方式重算中心点
    if (get().result) {
      get()
        .calculate()
        .then(() => {
          // 若之前选中了某家餐厅, 用新通勤方式重新规划到该餐厅的路线
          if (prevSelected && get().restaurants.some((r) => r.id === prevSelected)) {
            get().selectRestaurant(prevSelected);
          }
        });
    }
  },

  addPerson: () =>
    set((s) => {
      if (s.persons.length >= 6) return s;
      const label = FRIEND_LABELS[s.persons.length] || `朋友${s.persons.length}`;
      return { persons: [...s.persons, makePerson(label)] };
    }),

  removePerson: (id) =>
    set((s) => {
      if (s.persons.length <= 2) return s;
      return { persons: s.persons.filter((p) => p.id !== id) };
    }),

  setHighlight: (id) => set({ highlightId: id }),

  // 点选某家餐厅作为目的地: 规划各人到该餐厅的真实路线; 传 null 取消选择
  selectRestaurant: async (id) => {
    if (id == null) {
      set({ selectedId: null, destinationRoutes: null, routingDest: false });
      return;
    }
    const { restaurants, persons, mode } = get();
    const target = restaurants.find((r) => r.id === id);
    if (!target) return;

    set({ selectedId: id, routingDest: true });

    const valid = persons.filter((p) => p.location);
    const city = await getCity(target.location);
    const routeByPersonId = new Map<string, PersonRoute>();
    await Promise.all(
      valid.map(async (p) => {
        const route = await planRoute(
          p.location as LngLat,
          target.location,
          mode,
          city
        );
        routeByPersonId.set(p.id, route);
      })
    );

    // 选择可能在异步期间被更改, 仅当仍选中该餐厅时写回
    if (get().selectedId !== id) return;
    const destinationRoutes = persons.map((p) => routeByPersonId.get(p.id) ?? null);
    set({ destinationRoutes, routingDest: false });
  },

  calculate: async () => {
    const { persons, mode } = get();
    set({ loading: true, selectedId: null, destinationRoutes: null });

    // 1. 地理编码
    const geocoded = await Promise.all(
      persons.map(async (p) => {
        if (!p.address.trim()) return { ...p, location: undefined, error: undefined };
        const loc = await geocode(p.address);
        return loc
          ? { ...p, location: loc, error: undefined }
          : { ...p, location: undefined, error: "未找到该地址" };
      })
    );
    set({ persons: geocoded });

    const valid = geocoded.filter((p) => p.location) as Required<Person>[];
    if (valid.length < 2) {
      set({ loading: false, result: null, restaurants: [] });
      return;
    }

    // 2. 计算均衡中心点(按所选通勤方式, 用直线近似选址)
    const points = valid.map((p) => p.location as LngLat);
    const { center } = pickBalancedCenter(points, mode);

    // 3. 对最终中心点, 调用真实路径规划得到每人具体路线与耗时
    const city = await getCity(center);
    const routeByPersonId = new Map<string, Awaited<ReturnType<typeof planRoute>>>();
    await Promise.all(
      valid.map(async (p) => {
        const route = await planRoute(p.location as LngLat, center, mode, city);
        routeByPersonId.set(p.id, route);
      })
    );

    // routes/durations 需与完整 persons 列表对齐(无坐标的为 null / -1)
    const routes = geocoded.map((p) => routeByPersonId.get(p.id) ?? null);
    const durations = geocoded.map((p) => {
      const r = routeByPersonId.get(p.id);
      return r ? r.duration : -1;
    });

    // 4. 搜索周边餐厅
    const restaurants = await searchRestaurants(center);

    set((s) => ({
      result: { center, durations, routes },
      restaurants,
      loading: false,
      fitTick: s.fitTick + 1,
    }));
  },

  reset: () =>
    set({
      persons: [makePerson(FRIEND_LABELS[0]), makePerson(FRIEND_LABELS[1])],
      mode: "transit",
      result: null,
      restaurants: [],
      loading: false,
      highlightId: null,
      selectedId: null,
      destinationRoutes: null,
      routingDest: false,
      fitTick: 0,
    }),
}));
