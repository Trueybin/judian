/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_AMAP_WEB_KEY?: string;
  readonly VITE_AMAP_SECURITY_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 高德 JS API 全局类型(精简版, 仅覆盖本项目用到的能力)
declare namespace AMap {
  type LngLatLike = [number, number] | AMap.LngLat;

  class LngLat {
    constructor(lng: number, lat: number);
    getLng(): number;
    getLat(): number;
  }

  class Map {
    constructor(container: string | HTMLElement, opts?: Record<string, unknown>);
    add(overlay: unknown | unknown[]): void;
    remove(overlay: unknown | unknown[]): void;
    setFitView(
      overlays?: unknown[] | null,
      immediately?: boolean,
      avoid?: [number, number, number, number],
      maxZoom?: number
    ): void;
    setZoomAndCenter(zoom: number, center: LngLatLike): void;
    destroy(): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  class Marker {
    constructor(opts: Record<string, unknown>);
    setMap(map: Map | null): void;
    setContent(content: string | HTMLElement): void;
    on(event: string, handler: (...args: unknown[]) => void): void;
    getPosition(): LngLat;
  }

  class Polyline {
    constructor(opts: Record<string, unknown>);
    setMap(map: Map | null): void;
  }

  class Pixel {
    constructor(x: number, y: number);
  }

  class Size {
    constructor(w: number, h: number);
  }

  class Icon {
    constructor(opts: Record<string, unknown>);
  }

  class Geocoder {
    constructor(opts?: Record<string, unknown>);
    getLocation(
      address: string,
      cb: (status: string, result: GeocoderResult) => void
    ): void;
    getAddress(
      location: LngLatLike,
      cb: (status: string, result: ReGeocoderResult) => void
    ): void;
  }

  interface GeocoderResult {
    info: string;
    geocodes: { location: { lng: number; lat: number } }[];
  }

  interface ReGeocoderResult {
    info: string;
    regeocode?: {
      addressComponent?: { city?: string; province?: string };
    };
  }

  // -------- 路径规划: 坐标点 --------
  interface RoutePoint {
    lng: number;
    lat: number;
  }

  // -------- 驾车路径规划 --------
  class Driving {
    constructor(opts?: Record<string, unknown>);
    search(
      origin: LngLatLike,
      destination: LngLatLike,
      cb: (status: string, result: DrivingResult) => void
    ): void;
  }

  interface DrivingStep {
    path?: RoutePoint[];
    distance?: number;
    time?: number;
  }

  interface DrivingRoute {
    distance?: number;
    time?: number;
    steps?: DrivingStep[];
  }

  interface DrivingResult {
    info: string;
    routes?: DrivingRoute[];
  }

  // -------- 步行路径规划 --------
  class Walking {
    constructor(opts?: Record<string, unknown>);
    search(
      origin: LngLatLike,
      destination: LngLatLike,
      cb: (status: string, result: WalkingResult) => void
    ): void;
  }

  interface WalkingStep {
    path?: RoutePoint[];
    distance?: number;
    time?: number;
  }

  interface WalkingRoute {
    distance?: number;
    time?: number;
    steps?: WalkingStep[];
  }

  interface WalkingResult {
    info: string;
    routes?: WalkingRoute[];
  }

  // -------- 公交换乘路径规划 --------
  class Transfer {
    constructor(opts?: Record<string, unknown>);
    search(
      origin: LngLatLike,
      destination: LngLatLike,
      cb: (status: string, result: TransferResult) => void
    ): void;
  }

  interface TransitLine {
    name?: string; // 线路名, 如 "地铁10号线(巴沟--成都...)"
    type?: string; // 线路类型, 如 "地铁线路" "普通公交线路"
    via_num?: number; // 中途经过站数
  }

  interface TransitViaStop {
    name?: string;
    location?: RoutePoint;
  }

  interface RouteTransit {
    on_station?: TransitViaStop; // 上车站
    off_station?: TransitViaStop; // 下车站
    lines?: TransitLine[];
    via_stops?: TransitViaStop[];
    path?: RoutePoint[];
  }

  interface RouteWalking {
    distance?: number;
    time?: number;
    path?: RoutePoint[];
    steps?: WalkingStep[];
  }

  interface TransferSegment {
    transit_mode?: string; // "WALK" | "SUBWAY" | "BUS" | "TAXI" 等
    walking?: RouteWalking;
    transit?: RouteTransit;
    instruction?: string;
  }

  interface TransferPlan {
    cost?: number | string; // 票价(元)
    time?: number; // 耗时(秒)
    distance?: number; // 总距离(米)
    walking_distance?: number; // 步行距离(米)
    segments?: TransferSegment[];
    path?: RoutePoint[];
  }

  interface TransferResult {
    info: string;
    plans?: TransferPlan[];
  }

  class PlaceSearch {
    constructor(opts?: Record<string, unknown>);
    searchNearBy(
      keyword: string,
      center: LngLatLike,
      radius: number,
      cb: (status: string, result: PlaceSearchResult) => void
    ): void;
  }

  interface PlaceSearchPoi {
    id: string;
    name: string;
    type: string;
    location: { lng: number; lat: number };
    distance?: number;
    cost?: string | number;
  }

  interface PlaceSearchResult {
    info: string;
    poiList?: { pois: PlaceSearchPoi[] };
  }
}

interface Window {
  AMap: typeof AMap;
  _AMapSecurityConfig?: { securityJsCode: string };
}
