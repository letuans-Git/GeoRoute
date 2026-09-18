import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { 
  Crosshair, 
  Maximize, 
  Layers, 
  Search, 
  Loader2, 
  Check, 
  X, 
  Navigation,
  Compass,
  AlertCircle
} from 'lucide-react';
import { RouteItem, LocationPoint, getSegmentsFromPolyline, getAllPointsFromPolyline } from '../types';

export interface PointPickerMapProps {
  currentRoute: RouteItem;
  existingPoints?: LocationPoint[];
  pointLat: number;
  pointLng: number;
  accuracy?: number;
  onCoordsChange: (lat: number, lng: number, accuracy?: number) => void;
  pointName?: string;
  pointCategory?: string;
  pointStatus?: LocationPoint['status'];
  isGettingGps?: boolean;
  onGetCurrentGps?: () => void;
  gpsError?: string | null;
  editingPointId?: string;
  isEditing?: boolean;
}

export const PointPickerMap: React.FC<PointPickerMapProps> = ({
  currentRoute,
  existingPoints = [],
  pointLat,
  pointLng,
  accuracy,
  onCoordsChange,
  pointName,
  pointCategory,
  pointStatus = 'Đang hoạt động',
  isGettingGps = false,
  onGetCurrentGps,
  gpsError,
  editingPointId,
  isEditing = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const activeMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routePolylineGroupRef = useRef<L.LayerGroup | null>(null);
  const otherPointsGroupRef = useRef<L.LayerGroup | null>(null);
  const isDraggingRef = useRef(false);
  const hasCenteredInitiallyRef = useRef(false);
  const prevIconHtmlRef = useRef<string>('');

  const [activeTileType, setActiveTileType] = useState<'google_hybrid' | 'google_streets' | 'esri_sat'>('google_hybrid');
  const [showLayerPopover, setShowLayerPopover] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const onCoordsChangeRef = useRef(onCoordsChange);
  onCoordsChangeRef.current = onCoordsChange;

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = 
      pointLat !== 0 && pointLng !== 0 
        ? [pointLat, pointLng] 
        : currentRoute.center;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: currentRoute.zoom || 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Custom bottom-right zoom controls
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Tile Layer: Google Hybrid Satellite
    const initialTile = L.tileLayer(
      'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      {
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }
    ).addTo(map);
    tileLayerRef.current = initialTile;

    // Layer groups for route polyline & other points
    const routeGroup = L.layerGroup().addTo(map);
    routePolylineGroupRef.current = routeGroup;

    const pointsGroup = L.layerGroup().addTo(map);
    otherPointsGroupRef.current = pointsGroup;

    mapRef.current = map;

    // Handle map click: relocate active point with visual click effect
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (isDraggingRef.current) return;

      // Create a transient ripple / ping marker at exact click coordinates (đúng định dạng điểm lúc sửa)
      const clickPinHtml = `
        <div class="relative w-11 h-11 flex items-center justify-center pointer-events-none select-none">
          <span class="absolute w-8 h-8 rounded-full border-2 border-yellow-400/90 bg-yellow-400/25 yellow-halo-pulse pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/50 border border-[#ef4444]/75 animate-ping pointer-events-none"></span>
          <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#ef4444] pointer-events-none"></span>
          <div class="point-studio-red-dot pointer-events-none">
            <div style="width: 6px !important; height: 6px !important; min-width: 6px !important; min-height: 6px !important; border-radius: 9999px !important; background-color: #ffffff !important; aspect-ratio: 1/1 !important;"></div>
          </div>
        </div>
      `;
      const clickIcon = L.divIcon({
        html: clickPinHtml,
        className: 'transient-click-dot',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const tempMarker = L.marker([e.latlng.lat, e.latlng.lng], { icon: clickIcon, zIndexOffset: 900 }).addTo(map);
      setTimeout(() => {
        try {
          map.removeLayer(tempMarker);
        } catch {
          // ignore if already removed
        }
      }, 700);

      onCoordsChangeRef.current(e.latlng.lat, e.latlng.lng, 3.0);
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Tile Layer
  const setTileLayer = (type: 'google_hybrid' | 'google_streets' | 'esri_sat') => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    let maxZoom = 21;

    if (type === 'google_streets') {
      url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    } else if (type === 'esri_sat') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(url, { maxZoom, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
    newLayer.addTo(mapRef.current);
    tileLayerRef.current = newLayer;
    setActiveTileType(type);
  };

  // Render Route Polyline for Context
  useEffect(() => {
    if (!mapRef.current || !routePolylineGroupRef.current) return;
    routePolylineGroupRef.current.clearLayers();

    if (!currentRoute.polyline) return;
    const segments = getSegmentsFromPolyline(currentRoute.polyline);
    if (segments.length === 0) return;

    const strokeColor = currentRoute.strokeStyle?.color || (currentRoute.type === 'street' ? '#0284c7' : '#dc2626');
    const strokeWeight = Math.max((currentRoute.strokeStyle?.weight || 6) - 1, 4);

    segments.forEach((seg) => {
      if (seg.length < 2) return;

      // Glow layer
      L.polyline(seg, {
        color: '#ffffff',
        weight: strokeWeight + 4,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routePolylineGroupRef.current!);

      // Main line
      L.polyline(seg, {
        color: strokeColor,
        weight: strokeWeight,
        opacity: 0.9,
        dashArray: currentRoute.strokeStyle?.dashArray || (currentRoute.type === 'street' ? '10, 8' : undefined),
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routePolylineGroupRef.current!);
    });
  }, [currentRoute]);

  // Render Other Points along the route for reference
  useEffect(() => {
    if (!mapRef.current || !otherPointsGroupRef.current) return;
    otherPointsGroupRef.current.clearLayers();

    existingPoints.forEach((p) => {
      // Don't render the point currently being edited in the background group
      if (editingPointId && p.id === editingPointId) return;
      if (Math.abs(p.lat - pointLat) < 0.00001 && Math.abs(p.lng - pointLng) < 0.00001) return;

      // Đồng bộ 100% kích thước với form view: w-11 h-11, chấm 19px, 3 tầng sóng sonar 32px, hào quang 28px
      const markerHtml = `
        <div class="relative w-11 h-11 flex items-center justify-center pointer-events-auto select-none">
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/45 border border-[#22c55e]/75 sonar-wave-1 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/35 border border-[#22c55e]/65 sonar-wave-2 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/25 border border-[#22c55e]/55 sonar-wave-3 pointer-events-none"></span>
          <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#22c55e] animate-pulse pointer-events-none"></span>
          <div class="w-[19px] h-[19px] min-w-[19px] min-h-[19px] aspect-square rounded-full bg-[#22c55e] border-[2.5px] border-white shadow-[0_3px_10px_rgba(0,0,0,0.55)] flex items-center justify-center select-none shrink-0">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `;
      const icon = L.divIcon({
        className: 'custom-marker-icon',
        html: markerHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([p.lat, p.lng], { icon });

      marker.bindTooltip(`<strong>${p.name}</strong><br/><span style="font-size:10px;color:#64748b;">${p.category}</span>`, {
        direction: 'top',
        className: 'custom-map-tooltip',
      });

      marker.addTo(otherPointsGroupRef.current!);
    });
  }, [existingPoints, pointLat, pointLng, editingPointId]);

  // Reset initial centering whenever editingPointId changes
  useEffect(() => {
    hasCenteredInitiallyRef.current = false;
  }, [editingPointId]);

  // Center map onto the point when editing a point with valid coordinates
  useEffect(() => {
    if (!mapRef.current) return;
    if (pointLat !== 0 && pointLng !== 0 && !hasCenteredInitiallyRef.current) {
      mapRef.current.setView([pointLat, pointLng], 17);
      hasCenteredInitiallyRef.current = true;
    }
  }, [pointLat, pointLng, editingPointId]);

  // Render & Update Active Draggable Pin - Khi sửa điểm hoặc sau khi chọn tọa độ điểm mới:
  // Luôn vẽ chấm tròn đúng theo định dạng của điểm lúc sửa:
  // - Chấm tròn màu đỏ rực rỡ (đúng 19px chuẩn), bo viền trắng 2.5px & viền ngoài vàng hổ phách tỏa sáng
  // - Điểm tâm sáng trắng 6px
  // - Hào quang phụ màu vàng lan tỏa rực rỡ (yellow-halo-pulse)
  // - 3 tầng sóng sonar lan tỏa mở rộng màu đỏ rực rỡ (sonar-wave-1, sonar-wave-2, sonar-wave-3)
  // - Vòng xung nhịp màu đỏ (ring-2 ring-[#ef4444] animate-pulse)
  // - Kéo thả di chuyển vị trí linh hoạt
  useEffect(() => {
    if (!mapRef.current) return;
    if (pointLat === 0 || pointLng === 0) return;

    const isEditMode = Boolean(isEditing);
    const pointThemeColor = '#ef4444';

    // Kích thước của điểm đồng bộ hoàn toàn với điểm ở form view:
    // Container: w-11 h-11 (44px), IconSize: [44, 44], Anchor: [22, 22]
    // Chấm tròn: Đúng 19px (point-studio-red-dot)
    // Sóng sonar: 3 tầng w-8 h-8 (32px)
    // Hào quang vàng: Vòng hào quang vàng tỏa sáng xung quanh điểm đỏ (yellow-halo-pulse)
    const labelTitle = isEditMode
      ? (pointName?.trim() ? `Đang sửa: ${pointName.trim()}` : 'Điểm đang sửa')
      : (pointName?.trim() ? `Tọa độ mới: ${pointName.trim()}` : 'Tọa độ điểm mới (kéo đổi vị trí)');

    const customPinHtml = `
      <div class="relative w-11 h-11 flex items-center justify-center select-none" style="touch-action: none; user-select: none;">
        <!-- HÀO QUANG PHỤ MÀU VÀNG: Vòng hào quang vàng tỏa sáng lan tỏa rực rỡ để người dùng dễ dàng nhận diện -->
        <span class="absolute w-8 h-8 rounded-full border-2 border-yellow-400/90 bg-yellow-400/25 yellow-halo-pulse pointer-events-none"></span>

        <!-- 3 tầng sóng sonar lan tỏa mở rộng màu đỏ rực rỡ đồng bộ form view -->
        <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/45 border border-[#ef4444]/75 sonar-wave-1 pointer-events-none"></span>
        <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/35 border border-[#ef4444]/65 sonar-wave-2 pointer-events-none"></span>
        <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/25 border border-[#ef4444]/55 sonar-wave-3 pointer-events-none"></span>
        <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#ef4444] animate-pulse pointer-events-none"></span>

        <!-- Chấm tròn màu đỏ rực rỡ (đúng 19px chuẩn form view), bo viền trắng & viền ngoài vàng -->
        <div 
          class="point-studio-red-dot hover:scale-105 shrink-0 pointer-events-none transition-transform" 
          title="${labelTitle}"
        >
          <div style="width: 6px !important; height: 6px !important; min-width: 6px !important; min-height: 6px !important; border-radius: 9999px !important; background-color: #ffffff !important; aspect-ratio: 1/1 !important;"></div>
        </div>

        <!-- Thẻ tên nổi phía trên với viền vàng nổi bật -->
        <div class="absolute -top-6 whitespace-nowrap bg-slate-950/95 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/80 shadow-[0_3px_8px_rgba(0,0,0,0.6)] pointer-events-none flex items-center gap-1 backdrop-blur-xs">
          <span style="width: 7px !important; height: 7px !important; min-width: 7px !important; min-height: 7px !important; border-radius: 9999px !important; background-color: #ef4444 !important; border: 1px solid #facc15 !important; display: inline-block !important; aspect-ratio: 1/1 !important;"></span>
          <span>${labelTitle}</span>
        </div>
      </div>
    `;

    const pinIcon = L.divIcon({
      html: customPinHtml,
      className: 'point-studio-active-pin',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (!activeMarkerRef.current) {
      const marker = L.marker([pointLat, pointLng], {
        icon: pinIcon,
        draggable: true,
        zIndexOffset: 1000,
        autoPan: true,
      }).addTo(mapRef.current);

      if (marker.dragging) {
        marker.dragging.enable();
      }

      marker.on('dragstart', () => {
        isDraggingRef.current = true;
      });

      marker.on('drag', () => {
        const pos = marker.getLatLng();
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(pos);
        }
        onCoordsChangeRef.current(pos.lat, pos.lng, 3.0);
      });

      marker.on('dragend', () => {
        isDraggingRef.current = false;
        const pos = marker.getLatLng();
        onCoordsChangeRef.current(pos.lat, pos.lng, 3.0);
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setLatLng(pos);
        }
      });

      activeMarkerRef.current = marker;
      prevIconHtmlRef.current = customPinHtml;
    } else {
      // Marker already exists:
      // 1. Only update icon HTML if it changed and NOT currently dragging
      if (!isDraggingRef.current && prevIconHtmlRef.current !== customPinHtml) {
        activeMarkerRef.current.setIcon(pinIcon);
        prevIconHtmlRef.current = customPinHtml;
        if (activeMarkerRef.current.dragging && !activeMarkerRef.current.dragging.enabled()) {
          activeMarkerRef.current.dragging.enable();
        }
      }

      // 2. Only update coordinates if not currently dragging
      if (!isDraggingRef.current) {
        const curPos = activeMarkerRef.current.getLatLng();
        if (Math.abs(curPos.lat - pointLat) > 0.000001 || Math.abs(curPos.lng - pointLng) > 0.000001) {
          activeMarkerRef.current.setLatLng([pointLat, pointLng]);
        }
        if (activeMarkerRef.current.dragging && !activeMarkerRef.current.dragging.enabled()) {
          activeMarkerRef.current.dragging.enable();
        }
      }
    }

    // Accuracy Circle
    if (accuracy && accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([pointLat, pointLng], {
          radius: accuracy,
          color: pointThemeColor,
          weight: 1.5,
          opacity: 0.7,
          fillColor: pointThemeColor,
          fillOpacity: 0.15,
        }).addTo(mapRef.current);
      } else {
        if (!isDraggingRef.current) {
          accuracyCircleRef.current.setLatLng([pointLat, pointLng]);
        }
        accuracyCircleRef.current.setRadius(accuracy);
        accuracyCircleRef.current.setStyle({ color: pointThemeColor, fillColor: pointThemeColor });
      }
    } else if (accuracyCircleRef.current) {
      mapRef.current.removeLayer(accuracyCircleRef.current);
      accuracyCircleRef.current = null;
    }
  }, [pointLat, pointLng, pointName, pointStatus, accuracy, isEditing]);

  // Center on current point
  const handleCenterOnPoint = () => {
    if (!mapRef.current || pointLat === 0 || pointLng === 0) return;
    mapRef.current.flyTo([pointLat, pointLng], 17, { duration: 0.8 });
  };

  // Center on full route
  const handleCenterOnRoute = () => {
    if (!mapRef.current) return;
    const allRoutePts = getAllPointsFromPolyline(currentRoute.polyline || []);
    if (allRoutePts.length >= 2) {
      try {
        mapRef.current.fitBounds(L.latLngBounds(allRoutePts).pad(0.18));
      } catch (e) {
        mapRef.current.flyTo(currentRoute.center, currentRoute.zoom || 14);
      }
    } else {
      mapRef.current.flyTo(currentRoute.center, currentRoute.zoom || 14);
    }
  };

  // Address search via OpenStreetMap Nominatim
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim() + ', Vietnam'
        )}&countrycodes=vn&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const foundLat = parseFloat(data[0].lat);
        const foundLng = parseFloat(data[0].lon);
        mapRef.current.flyTo([foundLat, foundLng], 17, { duration: 1 });
        onCoordsChangeRef.current(foundLat, foundLng, 5.0);
        setShowSearchInput(false);
      } else {
        setSearchError('Không tìm thấy địa điểm này trong bản đồ.');
      }
    } catch (err) {
      setSearchError('Lỗi kết nối tra cứu bản đồ.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Interactive Map Canvas */}
      <div 
        ref={containerRef} 
        id="point-picker-leaflet-canvas"
        className="w-full h-full cursor-crosshair"
        style={{ width: '100%', height: '100%' }}
      />

      {/* TOP FLOATING ULTRA-COMPACT TOOLBAR */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-[1000] flex items-center gap-1.5 flex-wrap max-w-[calc(100vw-70px)]">
        <div className="bg-slate-950/95 backdrop-blur-md px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-1">
          {/* 1. Lấy GPS Tại Chỗ */}
          {onGetCurrentGps && (
            <div className="relative group">
              <button
                type="button"
                id="btn-point-studio-gps"
                onClick={onGetCurrentGps}
                disabled={isGettingGps}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isGettingGps 
                    ? 'bg-amber-600 text-white animate-pulse' 
                    : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-800'
                }`}
              >
                <Crosshair className={`w-4 h-4 ${isGettingGps ? 'animate-spin' : ''}`} />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-56 p-2.5 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-xs mb-0.5">
                  <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lấy GPS Tại Chỗ</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Định vị tọa độ thực tế từ GPS của thiết bị/trình duyệt.
                </p>
              </div>
            </div>
          )}

          {/* 2. Căn vào Điểm (FlyTo Point) */}
          <div className="relative group">
            <button
              type="button"
              id="btn-point-studio-fit-point"
              onClick={handleCenterOnPoint}
              disabled={pointLat === 0 || pointLng === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block" />
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-56 p-2.5 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300 text-xs mb-0.5">
                <span className="w-3 h-3 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0" />
                <span>Căn Giữa Vào Điểm</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Phóng to và căn giữa bản đồ vào vị trí ghim hiện tại.
              </p>
            </div>
          </div>

          {/* 3. Căn Toàn Tuyến */}
          <div className="relative group">
            <button
              type="button"
              id="btn-point-studio-fit-route"
              onClick={handleCenterOnRoute}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
            {/* Tooltip */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-56 p-2.5 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-0.5">
                <Maximize className="w-3.5 h-3.5 text-amber-400" />
                <span>Xem Toàn Tuyến</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                Thu phóng vừa vặn toàn bộ cung đường của tuyến quản lý.
              </p>
            </div>
          </div>

          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* 4. Lớp Bản Đồ */}
          <div className="relative">
            <button
              type="button"
              id="btn-point-studio-layers"
              onClick={() => {
                setShowLayerPopover(!showLayerPopover);
                setShowSearchInput(false);
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                showLayerPopover ? 'bg-indigo-600 text-white' : 'text-sky-400 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Layer Popover */}
            {showLayerPopover && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-950/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-2 z-[1002] space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Lớp Bản Đồ
                </div>
                <button
                  type="button"
                  onClick={() => { setTileLayer('google_hybrid'); setShowLayerPopover(false); }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                    activeTileType === 'google_hybrid' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Google Vệ Tinh</span>
                  {activeTileType === 'google_hybrid' && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setTileLayer('google_streets'); setShowLayerPopover(false); }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                    activeTileType === 'google_streets' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Google Đường Bộ</span>
                  {activeTileType === 'google_streets' && <Check className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setTileLayer('esri_sat'); setShowLayerPopover(false); }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                    activeTileType === 'esri_sat' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>Esri Vệ Tinh</span>
                  {activeTileType === 'esri_sat' && <Check className="w-3 h-3" />}
                </button>
              </div>
            )}
          </div>

          {/* 5. Tìm Kiếm Vị Trí */}
          <button
            type="button"
            id="btn-point-studio-search"
            onClick={() => {
              setShowSearchInput(!showSearchInput);
              setShowLayerPopover(false);
            }}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              showSearchInput ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Popover */}
        {showSearchInput && (
          <form
            onSubmit={handleSearchLocation}
            className="flex items-center gap-1 bg-slate-950/95 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-left-2 duration-150"
          >
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập địa chỉ, đường phố..."
              className="bg-slate-900 text-slate-100 placeholder-slate-500 px-2 sm:px-2.5 py-1 text-xs rounded-lg border border-slate-700 focus:outline-hidden w-36 sm:w-52"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-2 sm:px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Đến'}
            </button>
            <button
              type="button"
              onClick={() => setShowSearchInput(false)}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* FLOATING STATUS PILL (CENTER TOP OF MAP) */}
      <div className="pointer-events-none absolute top-2.5 sm:top-3 left-1/2 -translate-x-1/2 z-[990] hidden xs:flex items-center gap-1.5 sm:gap-2 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-xs transition-all max-w-[50vw] sm:max-w-none truncate">
        {isGettingGps ? (
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Đang dò sóng vệ tinh GPS...</span>
          </div>
        ) : pointLat !== 0 && pointLng !== 0 ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border border-white shadow-xs inline-block"></span>
            <span className="font-mono text-emerald-400 font-semibold">
              {pointLat.toFixed(6)}, {pointLng.toFixed(6)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Chưa xác định tọa độ</span>
          </div>
        )}
      </div>

      {/* GPS Error Alert (Bottom Center if any) */}
      {gpsError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-rose-950/95 backdrop-blur-md text-rose-200 border border-rose-500/50 shadow-2xl px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Search Error Alert */}
      {searchError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-rose-950/95 backdrop-blur-md text-rose-200 border border-rose-500/50 shadow-2xl px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Interactive Drag & Drop / Click Guidance Banner */}
      {!gpsError && !searchError && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[990] bg-slate-950/90 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-[11px] sm:text-xs text-slate-200 flex items-center gap-2 max-w-[92vw] pointer-events-none select-none">
          {isEditing ? (
            <>
              <span className="w-3 h-3 min-w-[12px] min-h-[12px] aspect-square rounded-full bg-[#ef4444] border-2 border-white ring-2 ring-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.9)] shrink-0 animate-pulse"></span>
              <span>
                Điểm đang sửa đổi sang <strong>màu đỏ có hào quang vàng</strong>: Nhấn giữ &amp; di chuột để đổi tọa độ
              </span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 min-w-[10px] min-h-[10px] aspect-square rounded-full bg-white border-2 border-[#22c55e] shrink-0 animate-pulse"></span>
              <span>
                Nhấp vào bản đồ hoặc <strong>nhấn giữ &amp; di chuột</strong> để di chuyển điểm
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
