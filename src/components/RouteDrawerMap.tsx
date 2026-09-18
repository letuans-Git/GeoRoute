import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { 
  PenTool, 
  Hand, 
  Undo2, 
  Trash2, 
  Search, 
  Sparkles, 
  Layers, 
  Lock, 
  Unlock,
  Navigation, 
  Sliders, 
  Check, 
  CheckCircle2,
  Waypoints,
  Maximize,
  Compass,
  RotateCcw,
  Loader2,
  ShieldCheck,
  X
} from 'lucide-react';
import { 
  RouteStrokeStyle, 
  RoutePolyline, 
  RoutePoint, 
  RouteSegment, 
  getSegmentsFromPolyline,
  getAllPointsFromPolyline
} from '../types';

export interface RouteDrawerMapProps {
  initialCenter: [number, number];
  initialZoom: number;
  initialPolyline?: RoutePolyline;
  routeType: 'river' | 'street';
  strokeStyle: RouteStrokeStyle;
  onStrokeStyleChange: (style: RouteStrokeStyle) => void;
  onPolylineChange: (polyline: RoutePolyline) => void;
  onMapAreaCaptured: (data: {
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]];
  }) => void;
  restrictBounds: boolean;
  onToggleRestrictBounds: (restrict: boolean) => void;
  onPresetSelect?: (preset: { name: string; type: 'river' | 'street'; province: string; desc: string }) => void;
  isPreservingOriginalRoad?: boolean;
  onTogglePreserveRoad?: (preserve: boolean) => void;
}

// Vietnam realistic presets
const VIETNAM_SMART_PRESETS: {
  name: string;
  type: 'river' | 'street';
  province: string;
  center: [number, number];
  zoom: number;
  desc: string;
  polyline: [number, number][];
}[] = [
  {
    name: 'Tuyến Sông Cấm (Hải Phòng - Cảng Chùa Vẽ)',
    type: 'river',
    province: 'Hải Phòng',
    center: [20.8650, 106.7050],
    zoom: 14,
    desc: 'Hành lang luồng hàng hải sông Cấm kết nối các cụm cảng và bến bãi Hải Phòng.',
    polyline: [
      [20.8520, 106.6680],
      [20.8590, 106.6840],
      [20.8650, 106.7050],
      [20.8710, 106.7230],
      [20.8740, 106.7420],
    ],
  },
  {
    name: 'Tuyến Phố Lê Hồng Phong (Hải Phòng)',
    type: 'street',
    province: 'Hải Phòng',
    center: [20.8520, 106.6980],
    zoom: 15,
    desc: 'Trục đường giao thông đô thị và thương mại trung tâm thành phố Hải Phòng.',
    polyline: [
      [20.8610, 106.6850],
      [20.8550, 106.6940],
      [20.8490, 106.7030],
      [20.8420, 106.7120],
    ],
  },
  {
    name: 'Tuyến Sông Sài Gòn (Khu vực Cát Lái - Bạch Đằng)',
    type: 'river',
    province: 'TP. Hồ Chí Minh',
    center: [10.7712, 106.7455],
    zoom: 14,
    desc: 'Hành lang đường thủy kết nối Cảng Cát Lái, bán đảo Thủ Thiêm và Bến Bạch Đằng.',
    polyline: [
      [10.7485, 106.7725],
      [10.7550, 106.7580],
      [10.7630, 106.7480],
      [10.7720, 106.7350],
      [10.7830, 106.7190],
      [10.7950, 106.7110],
      [10.8060, 106.7120],
      [10.8170, 106.7210],
    ],
  },
  {
    name: 'Tuyến Sông Hồng (Khu vực Phà Đen - Cảng Khuyến Lương)',
    type: 'river',
    province: 'Hà Nội',
    center: [20.9750, 105.8850],
    zoom: 13,
    desc: 'Tuyến luồng vận tải sông Hồng với mật độ tập kết vật liệu xây dựng và cụm cảng than cát.',
    polyline: [
      [21.0050, 105.8750],
      [20.9900, 105.8780],
      [20.9750, 105.8860],
      [20.9580, 105.9010],
      [20.9450, 105.9180],
    ],
  },
  {
    name: 'Tuyến Phố Đi Bộ & Thương Mại Nguyễn Huệ',
    type: 'street',
    province: 'TP. Hồ Chí Minh',
    center: [10.7745, 106.7042],
    zoom: 17,
    desc: 'Tuyến phố đi bộ sầm uất với các thương hiệu dịch vụ, nhà hàng cao cấp quận 1.',
    polyline: [
      [10.7766, 106.7012],
      [10.7752, 106.7029],
      [10.7738, 106.7047],
      [10.7718, 106.7068],
    ],
  },
  {
    name: 'Tuyến Phố Tràng Tiền - Hàng Khay - Tràng Thi',
    type: 'street',
    province: 'Hà Nội',
    center: [21.0253, 105.8540],
    zoom: 17,
    desc: 'Tuyến phố cổ thương mại quanh Hồ Gươm trung tâm quận Hoàn Kiếm, Hà Nội.',
    polyline: [
      [21.0245, 105.8592],
      [21.0252, 105.8560],
      [21.0255, 105.8530],
      [21.0260, 105.8505],
      [21.0268, 105.8475],
    ],
  },
  {
    name: 'Tuyến Sông Hàn (Đà Nẵng)',
    type: 'river',
    province: 'Đà Nẵng',
    center: [16.0680, 108.2250],
    zoom: 15,
    desc: 'Dọc sông Hàn từ Cầu Thuận Phước qua Cầu Rồng đến Cầu Trần Thị Lý.',
    polyline: [
      [16.0880, 108.2230],
      [16.0780, 108.2260],
      [16.0680, 108.2250],
      [16.0560, 108.2220],
      [16.0460, 108.2190],
    ],
  },
  {
    name: 'Đại Lộ Võ Văn Kiệt (TP.HCM)',
    type: 'street',
    province: 'TP. Hồ Chí Minh',
    center: [10.7550, 106.6800],
    zoom: 15,
    desc: 'Đại lộ huyết mạch Đông Tây kết nối hầm Thủ Thiêm qua Quận 1, Quận 5 và Quận 6.',
    polyline: [
      [10.7680, 106.7040],
      [10.7610, 106.6930],
      [10.7540, 106.6790],
      [10.7480, 106.6650],
      [10.7420, 106.6500],
    ],
  },
];

