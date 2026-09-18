import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Crosshair, 
  Maximize2, 
  Eye, 
  Phone, 
  ShieldCheck, 
  Edit3, 
  Trash2,
  Anchor,
  Truck,
  Utensils,
  Store,
  Navigation,
  Info,
  Lock,
  Unlock,
  SlidersHorizontal
} from 'lucide-react';
import { RouteItem, LocationPoint, UserRole, getRolePermissions, EffectivePermissions, getSegmentsFromPolyline, getAllPointsFromPolyline } from '../types';

interface MapComponentProps {
  currentRoute: RouteItem;
  points: LocationPoint[];
  selectedPointId: string | null;
  editingPointId?: string | null;
  onSelectPoint: (point: LocationPoint | null) => void;
  onEditPoint: (point: LocationPoint) => void;
  onDeletePoint: (pointId: string) => void;
  userRole: UserRole;
  userLocation: { lat: number; lng: number; accuracy?: number } | null;
  isPickingLocation?: boolean;
  onLocationPicked?: (lat: number, lng: number) => void;
  onOpenRouteInfo?: () => void;
  permissions?: EffectivePermissions;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  currentRoute,
  points,
  selectedPointId,
  editingPointId,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  userRole,
  userLocation,
  isPickingLocation = false,
  onLocationPicked,
  onOpenRouteInfo,
  permissions,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const polylineGlowRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);
  const imageOverlayRef = useRef<L.ImageOverlay | null>(null);
  const boundsBorderRef = useRef<L.Rectangle | null>(null);

  const [mapType, setMapType] = useState<'google_hybrid' | 'google_streets' | 'esri_sat' | 'osm'>('google_hybrid');
  const [showRedRoute, setShowRedRoute] = useState<boolean>(true);
  const [showImageOverlay, setShowImageOverlay] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.75);

  // View / Zoom restriction lock state
  const [isViewLocked, setIsViewLocked] = useState<boolean>(currentRoute.restrictBounds ?? true);

  const activeTileLayerRef = useRef<L.TileLayer | null>(null);

  // Synchronize lock state when route changes
  useEffect(() => {
    setIsViewLocked(currentRoute.restrictBounds ?? true);
  }, [currentRoute.id, currentRoute.restrictBounds]);

  // Set Tile Layer helper
  const setTileLayer = (type: 'google_hybrid' | 'google_streets' | 'esri_sat' | 'osm') => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeTileLayerRef.current) {
      map.removeLayer(activeTileLayerRef.current);
    }

    let newLayer: L.TileLayer;
    if (type === 'google_hybrid') {
      newLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      });
    } else if (type === 'google_streets') {
      newLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      });
    } else if (type === 'esri_sat') {
      newLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: '&copy; Esri World Imagery' }
      );
    } else {
      newLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      });
    }

    newLayer.addTo(map);
    activeTileLayerRef.current = newLayer;
    setMapType(type);
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: currentRoute.center,
        zoom: currentRoute.zoom,
        zoomControl: false,
      });

      // Zoom control in bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Default: Google Hybrid Satellite
      const defaultTile = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '&copy; Google Maps',
      }).addTo(map);

      activeTileLayerRef.current = defaultTile;

      // Layer group for point markers
      const markersGroup = L.layerGroup().addTo(map);
      markersGroupRef.current = markersGroup;

      mapInstanceRef.current = map;

      // Invalidate size and ensure bounds after initial mount
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }

    // Observe container resizes to maintain map display consistency
    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  // Handle Location Pick Mode (Click map to get GPS)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (isPickingLocation && onLocationPicked) {
        // Create a transient red dot with white border & yellow halo pulse matching edit point format
        const clickPinHtml = `
          <div class="relative w-11 h-11 flex items-center justify-center pointer-events-none select-none">
            <span class="absolute w-8 h-8 rounded-full border-2 border-yellow-400/90 bg-yellow-400/25 yellow-halo-pulse pointer-events-none"></span>
            <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/50 border border-[#ef4444]/75 animate-ping pointer-events-none"></span>
            <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#ef4444] pointer-events-none"></span>
            <div class="w-[19px] h-[19px] min-w-[19px] min-h-[19px] aspect-square rounded-full bg-[#ef4444] border-[2.5px] border-white ring-2 ring-amber-400 shadow-[0_3px_10px_rgba(0,0,0,0.55),0_0_14px_rgba(250,204,21,0.85)] flex items-center justify-center select-none shrink-0">
              <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
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
            // ignore
          }
        }, 1200);

        onLocationPicked(e.latlng.lat, e.latlng.lng);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isPickingLocation, onLocationPicked]);

  // Update Route Polyline, Custom Stroke, and Restrict View/Zoom Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentRoute) return;

    // Temporarily release previous boundary constraints to allow smooth navigation to new route
    try {
      (map as any).options.maxBounds = null;
      if ((map as any)._panInsideMaxBounds && map.listens('moveend', (map as any)._panInsideMaxBounds)) {
        map.off('moveend', (map as any)._panInsideMaxBounds);
      }
      map.setMinZoom(3);
      map.setMaxZoom(20);
    } catch (err) {
      console.warn('Could not reset temporary bounds:', err);
    }

    // Position map directly to the route's polyline or defined bounds
    const allRoutePoints = getAllPointsFromPolyline(currentRoute.polyline);
    if (allRoutePoints.length > 1) {
      try {
        const polylineBounds = L.latLngBounds(allRoutePoints);
        map.fitBounds(polylineBounds.pad(0.12), { 
          padding: [40, 40], 
          maxZoom: currentRoute.zoom || 16,
          animate: true 
        });
      } catch {
        map.setView(currentRoute.center, currentRoute.zoom || 14, { animate: true });
      }
    } else if (currentRoute.bounds && currentRoute.bounds.length === 2) {
      try {
        map.fitBounds(currentRoute.bounds, { 
          padding: [35, 35], 
          maxZoom: currentRoute.zoom || 16,
          animate: true 
        });
      } catch {
        map.setView(currentRoute.center, currentRoute.zoom || 14, { animate: true });
      }
    } else {
      map.setView(currentRoute.center, currentRoute.zoom || 14, { animate: true });
    }

    // Enforce view/zoom boundaries if lock is enabled
    if (isViewLocked && currentRoute.bounds) {
      try {
        map.setMinZoom(currentRoute.minZoom || 10);
        map.setMaxZoom(currentRoute.maxZoom || 19);
        map.setMaxBounds(currentRoute.bounds);
      } catch (err) {
        console.warn('Could not set max bounds:', err);
      }
    }

    // Invalidate map size so all tiles and vectors render crisp immediately after modal close
    const sizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // Clean previous polyline and bounds border
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (polylineGlowRef.current) map.removeLayer(polylineGlowRef.current);
    if (boundsBorderRef.current) map.removeLayer(boundsBorderRef.current);

    // Optional bounds perimeter visual border
    if (isViewLocked && currentRoute.bounds) {
      boundsBorderRef.current = L.rectangle(currentRoute.bounds, {
        color: currentRoute.strokeStyle?.color || '#3b82f6',
        weight: 1,
        dashArray: '6, 6',
        fill: false,
        opacity: 0.35,
      }).addTo(map);
    }

    const routeSegments = getSegmentsFromPolyline(currentRoute.polyline);
    if (showRedRoute && routeSegments.length > 0) {
      const stroke = currentRoute.strokeStyle || {
        color: '#dc2626',
        weight: 6,
        dashArray: currentRoute.type === 'river' ? '' : '8, 8',
        opacity: 0.95,
        hasGlow: true,
      };

      // Outer glow line if configured (Leaflet supports array of LatLng arrays for multi-segments)
      if (stroke.hasGlow) {
        const glowLine = L.polyline(routeSegments, {
          color: stroke.color,
          weight: stroke.weight * 2.2,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        polylineGlowRef.current = glowLine;
      }

      // Main Stroke Line
      const mainLine = L.polyline(routeSegments, {
        color: stroke.color,
        weight: stroke.weight,
        opacity: stroke.opacity ?? 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: stroke.dashArray || undefined,
      }).addTo(map);
      polylineRef.current = mainLine;
    }

    // Image overlay if available
    if (imageOverlayRef.current) {
      map.removeLayer(imageOverlayRef.current);
      imageOverlayRef.current = null;
    }

    if (currentRoute.mapOverlay && showImageOverlay) {
      const overlay = L.imageOverlay(
        currentRoute.mapOverlay.imageUrl,
        currentRoute.mapOverlay.bounds,
        { opacity: overlayOpacity }
      ).addTo(map);
      imageOverlayRef.current = overlay;
    }

    return () => {
      clearTimeout(sizeTimer);
    };
  }, [currentRoute, showRedRoute, showImageOverlay, overlayOpacity, isViewLocked]);

  // Update Point Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    points.forEach((point) => {
      // Choose icon styling based on category
      const isSelected = selectedPointId === point.id;
      let badgeColor = '#2563eb'; // blue
      let iconSvg = '';

      if (point.category.includes('Bến cảng') || point.category.includes('Cảng')) {
        badgeColor = '#0284c7'; // cyan-600
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>`;
      } else if (point.category.includes('Bãi') || point.category.includes('vật liệu')) {
        badgeColor = '#d97706'; // amber-600
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="8" x="2" y="2" rx="1.5"/><path d="m14 14 6 6"/><rect width="8" height="8" x="14" y="2" rx="1.5"/><rect width="8" height="8" x="2" y="14" rx="1.5"/></svg>`;
      } else if (point.category.includes('Nhà hàng') || point.category.includes('Kem') || point.category.includes('cà phê')) {
        badgeColor = '#e11d48'; // rose-600
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 11v11"/><path d="M6 2v14a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2"/><path d="M6 7h5"/></svg>`;
      } else {
        badgeColor = '#7c3aed'; // violet-600
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`;
      }

      const isEditingThisPoint = Boolean(editingPointId && point.id === editingPointId);

      // Điểm đang sửa trong quá trình sửa: đổi sang màu đỏ có thêm hào quang phụ màu vàng
      // Sau khi lưu sửa hoặc lưu mới: tất cả điểm đều ở chế độ view (màu xanh lá cây tươi, sóng sonar xanh)
      // KÍCH THƯỚC ĐỒNG BỘ 100% VỚI ĐIỂM Ở FORM VIEW:
      // Container: w-11 h-11, IconSize: [44, 44], IconAnchor: [22, 22], PopupAnchor: [0, -22]
      // Chấm tròn: Đúng 19px (w-[19px] h-[19px] min-w-[19px] min-h-[19px] aspect-square rounded-full)
      // Tâm sáng: 6px (w-1.5 h-1.5)
      // 3 tầng sóng sonar: w-8 h-8 (32px)
      // Hào quang vàng: Vòng hào quang xung nhịp màu vàng lan tỏa xung quanh điểm đỏ
      const markerHtml = isEditingThisPoint
        ? `
        <div class="relative w-11 h-11 flex items-center justify-center cursor-pointer select-none group transition-transform duration-200">
          <!-- Hào quang phụ màu vàng lan tỏa rực rỡ cho điểm đang sửa trong quá trình sửa -->
          <span class="absolute w-8 h-8 rounded-full border-2 border-yellow-400/90 bg-yellow-400/25 yellow-halo-pulse pointer-events-none"></span>

          <!-- 3 tầng sóng sonar lan tỏa mở rộng màu đỏ đồng bộ form view -->
          <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/45 border border-[#ef4444]/75 sonar-wave-1 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/35 border border-[#ef4444]/65 sonar-wave-2 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#ef4444]/25 border border-[#ef4444]/55 sonar-wave-3 pointer-events-none"></span>
          <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#ef4444] animate-pulse pointer-events-none"></span>

          <!-- Chấm tròn màu đỏ rực rỡ bo viền trắng & viền ngoài màu vàng (đúng 19px chuẩn form view) -->
          <div 
            class="w-[19px] h-[19px] min-w-[19px] min-h-[19px] aspect-square rounded-full bg-[#ef4444] border-[2.5px] border-white ring-2 ring-amber-400 shadow-[0_3px_10px_rgba(0,0,0,0.55),0_0_14px_rgba(250,204,21,0.85)] flex items-center justify-center select-none shrink-0"
            title="Đang sửa: ${point.name} (${point.category})"
          >
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `
        : `
        <div class="relative w-11 h-11 flex items-center justify-center cursor-pointer select-none group transition-transform duration-200 ${isSelected ? 'scale-110 z-40' : 'hover:scale-105'}">
          <!-- 3 tầng sóng sonar lan tỏa mở rộng (sonar-wave-1, sonar-wave-2, sonar-wave-3) phát ra từ tất cả các điểm -->
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/45 border border-[#22c55e]/75 sonar-wave-1 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/35 border border-[#22c55e]/65 sonar-wave-2 pointer-events-none"></span>
          <span class="absolute w-8 h-8 rounded-full bg-[#22c55e]/25 border border-[#22c55e]/55 sonar-wave-3 pointer-events-none"></span>

          <!-- Vòng hào quang xung nhịp -->
          <span class="absolute w-7 h-7 rounded-full ring-2 ring-[#22c55e] animate-pulse pointer-events-none"></span>

          ${isSelected ? `
            <!-- Hào quang xung nhịp bổ sung cho điểm đang được chọn -->
            <span class="absolute w-8 h-8 rounded-full ring-2 ring-white animate-ping pointer-events-none"></span>
          ` : ''}

          <!-- Chấm tròn màu xanh lá cây tươi, có nét bo ngoài màu trắng (~19px) giữ nguyên hình dạng tròn hoàn hảo -->
          <div 
            class="w-[19px] h-[19px] min-w-[19px] min-h-[19px] aspect-square rounded-full bg-[#22c55e] border-[2.5px] border-white shadow-[0_3px_10px_rgba(0,0,0,0.55)] flex items-center justify-center group-hover:brightness-110 transition-all select-none shrink-0"
            title="${point.name} (${point.category})"
          >
            <!-- Điểm tâm sáng tinh tế -->
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-marker-icon',
        html: markerHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -22],
      });

      const marker = L.marker([point.lat, point.lng], { icon: customIcon });

      // Hover Tooltip (Preview)
      marker.bindTooltip(
        `<div class="px-2 py-1 text-xs font-semibold text-slate-900 bg-white rounded shadow-sm border border-slate-200 flex items-center gap-1.5">
          <span class="w-2.5 h-2.5 rounded-full ${isEditingThisPoint ? 'bg-[#ef4444] ring-1 ring-amber-400' : 'bg-[#22c55e]'} border border-white shrink-0 inline-block"></span>
          <span class="font-bold">${point.name}</span>
          <span class="text-slate-500 font-normal">(${point.category})</span>
          ${isEditingThisPoint ? '<span class="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded">Đang sửa</span>' : ''}
        </div>`,
        { direction: 'top', offset: [0, isEditingThisPoint ? -26 : -20], opacity: 0.95 }
      );

      // Popup Content (Full Detail as required: Tên vị trí, chủ sở hữu, tình trạng hiện tại, số điện thoại)
      const statusBadgeClasses = 
        point.status === 'Đang hoạt động' 
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
          : point.status === 'Tạm ngừng'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-rose-50 text-rose-700 border-rose-200';

      const popupContent = document.createElement('div');
      popupContent.className = 'p-4 min-w-[280px] max-w-[340px] text-slate-800 font-sans';
      popupContent.innerHTML = `
        <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${point.category}</span>
            <h4 class="text-sm font-bold text-slate-900 leading-snug">${point.name}</h4>
          </div>
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses} whitespace-nowrap">
            ${point.status}
          </span>
        </div>

        <div class="space-y-2 text-xs">
          <div class="flex items-start gap-2">
            <span class="text-slate-400 font-medium min-w-[70px]">Chủ sở hữu:</span>
            <span class="font-semibold text-slate-800">${point.owner}</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-slate-400 font-medium min-w-[70px]">Điện thoại:</span>
            <a href="tel:${point.phone}" class="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline">
              <span>${point.phone}</span>
            </a>
          </div>

          <div class="flex items-start gap-2">
            <span class="text-slate-400 font-medium min-w-[70px]">Tọa độ GPS:</span>
            <span class="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
              ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}
            </span>
          </div>

          ${point.address ? `
            <div class="flex items-start gap-2">
              <span class="text-slate-400 font-medium min-w-[70px]">Địa chỉ:</span>
              <span class="text-slate-600">${point.address}</span>
            </div>
          ` : ''}

          ${point.notes ? `
            <div class="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic">
              "${point.notes}"
            </div>
          ` : ''}
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
          <a 
            href="https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}" 
            target="_blank" 
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:underline"
          >
            Mở trên Google Maps
          </a>

          ${(() => {
            const perm = permissions || getRolePermissions(userRole);
            if (!perm.canEditPoint && !perm.canDeletePoint) return '';
            return `
              <div class="flex items-center gap-1">
                ${perm.canEditPoint ? `
                  <button 
                    id="popup-edit-${point.id}" 
                    class="px-2 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors cursor-pointer"
                  >
                    Sửa
                  </button>
                ` : ''}
                ${perm.canDeletePoint ? `
                  <button 
                    id="popup-delete-${point.id}" 
                    class="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                  >
                    Xóa
                  </button>
                ` : ''}
              </div>
            `;
          })()}
        </div>
      `;

      // Attach DOM events for admin buttons inside popup
      popupContent.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === `popup-edit-${point.id}`) {
          marker.closePopup();
          onEditPoint(point);
        } else if (target.id === `popup-delete-${point.id}`) {
          onDeletePoint(point.id);
        }
      });

      marker.bindPopup(popupContent, { maxWidth: 360 });

      marker.on('click', () => {
        onSelectPoint(point);
      });

      marker.addTo(markersGroup);

      // If this point is currently selected and NOT actively being edited, open popup
      if (point.id === selectedPointId && !isEditingThisPoint) {
        setTimeout(() => {
          marker.openPopup();
          map.panTo([point.lat, point.lng], { animate: true });
        }, 100);
      }
    });
  }, [points, selectedPointId, editingPointId, userRole, permissions]);

  // Handle User Location (Live GPS Marker)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userLocation) {
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full bg-blue-500 gps-pulse opacity-40"></div>
              <div class="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map);
        userMarkerRef.current.bindTooltip('Vị trí GPS của bạn', { direction: 'top' });

        if (userLocation.accuracy) {
          userCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
            radius: userLocation.accuracy,
            color: '#3b82f6',
            fillColor: '#60a5fa',
            fillOpacity: 0.15,
            weight: 1,
          }).addTo(map);
        }
      } else {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
        if (userCircleRef.current && userLocation.accuracy) {
          userCircleRef.current.setLatLng([userLocation.lat, userLocation.lng]);
          userCircleRef.current.setRadius(userLocation.accuracy);
        }
      }

      map.panTo([userLocation.lat, userLocation.lng], { animate: true });
    }
  }, [userLocation]);

  // Fit bounds helper
  const handleFitBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (currentRoute.bounds) {
      map.fitBounds(currentRoute.bounds, { padding: [30, 30] });
    } else {
      const allPoints = getAllPointsFromPolyline(currentRoute.polyline);
      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(false);

  return (
    <div className="relative w-full h-full min-h-[300px] sm:min-h-[450px] md:min-h-[550px] bg-slate-900 overflow-hidden flex-1">
      {/* Picking Location Banner Notification */}
      {isPickingLocation && (
        <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-950/95 text-white font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-2xl border border-emerald-400/80 flex items-center gap-2 animate-bounce text-xs sm:text-sm max-w-[90vw] text-center backdrop-blur-md">
          <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0 animate-pulse" />
          <span>Đang chọn tọa độ: Vui lòng nhấp lên vị trí bản đồ!</span>
        </div>
      )}

      {/* Leaflet DOM container */}
      <div 
        id="map-container" 
        ref={mapContainerRef} 
        className={`w-full h-full ${isPickingLocation ? 'cursor-crosshair' : ''}`}
        style={{ height: '100%', minHeight: '300px' }}
      />

      {/* Floating Map Controls Panel */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-10 flex flex-col gap-1.5 sm:gap-2 max-w-[calc(100vw-120px)] sm:max-w-none">
        {/* Layer switch: Google Hybrid, Google Streets, Esri Satellite */}
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/80 flex items-center gap-1 flex-wrap">
          <button
            id="btn-layer-google-hybrid"
            onClick={() => setTileLayer('google_hybrid')}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              mapType === 'google_hybrid'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Google Maps Vệ tinh kết hợp nhãn đường & địa danh"
          >
            🛰️ <span className="hidden xs:inline">Google </span>Vệ Tinh
          </button>
          <button
            id="btn-layer-google-streets"
            onClick={() => setTileLayer('google_streets')}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              mapType === 'google_streets'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Google Maps Giao thông đường bộ tiêu chuẩn"
          >
            🗺️ <span className="hidden xs:inline">Google </span>Đường Bộ
          </button>
          <button
            id="btn-layer-esri-sat"
            onClick={() => setTileLayer('esri_sat')}
            className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer hidden sm:block ${
              mapType === 'esri_sat'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Ảnh vệ tinh độ phân giải cao Esri"
          >
            🌐 Esri
          </button>

          {/* Toggle button on mobile for Route line & controls */}
          <button
            type="button"
            onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            className="sm:hidden px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 ml-auto cursor-pointer"
            title="Tùy chọn hiển thị nét vẽ và khóa vùng"
          >
            <SlidersHorizontal className="w-3 h-3 inline mr-0.5" />
            {isLayerPanelOpen ? 'Ẩn' : 'Lớp'}
          </button>
        </div>

        {/* Route Line & Controls Toggle (Visible by default on sm+, collapsible on mobile) */}
        <div className={`${isLayerPanelOpen ? 'flex' : 'hidden sm:flex'} bg-white/95 backdrop-blur-md p-2 rounded-xl shadow-md border border-slate-200/80 flex-col gap-1.5 text-xs max-w-xs`}>
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRedRoute}
              onChange={(e) => setShowRedRoute(e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <span 
                className="w-3 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: currentRoute.strokeStyle?.color || '#dc2626' }}
              />
              Nét vẽ tuyến ({currentRoute.type === 'river' ? 'Tuyến sông' : 'Tuyến phố'})
            </span>
          </label>

          {/* Point indicator in legend */}
          <div className="flex items-center gap-2 font-medium text-slate-700 select-none py-0.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0"></span>
            <span>Điểm quản lý trên tuyến ({points.length})</span>
          </div>

          {/* Bound Restriction View & Zoom lock indicator */}
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
              {isViewLocked ? <Lock className="w-3 h-3 text-emerald-600" /> : <Unlock className="w-3 h-3 text-slate-400" />}
              <span>Giới hạn View &amp; Zoom:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsViewLocked(!isViewLocked)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                isViewLocked
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title={isViewLocked ? 'Bấm để mở khóa di chuyển toàn quốc' : 'Bấm để khóa lại trong phạm vi tuyến'}
            >
              {isViewLocked ? 'Đang khóa' : 'Mở khóa'}
            </button>
          </div>

          {currentRoute.mapOverlay && (
            <div className="pt-1 border-t border-slate-100 flex flex-col gap-1">
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showImageOverlay}
                  onChange={(e) => setShowImageOverlay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Ảnh Google Map đã tải lên</span>
              </label>

              {showImageOverlay && (
                <div className="flex items-center gap-2 pl-5 text-[11px] text-slate-500">
                  <span>Độ mờ:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-16 accent-indigo-600"
                  />
                  <span>{Math.round(overlayOpacity * 100)}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Route Info Button (Click to view street/route details) */}
      {onOpenRouteInfo && (
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 flex items-center gap-2">
          <button
            id="btn-map-route-info"
            type="button"
            onClick={onOpenRouteInfo}
            title="Bấm để xem thông tin chi tiết tuyến phố và danh sách địa điểm"
            className="bg-white/95 hover:bg-white text-slate-800 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl shadow-md border border-slate-300 text-xs font-bold flex items-center gap-1.5 sm:gap-2 hover:border-indigo-400 hover:text-indigo-700 transition-all backdrop-blur-md cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            <span className="hidden xs:inline">Thông Tin Tuyến</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded-full">
              {points.length}<span className="hidden sm:inline"> điểm</span>
            </span>
          </button>
        </div>
      )}

      {/* Floating Action Buttons Bottom Left */}
      <div className="absolute bottom-4 sm:bottom-6 left-2 sm:left-4 z-10 flex items-center gap-1.5 sm:gap-2 flex-wrap max-w-[calc(100vw-80px)]">
        <button
          id="btn-fit-bounds"
          onClick={handleFitBounds}
          title="Thu phóng trọn vẹn khu vực tuyến đường"
          className="bg-white/95 hover:bg-white text-slate-700 hover:text-slate-900 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden xs:inline">Về Khung Nhìn Tuyến</span>
          <span className="xs:hidden">Về Tuyến</span>
        </button>

        {onOpenRouteInfo ? (
          <button
            id="btn-points-summary-badge"
            type="button"
            onClick={onOpenRouteInfo}
            title="Bấm để xem thông tin chi tiết tuyến và danh sách các điểm"
            className="bg-slate-900/90 hover:bg-slate-800 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-medium border border-slate-700 shadow-md flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all hover:border-indigo-400"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{points.length} điểm<span className="hidden sm:inline"> vị trí</span></span>
            <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400" />
          </button>
        ) : (
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-700 shadow-md hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{points.length} điểm vị trí trên tuyến</span>
          </div>
        )}
      </div>
    </div>
  );
};
