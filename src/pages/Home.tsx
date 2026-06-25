import MapCanvas from "@/components/MapCanvas";
import AMapView from "@/components/AMapView";
import InputPanel from "@/components/InputPanel";
import RestaurantList from "@/components/RestaurantList";
import CommuteBar from "@/components/CommuteBar";
import { useRealAmap } from "@/utils/amapLoader";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans text-stone-800">
      {/* 全屏地图背景: 配置了高德 Key 用真实地图, 否则回退到演示地图 */}
      {useRealAmap ? <AMapView /> : <MapCanvas />}

      {/* 左上角: 输入面板 */}
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <div className="pointer-events-auto">
          <InputPanel />
        </div>
      </div>

      {/* 右上角: 餐厅列表 */}
      <div className="pointer-events-none absolute right-4 top-4 z-10">
        <div className="pointer-events-auto">
          <RestaurantList />
        </div>
      </div>

      {/* 底部居中: 通勤均衡度 */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2">
        <CommuteBar />
      </div>
    </div>
  );
}