const COLOR_PRESETS = [
  { name: 'Đỏ Cảnh Báo', hex: '#dc2626' },
  { name: 'Xanh Lam Đậm', hex: '#0284c7' },
  { name: 'Lục Bảo', hex: '#059669' },
  { name: 'Cam Nổi Bật', hex: '#ea580c' },
  { name: 'Tím Quản Lý', hex: '#7c3aed' },
  { name: 'Vàng Rực Rỡ', hex: '#eab308' },
];

const WEIGHT_PRESETS = [
  { label: 'Mảnh', value: 3 },
  { label: 'Vừa', value: 5 },
  { label: 'Dày', value: 8 },
  { label: 'Đặc Biệt', value: 12 },
];

export const RouteDrawerMap: React.FC<RouteDrawerMapProps> = ({
  initialCenter,
  initialZoom,
  initialPolyline = [],
  routeType,
  strokeStyle,
  onStrokeStyleChange,
  onPolylineChange,
  onMapAreaCaptured,
  restrictBounds,
  onToggleRestrictBounds,
  onPresetSelect,
  isPreservingOriginalRoad = false,
  onTogglePreserveRoad,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const glowLayerRef = useRef<L.Polyline | null>(null);
  const boundsBoxLayerRef = useRef<L.Rectangle | null>(null);
  const smartWaypointMarkersRef = useRef<L.Marker[]>([]);

  // Keep references to latest callbacks/props to avoid useEffect re-runs and flickering
  const onMapAreaCapturedRef = useRef(onMapAreaCaptured);
  onMapAreaCapturedRef.current = onMapAreaCaptured;
  const onPolylineChangeRef = useRef(onPolylineChange);
  onPolylineChangeRef.current = onPolylineChange;
  const restrictBoundsRef = useRef(restrictBounds);
  restrictBoundsRef.current = restrictBounds;
  const strokeStyleRef = useRef(strokeStyle);
  strokeStyleRef.current = strokeStyle;

  // Store initial polyline for undo / revert to original state
  const originalPolylineRef = useRef<RoutePolyline>(initialPolyline);
  useEffect(() => {
    if (getAllPointsFromPolyline(initialPolyline).length > 0 && getAllPointsFromPolyline(originalPolylineRef.current).length === 0) {
      originalPolylineRef.current = initialPolyline;
    }
  }, [initialPolyline]);
  const initialPointsCount = useMemo(() => {
    return getAllPointsFromPolyline(originalPolylineRef.current).length;
  }, [initialPolyline]);
  const hasOriginalPolyline = initialPointsCount > 0;

  // Multi-segment polyline state: list of completed segments
  const [segments, setSegments] = useState<RouteSegment[]>(() =>
    getSegmentsFromPolyline(initialPolyline)
  );
  // Current active draft segment being drawn (uncommitted points)
  const [currentDraftSegment, setCurrentDraftSegment] = useState<RoutePoint[]>([]);

  // Synchronize with parent's initialPolyline safely using JSON serialization comparison
  const lastKnownPolylineJsonRef = useRef<string>(JSON.stringify(initialPolyline));
  useEffect(() => {
    const currentJson = JSON.stringify(initialPolyline);
    if (currentJson !== lastKnownPolylineJsonRef.current) {
      lastKnownPolylineJsonRef.current = currentJson;
      setSegments(getSegmentsFromPolyline(initialPolyline));
      setCurrentDraftSegment([]);
    }
  }, [initialPolyline]);

  // Combined segments (completed segments + current draft)
  const allSegments: RouteSegment[] = useMemo(() => {
    if (currentDraftSegment.length > 0) {
      return [...segments, currentDraftSegment];
    }
    return segments;
  }, [segments, currentDraftSegment]);

  // Flattened points across all segments
  const allPoints: RoutePoint[] = useMemo(() => {
    return allSegments.flat();
  }, [allSegments]);

  // Drawing Tool: default to 'pan' (Xem & Di chuyển) if editing an existing route with drawn polyline,
  // or 'manual_draw' (Bút vẽ) if creating a new route without polyline
  const [drawingTool, setDrawingTool] = useState<'smart_routing' | 'manual_draw' | 'pan'>(() => {
    const initPoints = getAllPointsFromPolyline(initialPolyline);
    return initPoints.length > 0 ? 'pan' : 'manual_draw';
  });
  const [smartStartPoint, setSmartStartPoint] = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingStatusMessage, setRoutingStatusMessage] = useState<string>(() => {
    const initPoints = getAllPointsFromPolyline(initialPolyline);
    return initPoints.length > 0
      ? `✓ Giữ nguyên nét vẽ cũ của tuyến (${initPoints.length} điểm). Phóng to/xem hoặc chọn Bút vẽ nếu muốn vẽ thêm.`
      : '';
  });

  // Dropdowns and compact popovers
  const [showPresets, setShowPresets] = useState<boolean>(false);
  const [showStrokePopover, setShowStrokePopover] = useState<boolean>(false);
  const [showLayerPopover, setShowLayerPopover] = useState<boolean>(false);
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [activeTileType, setActiveTileType] = useState<'google_hybrid' | 'google_streets' | 'esri_sat'>('google_hybrid');

  // Interactive freehand & guideline layers
  const guideLineLayerRef = useRef<L.Polyline | null>(null);
  const isMouseDownRef = useRef<boolean>(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedDuringMouseRef = useRef<boolean>(false);
  const lastSampledCoordRef = useRef<[number, number] | null>(null);

  // Notify parent of polyline change without causing circular wipes
  useEffect(() => {
    let payload: RoutePolyline;
    if (allSegments.length === 0) {
      payload = [];
    } else if (allSegments.length === 1) {
      payload = allSegments[0];
    } else {
      payload = allSegments;
    }

    const payloadJson = JSON.stringify(payload);
    // Mark this payload as already known so when parent updates its state and passes it back, we don't wipe currentDraftSegment!
    lastKnownPolylineJsonRef.current = payloadJson;
    onPolylineChangeRef.current(payload);
  }, [allSegments]);

  // Capture Current View Bounds & Center without triggering re-render cascades
  const captureCurrentBoundsAndCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();

    const southWest: [number, number] = [bounds.getSouth(), bounds.getWest()];
    const northEast: [number, number] = [bounds.getNorth(), bounds.getEast()];

    onMapAreaCapturedRef.current({
      center: [center.lat, center.lng],
      zoom,
      bounds: [southWest, northEast],
    });

    // Update boundary visualization box if restricted
    if (boundsBoxLayerRef.current) {
      map.removeLayer(boundsBoxLayerRef.current);
      boundsBoxLayerRef.current = null;
    }
    if (restrictBoundsRef.current) {
      boundsBoxLayerRef.current = L.rectangle(bounds, {
        color: strokeStyleRef.current.color,
        weight: 2,
        fill: true,
        fillColor: strokeStyleRef.current.color,
        fillOpacity: 0.05,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, []);

  // Update boundary box when restrictBounds or stroke color changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (boundsBoxLayerRef.current) {
      map.removeLayer(boundsBoxLayerRef.current);
      boundsBoxLayerRef.current = null;
    }
    if (restrictBounds) {
      boundsBoxLayerRef.current = L.rectangle(map.getBounds(), {
        color: strokeStyle.color,
        weight: 2,
        fill: true,
        fillColor: strokeStyle.color,
        fillOpacity: 0.05,
        dashArray: '6, 6',
      }).addTo(map);
    }
  }, [mapReady, restrictBounds, strokeStyle.color]);

  // Switch Tile Layer
  const setTileLayer = useCallback((type: 'google_hybrid' | 'google_streets' | 'esri_sat') => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let newLayer: L.TileLayer;
    if (type === 'google_hybrid') {
      newLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      });
    } else if (type === 'google_streets') {
      newLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
      });
    } else {
      newLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: '&copy; Esri',
        }
      );
    }

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    setActiveTileType(type);
  }, []);

  // Initialize Leaflet Map ONCE on mount (prevents map tearing down and flickering)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Google Hybrid default
    const hybridTile = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '&copy; Google Maps',
    }).addTo(map);

    tileLayerRef.current = hybridTile;
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    // Listen to map moveend to capture area
    map.on('moveend', () => {
      captureCurrentBoundsAndCenter();
    });

    // Handle container resizing automatically
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    setTimeout(() => {
      map.invalidateSize();
      captureCurrentBoundsAndCenter();

      // Tự động căn trọn nét vẽ của tuyến đang sửa vào chính giữa màn hình để người dùng nhìn thấy rõ nét vẽ cũ
      const initialPts = getAllPointsFromPolyline(initialPolyline);
      if (initialPts.length >= 2) {
        try {
          const b = L.latLngBounds(initialPts);
          map.fitBounds(b.pad(0.18), { maxZoom: 16 });
        } catch (e) {
          // ignore
        }
      }
    }, 150);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update cursor and dragging mode based on active tool without re-rendering or wiping container classes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const container = map.getContainer();
    if (!container) return;

    if (drawingTool === 'pan') {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      container.style.cursor = 'grab';
      map.invalidateSize();
    } else {
      // In drawing modes (manual_draw or smart_routing), disable map drag and double-click zoom
      // so left-click and mouse gestures draw smooth lines instead of panning or zooming the map!
      map.dragging.disable();
      map.doubleClickZoom.disable();
      container.style.cursor = 'crosshair';
    }
  }, [mapReady, drawingTool]);

  // Re-render Polyline and Waypoint Markers in-place for allSegments (supports multi-segment disconnected lines)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (polylineLayerRef.current) map.removeLayer(polylineLayerRef.current);
    if (glowLayerRef.current) map.removeLayer(glowLayerRef.current);
    if (markersLayerGroupRef.current) markersLayerGroupRef.current.clearLayers();

    if (allSegments.length > 0) {
      // Leaflet requires at least 2 points per segment to render a polyline path without errors
      const validSegmentsForLine = allSegments.filter((seg) => seg && seg.length >= 2);

      if (validSegmentsForLine.length > 0) {
        if (strokeStyle.hasGlow) {
          glowLayerRef.current = L.polyline(validSegmentsForLine, {
            color: strokeStyle.color,
            weight: strokeStyle.weight * 2.2,
            opacity: (strokeStyle.opacity ?? 0.9) * 0.35,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }

        polylineLayerRef.current = L.polyline(validSegmentsForLine, {
          color: strokeStyle.color,
          weight: strokeStyle.weight,
          dashArray: strokeStyle.dashArray || undefined,
          opacity: strokeStyle.opacity ?? 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      // Render Start, End, and intermediary nodes for each segment
      allSegments.forEach((seg, segIdx) => {
        if (!seg || seg.length === 0) return;

        seg.forEach((pt, ptIdx) => {
          const isStart = ptIdx === 0;
          const isEnd = ptIdx === seg.length - 1 && seg.length > 1;
          const isIntermediary = !isStart && !isEnd;

          if (isIntermediary && seg.length > 25 && ptIdx % 4 !== 0) return;

          const dotColor = isStart ? '#10b981' : isEnd ? '#ef4444' : strokeStyle.color;
          const label = allSegments.length === 1
            ? (isStart ? 'A' : isEnd ? 'B' : `${ptIdx + 1}`)
            : (isStart ? `A${segIdx + 1}` : isEnd ? `B${segIdx + 1}` : `${ptIdx + 1}`);

          const icon = L.divIcon({
            className: 'route-drawer-node',
            html: `
              <div style="background-color: ${dotColor}; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.5);" class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition-transform hover:scale-125">
                ${label}
              </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });

          // Markers are only draggable when in Pan mode to avoid conflicting with pen drawing clicks
          const marker = L.marker(pt, {
            icon,
            draggable: drawingTool === 'pan',
          });

          if (drawingTool === 'pan') {
            marker.on('dragend', (e) => {
              const newLatLng = (e.target as L.Marker).getLatLng();
              const newPoint: RoutePoint = [newLatLng.lat, newLatLng.lng];

              if (segIdx < segments.length) {
                setSegments((prev) => {
                  const next = [...prev];
                  const updatedSeg = [...next[segIdx]];
                  updatedSeg[ptIdx] = newPoint;
                  next[segIdx] = updatedSeg;
                  return next;
                });
              } else {
                setCurrentDraftSegment((prev) => {
                  const next = [...prev];
                  next[ptIdx] = newPoint;
                  return next;
                });
              }
            });
          }

          const segPrefix = allSegments.length > 1 ? `Đoạn #${segIdx + 1}: ` : '';
          marker.bindTooltip(
            `${segPrefix}${isStart ? 'Điểm bắt đầu' : isEnd ? 'Điểm kết thúc' : `Điểm chốt #${ptIdx + 1}`}`,
            { direction: 'top', offset: [0, -10] }
          );

          if (markersLayerGroupRef.current) {
            markersLayerGroupRef.current.addLayer(marker);
          }
        });
      });
    }
  }, [mapReady, allSegments, strokeStyle, segments.length, drawingTool]);

  // SMART AUTO ROUTING (OSRM for streets, natural spline for rivers)
  const calculateSmartRouteBetweenPoints = async (
    start: [number, number],
    end: [number, number],
    type: 'river' | 'street'
  ) => {
    setIsRouting(true);
    setRoutingStatusMessage(
      type === 'street'
        ? 'Đang tính toán tuyến đường bám theo đường bộ...'
        : 'Đang uốn cong tự nhiên theo luồng sông...'
    );

    try {
      if (type === 'street') {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords: RouteSegment = data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            );
            // Append as a new completed segment
            setSegments((prev) => [...prev, coords]);
            setRoutingStatusMessage(`✓ Đã nối tuyến thông minh (${(data.routes[0].distance / 1000).toFixed(2)} km). Nhấn Enter / Kết thúc để dừng vẽ.`);
            setIsRouting(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('OSRM routing fallback to natural spline:', err);
    }

    // Natural curved spline interpolation (Ideal for rivers or offline street fallback)
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    const deltaLat = end[0] - start[0];
    const deltaLng = end[1] - start[1];

    const curveOffset = 0.22;
    const ctrl1: [number, number] = [
      start[0] + deltaLat * 0.33 - deltaLng * curveOffset,
      start[1] + deltaLng * 0.33 + deltaLat * curveOffset,
    ];
    const ctrl2: [number, number] = [
      start[0] + deltaLat * 0.67 + deltaLng * (curveOffset * 0.7),
      start[1] + deltaLng * 0.67 - deltaLat * (curveOffset * 0.7),
    ];

    const interpolated: RouteSegment = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t1 = 1 - t;
      const lat =
        t1 * t1 * t1 * start[0] +
        3 * t1 * t1 * t * ctrl1[0] +
        3 * t1 * t * t * ctrl2[0] +
        t * t * t * end[0];
      const lng =
        t1 * t1 * t1 * start[1] +
        3 * t1 * t1 * t * ctrl1[1] +
        3 * t1 * t * t * ctrl2[1] +
        t * t * t * end[1];
      interpolated.push([lat, lng]);
    }

    setSegments((prev) => [...prev, interpolated]);
    setRoutingStatusMessage('✓ Đã nối tuyến mượt mà 2 điểm A & B. Nhấn Enter / Kết thúc để dừng vẽ.');
    setIsRouting(false);
  };

  // Dừng lệnh vẽ: Kết thúc đoạn vẽ hiện tại và ngắt nét để đường sau không bị nối
  const handleFinishDrawing = useCallback(() => {
    // Clean interactive guideline
    if (guideLineLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(guideLineLayerRef.current);
      guideLineLayerRef.current = null;
    }

    let committedNewSegment = false;
    let newSegmentsCount = segments.length;

    if (currentDraftSegment.length > 0) {
      setSegments((prev) => [...prev, currentDraftSegment]);
      newSegmentsCount += 1;
      setCurrentDraftSegment([]);
      committedNewSegment = true;
    }

    if (smartStartPoint) {
      setSmartStartPoint(null);
    }

    // Dừng lệnh vẽ -> chuyển sang chế độ di chuyển bản đồ (pan)
    setDrawingTool('pan');

    if (committedNewSegment) {
      setRoutingStatusMessage(
        `✓ Đã dừng lệnh vẽ & ngắt đoạn (Hiện có ${newSegmentsCount} đoạn rời). Tuyến sau sẽ không bị nối.`
      );
    } else {
      setRoutingStatusMessage(
        `✓ Đã dừng lệnh vẽ. Bản đồ chuyển sang chế độ di chuyển (Pan).`
      );
    }
  }, [currentDraftSegment, segments.length, smartStartPoint]);

  // Global Keyboard Listener: Nhấn Enter để kết thúc lệnh vẽ và ngắt đoạn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleFinishDrawing();
      } else if (e.key === 'Escape') {
        if (drawingTool !== 'pan') {
          handleFinishDrawing();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleFinishDrawing, drawingTool]);

  // Clean smart waypoint markers when starting/clearing
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    smartWaypointMarkersRef.current.forEach((m) => map.removeLayer(m));
    smartWaypointMarkersRef.current = [];

    if (smartStartPoint) {
      const icon = L.divIcon({
        className: 'smart-a-pin',
        html: `
          <div class="relative flex items-center justify-center">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-75"></span>
            <div class="w-7 h-7 rounded-full bg-emerald-600 border-2 border-white text-white text-xs font-black flex items-center justify-center shadow-lg">
              A
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker(smartStartPoint, { icon }).addTo(map);
      marker.bindTooltip('Điểm bắt đầu (A) - Click điểm tiếp theo để nối tuyến', {
        permanent: true,
        direction: 'top',
        offset: [0, -14],
      });
      smartWaypointMarkersRef.current.push(marker);
    }
  }, [smartStartPoint]);

  // Standard Pen Drawing (Bút vẽ theo chuẩn): Supports click-to-point, freehand drag, live preview guideline
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clearGuideline = () => {
      if (guideLineLayerRef.current) {
        map.removeLayer(guideLineLayerRef.current);
        guideLineLayerRef.current = null;
      }
    };

    const handleMouseDown = (e: L.LeafletMouseEvent) => {
      // Respond strictly to left mouse click
      if (e.originalEvent.button !== 0) return;

      if (drawingTool === 'manual_draw') {
        isMouseDownRef.current = true;
        mouseDownPosRef.current = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };
        hasMovedDuringMouseRef.current = false;
        lastSampledCoordRef.current = [e.latlng.lat, e.latlng.lng];
      }
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const currentPt: [number, number] = [e.latlng.lat, e.latlng.lng];

      if (drawingTool === 'manual_draw') {
        // 1. Freehand drawing mode: when holding down mouse and dragging
        if (isMouseDownRef.current && mouseDownPosRef.current) {
          const dx = e.originalEvent.clientX - mouseDownPosRef.current.x;
          const dy = e.originalEvent.clientY - mouseDownPosRef.current.y;
          if (Math.hypot(dx, dy) > 6) {
            hasMovedDuringMouseRef.current = true;
            clearGuideline();

            const distMeters = lastSampledCoordRef.current
              ? L.latLng(lastSampledCoordRef.current).distanceTo(e.latlng)
              : 999;

            // Sample points at smooth 4-meter intervals
            if (distMeters >= 4) {
              lastSampledCoordRef.current = currentPt;
              setCurrentDraftSegment((prev) => [...prev, currentPt]);
            }
          }
        } else {
          // 2. Click-by-click mode: live rubber-band guideline from last placed point to current cursor
          if (currentDraftSegment.length > 0) {
            const lastPt = currentDraftSegment[currentDraftSegment.length - 1];
            if (!guideLineLayerRef.current) {
              guideLineLayerRef.current = L.polyline([lastPt, currentPt], {
                color: strokeStyle.color,
                weight: 2,
                dashArray: '4, 6',
                opacity: 0.8,
              }).addTo(map);
            } else {
              guideLineLayerRef.current.setLatLngs([lastPt, currentPt]);
            }
          } else {
            clearGuideline();
          }
        }
      } else if (drawingTool === 'smart_routing') {
        if (smartStartPoint) {
          if (!guideLineLayerRef.current) {
            guideLineLayerRef.current = L.polyline([smartStartPoint, currentPt], {
              color: '#10b981',
              weight: 2,
              dashArray: '5, 5',
              opacity: 0.85,
            }).addTo(map);
          } else {
            guideLineLayerRef.current.setLatLngs([smartStartPoint, currentPt]);
          }
        } else {
          clearGuideline();
        }
      } else {
        clearGuideline();
      }
    };

    const handleMouseUp = (e: L.LeafletMouseEvent) => {
      if (drawingTool === 'manual_draw' && isMouseDownRef.current) {
        if (hasMovedDuringMouseRef.current) {
          const currentPt: [number, number] = [e.latlng.lat, e.latlng.lng];
          setCurrentDraftSegment((prev) => [...prev, currentPt]);
          setRoutingStatusMessage(`Đang vẽ đoạn #${segments.length + 1}. Nhấn Enter hoặc nút Kết thúc để ngắt đoạn.`);
        }
        isMouseDownRef.current = false;
      }
    };

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const clickCoords: [number, number] = [e.latlng.lat, e.latlng.lng];

      if (drawingTool === 'smart_routing') {
        clearGuideline();
        if (!smartStartPoint) {
          setSmartStartPoint(clickCoords);
          setRoutingStatusMessage('Đã chọn Điểm A. Hãy nhấp tiếp Điểm B trên bản đồ!');
        } else {
          const startPt = smartStartPoint;
          setSmartStartPoint(null);
          calculateSmartRouteBetweenPoints(startPt, clickCoords, routeType);
        }
      } else if (drawingTool === 'manual_draw') {
        // If it was already processed as a freehand drag, avoid adding duplicate point
        if (hasMovedDuringMouseRef.current) {
          hasMovedDuringMouseRef.current = false;
          return;
        }

        setCurrentDraftSegment((prev) => [...prev, clickCoords]);
        setRoutingStatusMessage(`Đang vẽ đoạn #${segments.length + 1}. Nhấn Enter hoặc nút Kết thúc để ngắt đoạn.`);
      }
    };

    const handleDoubleClick = (e: L.LeafletMouseEvent) => {
      if (drawingTool === 'manual_draw') {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
        clearGuideline();
        handleFinishDrawing();
      }
    };

    const handleMouseOut = () => {
      clearGuideline();
    };

    map.on('mousedown', handleMouseDown);
    map.on('mousemove', handleMouseMove);
    map.on('mouseup', handleMouseUp);
    map.on('click', handleMapClick);
    map.on('dblclick', handleDoubleClick);
    map.on('mouseout', handleMouseOut);

    return () => {
      map.off('mousedown', handleMouseDown);
      map.off('mousemove', handleMouseMove);
      map.off('mouseup', handleMouseUp);
      map.off('click', handleMapClick);
      map.off('dblclick', handleDoubleClick);
      map.off('mouseout', handleMouseOut);
      clearGuideline();
    };
  }, [
    drawingTool,
    smartStartPoint,
    routeType,
    segments.length,
    currentDraftSegment,
    strokeStyle.color,
    handleFinishDrawing,
  ]);

  // Undo point
  const handleUndo = () => {
    if (guideLineLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(guideLineLayerRef.current);
      guideLineLayerRef.current = null;
    }
    if (smartStartPoint) {
      setSmartStartPoint(null);
      setRoutingStatusMessage('');
      return;
    }
    // 1. If currently drawing a draft segment, undo point in draft
    if (currentDraftSegment.length > 0) {
      setCurrentDraftSegment((prev) => prev.slice(0, -1));
      return;
    }
    // 2. If no active draft, undo last point in the last completed segment
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      if (lastSeg.length > 1) {
        setSegments((prev) => {
          const next = [...prev];
          next[next.length - 1] = lastSeg.slice(0, -1);
          return next;
        });
      } else {
        setSegments((prev) => prev.slice(0, -1));
      }
    }
  };

  // Clear all points action (no window.confirm which is blocked in iframes)
  const executeClearAll = useCallback(() => {
    setShowClearConfirm(false);

    // 1. Reset all route point states
    setSegments([]);
    setCurrentDraftSegment([]);
    setSmartStartPoint(null);

    // 2. Remove all layers immediately from Leaflet map
    if (guideLineLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(guideLineLayerRef.current);
      guideLineLayerRef.current = null;
    }
    if (polylineLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }
    if (glowLayerRef.current && mapRef.current) {
      mapRef.current.removeLayer(glowLayerRef.current);
      glowLayerRef.current = null;
    }
    if (markersLayerGroupRef.current) {
      markersLayerGroupRef.current.clearLayers();
    }
    if (mapRef.current) {
      smartWaypointMarkersRef.current.forEach((m) => {
        try {
          mapRef.current?.removeLayer(m);
        } catch (e) {
          // ignore
        }
      });
      smartWaypointMarkersRef.current = [];
    }

    // 3. Update last known JSON & notify parent RouteModal immediately
    lastKnownPolylineJsonRef.current = JSON.stringify([]);
    onPolylineChangeRef.current([]);

    // 4. If parent modal was locking original road, turn off lock so user can draw freely
    if (onTogglePreserveRoad) {
      onTogglePreserveRoad(false);
    }

    // 5. Automatically activate manual draw tool so user can start drawing fresh line
    setDrawingTool('manual_draw');
    setRoutingStatusMessage('✓ Đã xóa toàn bộ điểm. Bút vẽ đã sẵn sàng để vẽ lại tuyến mới.');
  }, [onTogglePreserveRoad]);

  // Click handler for Clear button: opens in-UI confirmation popover or clears draft
  const handleClearClick = () => {
    // Close other popovers
    setShowStrokePopover(false);
    setShowLayerPopover(false);
    setShowPresets(false);
    setShowSearchInput(false);

    // If only a few draft points and no saved segments, clear directly without confirmation
    if (segments.length === 0 && currentDraftSegment.length <= 2) {
      executeClearAll();
      return;
    }

    // Toggle in-UI confirmation popover
    setShowClearConfirm((prev) => !prev);
  };

  // Revert to original route polyline
  const handleRevertOriginal = () => {
    const orig = originalPolylineRef.current;
    if (!orig || (Array.isArray(orig) && orig.length === 0)) return;
    setSegments(getSegmentsFromPolyline(orig));
    setCurrentDraftSegment([]);
    setSmartStartPoint(null);
    setRoutingStatusMessage('✓ Đã khôi phục lại nguyên vẹn nét vẽ ban đầu của tuyến.');
    const pts = getAllPointsFromPolyline(orig);
    if (pts.length >= 2 && mapRef.current) {
      try {
        mapRef.current.fitBounds(L.latLngBounds(pts).pad(0.18));
      } catch (e) {
        // ignore
      }
    }
  };

  // Select preset
  const handleSelectSmartPreset = (preset: (typeof VIETNAM_SMART_PRESETS)[0]) => {
    setSegments([preset.polyline]);
    setCurrentDraftSegment([]);
    setDrawingTool('pan');
    setShowPresets(false);

    if (mapRef.current) {
      mapRef.current.flyTo(preset.center, preset.zoom, { duration: 1 });
    }

    if (onPresetSelect) {
      onPresetSelect({
        name: preset.name,
        type: preset.type,
        province: preset.province,
        desc: preset.desc,
      });
    }
  };

  // Geocode search
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    const matchedPreset = VIETNAM_SMART_PRESETS.find((p) =>
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    if (matchedPreset) {
      handleSelectSmartPreset(matchedPreset);
      setShowSearchInput(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim() + ', Vietnam'
        )}&countrycodes=vn&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        mapRef.current.flyTo([lat, lon], 15, { duration: 1.2 });
        setShowSearchInput(false);
      }
    } catch (err) {
      console.error('Location search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Fit to current polyline
  const handleFitToPolyline = () => {
    if (!mapRef.current || allPoints.length === 0) return;
    const lats = allPoints.map((p) => p[0]);
    const lngs = allPoints.map((p) => p[1]);
    const bounds: L.LatLngBoundsExpression = [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  const calculateDistanceKm = () => {
    let totalMeters = 0;
    allSegments.forEach((seg) => {
      if (seg.length >= 2) {
        for (let i = 0; i < seg.length - 1; i++) {
          totalMeters += L.latLng(seg[i]).distanceTo(L.latLng(seg[i + 1]));
        }
      }
    });
    return (totalMeters / 1000).toFixed(2);
  };

  return (
    <div className="w-full h-full relative bg-slate-900 overflow-hidden select-none">
      {/* Interactive Map Canvas - Occupies 100% of container */}
      <div
        ref={containerRef}
        id="route-drawer-leaflet-canvas"
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Road Preservation Status Banner */}
      {isPreservingOriginalRoad && (
        <div 
          id="badge-preserving-road"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-950/95 backdrop-blur-md text-emerald-100 border border-emerald-500/50 shadow-2xl px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs select-none animate-in fade-in duration-200"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold whitespace-nowrap">Đang bảo lưu thành phần con đường gốc ({allPoints.length} điểm)</span>
          {onTogglePreserveRoad && (
            <button
              type="button"
              id="btn-switch-to-redraw"
              onClick={() => {
                onTogglePreserveRoad(false);
                setDrawingTool('manual_draw');
              }}
              className="ml-1 text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer whitespace-nowrap"
            >
              Vẽ lại đường
            </button>
          )}
        </div>
      )}

      {/* TOP FLOATING ULTRA-COMPACT TOOLBAR (DOCK STYLE) - ICONS ONLY + HOVER POPUP */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-1.5 flex-wrap">
        {/* Main Dock Container */}
        <div className="bg-slate-950/95 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-700/80 shadow-2xl flex items-center gap-1">
          {/* 1. Bút Vẽ Tuyến Đường (Manual Draw) - CHUẨN CÔNG CỤ VẼ ĐẦU TIÊN */}
          <div className="relative group">
            <button
              id="btn-tool-manual-draw"
              type="button"
              onClick={() => {
                if (isPreservingOriginalRoad && onTogglePreserveRoad) {
                  onTogglePreserveRoad(false);
                }
                setDrawingTool('manual_draw');
                setSmartStartPoint(null);
                setRoutingStatusMessage('');
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                drawingTool === 'manual_draw'
                  ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span>Bút Vẽ Tuyến (Chuẩn Bản Đồ)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                • <strong>Chấm điểm:</strong> Nhấp chuột trên bản đồ để đặt các điểm chốt.<br/>
                • <strong>Vẽ tự do:</strong> Nhấn giữ chuột và rê để vẽ đường cong liên tục.<br/>
                • <strong>Ngắt đoạn:</strong> Nhấn <em>Enter</em> hoặc <em>Kết thúc</em> để dừng đoạn hiện tại.
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
                {drawingTool === 'manual_draw' ? '● Đang kích hoạt (Mặc định)' : 'Bấm để kích hoạt'}
              </div>
            </div>
          </div>

          {/* 2. Nối 2 Điểm Thông Minh (A - B) */}
          <div className="relative group">
            <button
              id="btn-tool-smart-routing"
              type="button"
              onClick={() => {
                if (isPreservingOriginalRoad && onTogglePreserveRoad) {
                  onTogglePreserveRoad(false);
                }
                setDrawingTool('smart_routing');
                setSmartStartPoint(null);
                setRoutingStatusMessage('Nhấp Điểm Đầu (A) trên bản đồ!');
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                drawingTool === 'smart_routing'
                  ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Waypoints className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                <Waypoints className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nối 2 Điểm Thông Minh (A - B)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nhấp 2 điểm trên bản đồ: Hệ thống sẽ tự động uốn lượn bám theo luồng sông hoặc men theo mạng lưới đường bộ thực tế.
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
                {drawingTool === 'smart_routing' ? '● Đang kích hoạt' : 'Bấm để kích hoạt'}
              </div>
            </div>
          </div>

          {/* 3. Kéo Di Chuyển Bản Đồ (Pan) */}
          <div className="relative group">
            <button
              id="btn-tool-pan"
              type="button"
              onClick={() => {
                setDrawingTool('pan');
                setSmartStartPoint(null);
                setRoutingStatusMessage('');
                mapRef.current?.invalidateSize();
              }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                drawingTool === 'pan'
                  ? 'bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-60 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                <Hand className="w-3.5 h-3.5 text-indigo-400" />
                <span>Kéo Di Chuyển Bản Đồ</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Kéo chuột để di chuyển góc nhìn bản đồ tự do mà không chấm thêm điểm nào.
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
                {drawingTool === 'pan' ? '● Đang kích hoạt' : 'Bấm để kích hoạt'}
              </div>
            </div>
          </div>

          {/* NÚT KẾT THÚC / DỪNG LỆNH VẼ [Enter] */}
          <div className="relative group">
            <button
              id="btn-tool-finish-draw"
              type="button"
              onClick={handleFinishDrawing}
              disabled={currentDraftSegment.length === 0 && !smartStartPoint && drawingTool === 'pan'}
              className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                currentDraftSegment.length > 0 || smartStartPoint || drawingTool !== 'pan'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Kết thúc</span>
              <kbd className="hidden sm:inline-block px-1 py-0.2 text-[9px] font-mono bg-black/40 text-emerald-200 rounded border border-emerald-400/40">
                Enter
              </kbd>
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-0 mt-2 w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dừng Lệnh Vẽ & Ngắt Tuyến (Phím Enter)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Nhấn nút này hoặc nhấn phím <strong>Enter</strong> để dừng lệnh vẽ. Đường vẽ sau sẽ không bị nối với đường trước, cho phép bạn vẽ nhiều tuyến rời nhau.
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-emerald-400 font-mono">
                {currentDraftSegment.length > 0 || drawingTool !== 'pan'
                  ? '● Đang vẽ - Nhấn Enter để kết thúc ngắt đoạn'
                  : 'Bấm nút hoặc gõ phím Enter'}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* 4. Undo */}
          <div className="relative group">
            <button
              id="btn-tool-undo"
              type="button"
              disabled={allPoints.length === 0 && !smartStartPoint}
              onClick={handleUndo}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Hoàn Tác (Undo)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Xóa điểm chốt vừa chấm gần nhất khỏi tuyến vẽ.
              </p>
            </div>
          </div>

          {/* 5. Fit Bounds */}
          <div className="relative group">
            <button
              id="btn-tool-fit"
              type="button"
              disabled={allPoints.length === 0}
              onClick={handleFitToPolyline}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                <Maximize className="w-3.5 h-3.5 text-indigo-400" />
                <span>Căn Giữa Tuyến (Fit View)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Tự động phóng to và căn trọn toàn bộ tuyến đường vừa vẽ vào chính giữa màn hình.
              </p>
            </div>
          </div>

          {/* 6. Clear */}
          <div className="relative group">
            <button
              id="btn-tool-clear"
              type="button"
              disabled={allPoints.length === 0 && !smartStartPoint}
              onClick={handleClearClick}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                showClearConfirm 
                  ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-400' 
                  : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {/* Hover Popup when not confirming */}
            {!showClearConfirm && (
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                <div className="flex items-center gap-1.5 font-bold text-rose-400 text-xs mb-1">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Xóa Toàn Bộ Điểm</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Xóa sạch các điểm đã vẽ để vẽ lại từ đầu.
                </p>
              </div>
            )}

            {/* In-UI Confirmation Popover */}
            {showClearConfirm && (
              <div 
                id="popover-confirm-clear"
                className="absolute top-full left-0 mt-2 w-64 bg-slate-950/98 backdrop-blur-md border border-rose-500/60 rounded-xl shadow-2xl p-3 z-[1002] space-y-2 animate-in fade-in zoom-in-95 duration-150 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Xóa toàn bộ điểm vẽ?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Hành động này sẽ xóa sạch toàn bộ <strong>{allPoints.length}</strong> điểm chốt trên bản đồ để bạn vẽ lại từ đầu.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-clear-execute"
                    onClick={executeClearAll}
                    className="px-3 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-md transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa sạch</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 6.1. Revert to Original Polyline (Khi sửa tuyến có nét vẽ cũ) */}
          {hasOriginalPolyline && (
            <div className="relative group">
              <button
                id="btn-tool-revert-original"
                type="button"
                onClick={handleRevertOriginal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Khôi phục lại đúng nét vẽ gốc ban đầu của tuyến"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              {/* Hover Popup */}
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-60 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 text-xs mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Khôi Phục Nét Gốc Ban Đầu</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Lấy lại nguyên vẹn nét vẽ cũ của tuyến trước khi bắt đầu chỉnh sửa (giữ nguyên không đổi).
                </p>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* 7. Nét Vẽ Tuyến (Màu sắc & Độ dày) Popover */}
          <div className="relative">
            <div className="relative group">
              <button
                id="btn-tool-stroke"
                type="button"
                onClick={() => {
                  setShowStrokePopover(!showStrokePopover);
                  setShowLayerPopover(false);
                  setShowPresets(false);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showStrokePopover ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div 
                  className="w-4 h-4 rounded-full border border-white/80 shadow-xs flex items-center justify-center"
                  style={{ backgroundColor: strokeStyle.color }}
                >
                  <Sliders className="w-2.5 h-2.5 text-white mix-blend-difference" />
                </div>
              </button>
              {/* Hover Popup */}
              {!showStrokePopover && (
                <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tùy Chỉnh Nét Vẽ</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Bấm để chọn màu sắc hiển thị và độ dày nét vẽ trên bản đồ.
                  </p>
                </div>
              )}
            </div>

            {/* Stroke Popover Content */}
            {showStrokePopover && (
              <div className="absolute left-0 mt-2 w-64 bg-slate-950/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-3 z-[1002] space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Màu sắc &amp; Độ dày nét
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStrokePopover(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Color swatches */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Bảng màu:</label>
                  <div className="flex items-center gap-1.5">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onStrokeStyleChange({ ...strokeStyle, color: c.hex })}
                        style={{ backgroundColor: c.hex }}
                        className={`w-6 h-6 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                          strokeStyle.color === c.hex
                            ? 'border-white scale-110 shadow-md ring-2 ring-indigo-400'
                            : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        title={c.name}
                      >
                        {strokeStyle.color === c.hex && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                    <input
                      type="color"
                      value={strokeStyle.color}
                      onChange={(e) => onStrokeStyleChange({ ...strokeStyle, color: e.target.value })}
                      className="w-6 h-6 rounded-full cursor-pointer bg-transparent border-0 p-0"
                      title="Màu tùy chọn"
                    />
                  </div>
                </div>

                {/* Thickness chips */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Độ dày đường nét:</label>
                  <div className="grid grid-cols-4 gap-1">
                    {WEIGHT_PRESETS.map((w) => (
                      <button
                        key={w.value}
                        type="button"
                        onClick={() => onStrokeStyleChange({ ...strokeStyle, weight: w.value })}
                        className={`py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                          strokeStyle.weight === w.value
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 8. Lớp Bản Đồ Nền (Tile Layers) */}
          <div className="relative">
            <div className="relative group">
              <button
                id="btn-tool-layers"
                type="button"
                onClick={() => {
                  setShowLayerPopover(!showLayerPopover);
                  setShowStrokePopover(false);
                  setShowPresets(false);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showLayerPopover ? 'bg-indigo-600 text-white' : 'text-sky-400 hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
              {/* Hover Popup */}
              {!showLayerPopover && (
                <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                  <div className="flex items-center gap-1.5 font-bold text-sky-300 text-xs mb-1">
                    <Layers className="w-3.5 h-3.5 text-sky-400" />
                    <span>Lớp Bản Đồ Nền</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Chuyển đổi giữa Google Vệ tinh, Google Đường bộ, và Esri Vệ tinh.
                  </p>
                </div>
              )}
            </div>

            {/* Layer Popover */}
            {showLayerPopover && (
              <div className="absolute left-0 mt-2 w-48 bg-slate-950/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-2 z-[1002] space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Chọn Lớp Bản Đồ
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

          {/* 9. Mẫu Tuyến Chuẩn Thực Tế (Presets) */}
          <div className="relative">
            <div className="relative group">
              <button
                id="btn-tool-presets"
                type="button"
                onClick={() => {
                  setShowPresets(!showPresets);
                  setShowStrokePopover(false);
                  setShowLayerPopover(false);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  showPresets ? 'bg-indigo-600 text-white' : 'text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>
              {/* Hover Popup */}
              {!showPresets && (
                <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Mẫu Tuyến Chuẩn Thực Tế</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Nạp nhanh 1-Click các tuyến sông &amp; tuyến phố tiêu biểu (Sông Sài Gòn, Sông Hồng, Phố Nguyễn Huệ, Phố Tràng Tiền...)
                  </p>
                </div>
              )}
            </div>

            {/* Presets Dropdown */}
            {showPresets && (
              <div className="absolute left-0 mt-2 w-80 bg-slate-950/98 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl py-2 z-[1002] max-h-80 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                  <span>Chọn nhanh tuyến mẫu:</span>
                  <button
                    type="button"
                    onClick={() => setShowPresets(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {VIETNAM_SMART_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSmartPreset(preset)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-800/80 flex items-start gap-2.5 transition-colors cursor-pointer border-b border-slate-800/40 last:border-0"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: preset.type === 'river' ? '#0891b2' : '#059669',
                      }}
                    >
                      {preset.type === 'river' ? (
                        <Compass className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Navigation className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 truncate">
                        {preset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {preset.province} • {preset.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 10. Tìm Kiếm Vị Trí (Search Toggle) */}
          <div className="relative group">
            <button
              id="btn-tool-search-toggle"
              type="button"
              onClick={() => setShowSearchInput(!showSearchInput)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                showSearchInput ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
            {/* Hover Popup */}
            {!showSearchInput && (
              <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs mb-1">
                  <Search className="w-3.5 h-3.5 text-slate-300" />
                  <span>Tìm Kiếm Địa Điểm</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tìm kiếm địa danh, tên đường, con sông để di chuyển bản đồ đến đó.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-800 mx-0.5" />

          {/* 11. Khóa Khu Vực View & Zoom Toggle */}
          <div className="relative group">
            <button
              id="btn-tool-toggle-lock"
              type="button"
              onClick={() => onToggleRestrictBounds(!restrictBounds)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                restrictBounds
                  ? 'bg-emerald-600/90 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {restrictBounds ? <Lock className="w-4 h-4 text-white" /> : <Unlock className="w-4 h-4 text-slate-400" />}
            </button>
            {/* Hover Popup */}
            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 transform scale-95 group-hover:scale-100 absolute top-full right-0 mt-2 w-64 p-3 bg-slate-950 text-white rounded-xl shadow-2xl border border-slate-700 z-[9999]">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs mb-1">
                {restrictBounds ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{restrictBounds ? 'Đang Khóa Khu Vực Bản Đồ' : 'Chưa Khóa Khu Vực Bản Đồ'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {restrictBounds
                  ? 'ĐANG BẬT: Bản đồ sẽ chỉ hiển thị và thu phóng trong duy nhất phạm vi khu vực này mỗi lần xem lại.'
                  : 'ĐANG TẮT: Cho phép xem và di chuyển tự do không giới hạn khu vực.'}
              </p>
              <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-amber-300 font-mono">
                Bấm để {restrictBounds ? 'tắt khóa' : 'bật khóa'}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Compact Search Input */}
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
              className="bg-slate-900 text-slate-100 placeholder-slate-500 px-2.5 py-1 text-xs rounded-lg border border-slate-700 focus:outline-hidden w-48"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Đến'}
            </button>
            <button
              type="button"
              onClick={() => setShowSearchInput(false)}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* FLOATING STATUS PILL (Subtle notification bar in center-top of map, unobtrusive) */}
      {(smartStartPoint || isRouting || routingStatusMessage || allPoints.length > 0 || currentDraftSegment.length > 0) && (
        <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 z-[990] flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/80 shadow-2xl text-xs transition-all">
          {isRouting ? (
            <div className="flex items-center gap-2 text-amber-300 font-medium text-[11px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>{routingStatusMessage}</span>
            </div>
          ) : smartStartPoint ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Đã chọn Điểm A • Nhấp tiếp Điểm B trên bản đồ</span>
            </div>
          ) : currentDraftSegment.length > 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Đang vẽ đoạn #{segments.length + 1} ({currentDraftSegment.length} điểm)</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold">Nhấn Enter / Kết thúc để dừng</span>
            </div>
          ) : routingStatusMessage ? (
            <span className="text-indigo-300 text-[11px] font-medium">{routingStatusMessage}</span>
          ) : (
            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <span>
                {segments.length > 1 ? (
                  <>
                    <strong className="text-emerald-400">{segments.length}</strong> đoạn rời (
                    <strong className="text-white">{allPoints.length}</strong> điểm)
                  </>
                ) : (
                  <>
                    Điểm chốt: <strong className="text-white">{allPoints.length}</strong>
                  </>
                )}
              </span>
              {allPoints.length >= 2 && (
                <span className="text-emerald-400 font-bold border-l border-slate-700 pl-3">
                  ~{calculateDistanceKm()} km
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
