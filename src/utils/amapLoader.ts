// 高德地图 JS API 2.0 动态加载器
// 通过环境变量注入 Key, 仅在配置了 Key 时加载真实地图与插件。

const AMAP_JS_KEY = import.meta.env.VITE_AMAP_KEY as string | undefined;
const AMAP_SECURITY = import.meta.env.VITE_AMAP_SECURITY_CODE as
  | string
  | undefined;

// 是否启用真实高德(配置了 JS API Key 即启用)
export const useRealAmap = Boolean(AMAP_JS_KEY);

// 需要用到的插件: 地理编码 + POI 搜索 + 三种路径规划
const PLUGINS = [
  "AMap.Geocoder",
  "AMap.PlaceSearch",
  "AMap.Driving",
  "AMap.Transfer",
  "AMap.Walking",
];

let loadPromise: Promise<typeof AMap> | null = null;

// 加载高德 JS API, 返回全局 AMap 命名空间。重复调用复用同一 Promise。
export function loadAMap(): Promise<typeof AMap> {
  if (!AMAP_JS_KEY) {
    return Promise.reject(new Error("未配置高德 JS API Key"));
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    // 已加载
    if (typeof window !== "undefined" && window.AMap) {
      resolve(window.AMap);
      return;
    }

    // 安全密钥(2021.12 之后申请的 Key 需要配套安全密钥)
    if (AMAP_SECURITY) {
      window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY };
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_JS_KEY}&plugin=${PLUGINS.join(
      ","
    )}`;
    script.onerror = () => reject(new Error("高德 JS API 加载失败"));
    script.onload = () => {
      if (window.AMap) resolve(window.AMap);
      else reject(new Error("高德 JS API 加载异常"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
