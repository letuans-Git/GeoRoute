import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Upload, 
  Waves, 
  Navigation, 
  CheckCircle, 
  Sparkles, 
  GripHorizontal, 
  PenTool, 
  Lock, 
  Unlock,
  ShieldCheck,
  Compass, 
  Check, 
  Info, 
  Edit3,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Star,
  Trash2,
  Map
} from 'lucide-react';
import { RouteItem, RouteType, RouteStrokeStyle, RoutePolyline, getAllPointsFromPolyline } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { RouteDrawerMap } from './RouteDrawerMap';

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRoute: (route: RouteItem) => void;
  initialRoute?: RouteItem | null;
  onDeleteRoute?: (routeId: string) => void;
  canDelete?: boolean;
}

export const RouteModal: React.FC<RouteModalProps> = ({
  isOpen,
  onClose,
  onSaveRoute,
  initialRoute = null,
  onDeleteRoute,
  canDelete = true,
}) => {
  const isEditing = !!initialRoute;

  const [name, setName] = useState(initialRoute?.name || '');
  const [type, setType] = useState<RouteType>(initialRoute?.type || 'river');
  const [province, setProvince] = useState(initialRoute?.province || 'Hải Phòng');
  const [description, setDescription] = useState(initialRoute?.description || '');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'map'>('form');
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Pen and Stroke state
  const [strokeStyle, setStrokeStyle] = useState<RouteStrokeStyle>(
    initialRoute?.strokeStyle || {
      color: initialRoute?.type === 'street' ? '#0284c7' : '#dc2626',
      weight: 6,
      dashArray: '',
      opacity: 0.95,
      hasGlow: true,
    }
  );

  // Polyline points drawn on map
  const [drawnPolyline, setDrawnPolyline] = useState<RoutePolyline>(
    initialRoute?.polyline || []
  );

  // Thành phần con đường gốc của tuyến (dành cho chế độ Sửa Tuyến)
  const initialRoadPointsCount = useMemo(() => {
    return initialRoute?.polyline ? getAllPointsFromPolyline(initialRoute.polyline).length : 0;
  }, [initialRoute]);
  const hasOriginalRoad = initialRoadPointsCount > 0;

  // Mặc định luôn bật chế độ giữ nguyên 100% thành phần con đường khi sửa tuyến
  const [preserveOriginalRoad, setPreserveOriginalRoad] = useState<boolean>(true);

  // Captured Map Area (Center, Zoom, Bounds)
  const [mapArea, setMapArea] = useState<{
    center: [number, number];
    zoom: number;
    bounds: [[number, number], [number, number]];
  }>({
    center: initialRoute?.center || [20.8449, 106.6881],
    zoom: initialRoute?.zoom || 14,
    bounds: initialRoute?.bounds || [
      [20.80, 106.63],
      [20.89, 106.74],
    ],
  });

  // View & Zoom Lock option (Ngầm định không được chọn - default false)
  const [restrictBounds, setRestrictBounds] = useState<boolean>(
    initialRoute ? (initialRoute.restrictBounds === true) : false
  );

  // Default Startup Route Option
  const [isDefault, setIsDefault] = useState<boolean>(
    initialRoute ? (initialRoute.isDefault === true) : false
  );

  // Optional image overlay upload
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(
    initialRoute?.mapOverlay?.imageUrl || null
  );
  const [imageFileName, setImageFileName] = useState<string>(
    initialRoute?.mapOverlay?.fileName || ''
  );

  // Re-sync when initialRoute changes
  useEffect(() => {
    if (initialRoute) {
      setName(initialRoute.name);
      setType(initialRoute.type);
      setProvince(initialRoute.province);
      setDescription(initialRoute.description || '');
      setStrokeStyle(initialRoute.strokeStyle || {
        color: initialRoute.type === 'street' ? '#0284c7' : '#dc2626',
        weight: 6,
        dashArray: '',
        opacity: 0.95,
        hasGlow: true,
      });
      setDrawnPolyline(initialRoute.polyline || []);
      setMapArea({
        center: initialRoute.center,
        zoom: initialRoute.zoom,
        bounds: initialRoute.bounds || [
          [initialRoute.center[0] - 0.05, initialRoute.center[1] - 0.05],
          [initialRoute.center[0] + 0.05, initialRoute.center[1] + 0.05],
        ],
      });
      setRestrictBounds(initialRoute.restrictBounds === true);
      setIsDefault(initialRoute.isDefault === true);
      setPreserveOriginalRoad(true);
      if (initialRoute.mapOverlay?.imageUrl) {
        setUploadedImagePreview(initialRoute.mapOverlay.imageUrl);
        setImageFileName(initialRoute.mapOverlay.fileName || 'overlay.png');
      }
    } else {
      // Reset defaults for Create Mode
      setName('');
      setType('river');
      setProvince('Hải Phòng');
      setDescription('');
      setStrokeStyle({
        color: '#dc2626',
        weight: 6,
        dashArray: '',
        opacity: 0.95,
        hasGlow: true,
      });
      setDrawnPolyline([]);
      setPreserveOriginalRoad(false);
      setMapArea({
        center: [20.8449, 106.6881],
        zoom: 14,
        bounds: [
          [20.80, 106.63],
          [20.89, 106.74],
        ],
      });
      setRestrictBounds(false);
      setIsDefault(false);
      setUploadedImagePreview(null);
      setImageFileName('');
    }
  }, [initialRoute, isOpen]);

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  if (!isOpen) return null;

  // Handle image upload of Google Maps
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset selected from smart library: auto-populate route form fields
  const handlePresetSelect = (preset: {
    name: string;
    type: 'river' | 'street';
    province: string;
    desc: string;
  }) => {
    setName(preset.name);
    setType(preset.type);
    setProvince(preset.province);
    setDescription(preset.desc);
    setStrokeStyle((prev) => ({
      ...prev,
      color: preset.type === 'street' ? '#0284c7' : '#dc2626',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalPolyline: RoutePolyline = drawnPolyline;

    // QUY TẮC BẢO LƯU THÀNH PHẦN CON ĐƯỜNG KHI SỬA TUYẾN:
    // 1. Khi đang sửa tuyến và chế độ bảo lưu con đường bật: bảo lưu 100% nét vẽ gốc
    // 2. Nếu người dùng tắt bảo lưu hoặc xóa sạch để vẽ lại: sử dụng nét vẽ drawnPolyline
    if (isEditing && hasOriginalRoad && preserveOriginalRoad && initialRoute?.polyline) {
      finalPolyline = initialRoute.polyline;
    } else {
      finalPolyline = drawnPolyline;
    }

    // Bảo lưu trọn vẹn khung nhìn bản đồ (bounds, center, zoom) của con đường gốc nếu đang giữ nguyên con đường
    let finalBounds = mapArea.bounds;
    let routeCenter: [number, number] = mapArea.center;
    let routeZoom = mapArea.zoom;

    if (isEditing && hasOriginalRoad && preserveOriginalRoad && initialRoute) {
      finalBounds = initialRoute.bounds || mapArea.bounds;
      routeCenter = initialRoute.center;
      routeZoom = initialRoute.zoom || mapArea.zoom;
    } else {
      const allPolylinePoints = getAllPointsFromPolyline(finalPolyline);
      if (allPolylinePoints.length > 0) {
        const lats = allPolylinePoints.map((p) => p[0]);
        const lngs = allPolylinePoints.map((p) => p[1]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        const latMargin = Math.max((maxLat - minLat) * 0.35, 0.015);
        const lngMargin = Math.max((maxLng - minLng) * 0.35, 0.015);

        finalBounds = [
          [Math.min(mapArea.bounds[0][0], minLat - latMargin), Math.min(mapArea.bounds[0][1], minLng - lngMargin)],
          [Math.max(mapArea.bounds[1][0], maxLat + latMargin), Math.max(mapArea.bounds[1][1], maxLng + lngMargin)],
        ];
        routeCenter = [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
      }
    }

    const savedRoute: RouteItem = {
      id: initialRoute ? initialRoute.id : `route-${Date.now()}`,
      name: name.trim(),
      type,
      province: province.trim(),
      description: description.trim() || `Tuyến quản lý ${name.trim()} do Tuấn Lê Software thiết lập.`,
      center: routeCenter,
      zoom: routeZoom,
      polyline: finalPolyline,
      strokeStyle,
      bounds: finalBounds,
      minZoom: Math.max(routeZoom - 2, 10),
      maxZoom: 19,
      restrictBounds,
      status: initialRoute?.status || 'active',
      isDefault,
      createdAt: initialRoute?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (uploadedImagePreview) {
      const offset = type === 'river' ? 0.025 : 0.008;
      savedRoute.mapOverlay = {
        imageUrl: uploadedImagePreview,
        fileName: imageFileName || 'google-map-marked-route.png',
        bounds: [
          [mapArea.center[0] - offset, mapArea.center[1] - offset],
          [mapArea.center[0] + offset, mapArea.center[1] + offset],
        ],
        opacity: 0.75,
        visible: true,
      };
    }

    onSaveRoute(savedRoute);
    onClose();
  };

  return (
    <div 
      id="route-modal-backdrop"
      className="fixed inset-0 z-[999990] w-screen h-screen bg-slate-900 overflow-hidden flex flex-col p-0 m-0"
    >
      <div 
        id="route-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full bg-slate-900 overflow-hidden relative flex flex-col rounded-none border-0 shadow-none animate-in fade-in duration-150 z-[999995]"
      >
        {/* Nút Close form cố định góc trên bên phải */}
        <button
          id="btn-close-route-modal-top"
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-[1001] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-950/90 hover:bg-rose-600 text-white rounded-lg shadow-xl border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all cursor-pointer group"
          title="Đóng (Close) form"
        >
          <X className="w-4 h-4 text-slate-300 group-hover:text-white" />
          <span>Đóng</span>
        </button>

        {/* Mobile View Switcher (Chỉ hiển thị trên Mobile & Tablet màn hình nhỏ < md) */}
        <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-2.5 py-2 border-b border-slate-800 shrink-0 z-20 pr-24">
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMobileTab('form')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Cấu Hình</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('map')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Bản Đồ Vẽ</span>
              {getAllPointsFromPolyline(drawnPolyline).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-900 text-[10px] font-mono">
                  {getAllPointsFromPolyline(drawnPolyline).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body: Split Layout (Full Screen) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-900 relative h-full">
          {/* Collapsible Left Rail when panel is collapsed on desktop */}
          {isPanelCollapsed && (
            <div className="w-10 bg-white border-r border-slate-200 flex flex-col items-center py-2.5 gap-2 shrink-0 z-10 shadow-sm hidden md:flex justify-between h-full">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(false)}
                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                  title="Mở rộng bảng thông tin tuyến"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <div className="writing-vertical-lr rotate-180 text-[10px] font-bold text-slate-500 tracking-wider select-none uppercase mt-2">
                  Thông tin tuyến
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Đóng form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Panel: Route Info Form */}
          <form 
            onSubmit={handleSubmit} 
            className={`${
              mobileTab === 'map' ? 'hidden md:flex' : 'flex'
            } ${
              isPanelCollapsed ? 'md:hidden' : 'md:flex'
            } w-full md:w-[270px] lg:w-[285px] bg-white border-r border-slate-200 flex-col shrink-0 h-full min-h-0 overflow-y-auto z-10 shadow-sm transition-all duration-200`}
          >
            {/* Panel sub-header with Title, Collapse button & Close button */}
            <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                {isEditing ? 'Sửa Tuyến' : 'Cấu Hình Tuyến'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="md:hidden px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Xem bản đồ"
                >
                  <Map className="w-3 h-3" />
                  <span>Vẽ Bản Đồ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Thu gọn để dành toàn bộ màn hình cho bản đồ"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Đóng form"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Form Fields & Buttons grouped together tightly at the top */}
            <div className="p-2 space-y-1.5 shrink-0">
              {/* Route Type selection - Ultra compact */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Phân Loại Tuyến <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    id="btn-select-type-river"
                    onClick={() => {
                      setType('river');
                      if (drawnPolyline.length === 0) {
                        setStrokeStyle((prev) => ({ ...prev, color: '#dc2626', dashArray: '' }));
                      }
                    }}
                    className={`py-1 px-2 rounded-md border text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      type === 'river'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-950 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                    }`}
                  >
                    <Waves className={`w-3.5 h-3.5 ${type === 'river' ? 'text-cyan-600' : 'text-slate-400'}`} />
                    <span className="text-xs">Tuyến Sông</span>
                  </button>

                  <button
                    type="button"
                    id="btn-select-type-street"
                    onClick={() => {
                      setType('street');
                      if (drawnPolyline.length === 0) {
                        setStrokeStyle((prev) => ({ ...prev, color: '#0284c7', dashArray: '10, 8' }));
                      }
                    }}
                    className={`py-1 px-2 rounded-md border text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      type === 'street'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 font-medium'
                    }`}
                  >
                    <Navigation className={`w-3.5 h-3.5 ${type === 'street' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs">Tuyến Phố</span>
                  </button>
                </div>
              </div>

              {/* Route Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Tên Tuyến Quản Lý <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-route-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === 'river' ? 'Vd: Tuyến Sông Cấm (Hải Phòng)' : 'Vd: Tuyến Phố Lê Hồng Phong'}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-medium"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Tỉnh / Thành Phố
                </label>
                <input
                  id="input-route-province"
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Vd: Hải Phòng, Hà Nội..."
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Chế độ Bảo Lưu Thành Phần Con Đường khi Sửa Tuyến */}
              {isEditing && hasOriginalRoad && (
                <div id="section-preserve-road-status" className="p-2 bg-emerald-50 border border-emerald-300/80 rounded-md space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Thành Phần Con Đường</span>
                    </span>
                    <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.2 rounded-full">
                      {initialRoadPointsCount} điểm tọa độ
                    </span>
                  </div>
                  
                  <p className="text-[10px] text-emerald-800 leading-tight">
                    {preserveOriginalRoad ? (
                      <span className="font-semibold text-emerald-900 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                        Đang bảo lưu nguyên vẹn nét vẽ con đường.
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Đang mở chế độ vẽ đè con đường mới trên bản đồ.
                      </span>
                    )}
                  </p>

                  <div className="pt-0.5">
                    <button
                      type="button"
                      id="btn-toggle-preserve-road"
                      onClick={() => {
                        const nextVal = !preserveOriginalRoad;
                        setPreserveOriginalRoad(nextVal);
                        if (nextVal && initialRoute?.polyline) {
                          setDrawnPolyline(initialRoute.polyline);
                        }
                      }}
                      className={`w-full py-1 px-2 text-[10px] font-bold rounded transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs ${
                        preserveOriginalRoad
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      }`}
                      title={preserveOriginalRoad ? 'Bấm để mở chế độ vẽ lại con đường' : 'Bấm để khóa bảo lưu con đường gốc'}
                    >
                      {preserveOriginalRoad ? (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>Đang giữ nguyên con đường gốc</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3 text-amber-600" />
                          <span>Chuyển sang Giữ nguyên con đường</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Toggles: Khóa View & Zoom and Tuyến hiển thị ngầm định */}
              <div className="space-y-1">
                <label
                  htmlFor="checkbox-restrict-bounds"
                  className={`px-2 py-1 rounded-md border flex items-center justify-between cursor-pointer select-none transition-colors ${
                    restrictBounds
                      ? 'bg-indigo-50/80 hover:bg-indigo-100/80 border-indigo-200 text-indigo-950'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-[11px] font-semibold flex items-center gap-1.5">
                    {restrictBounds ? (
                      <Lock className="w-3 h-3 text-indigo-600" />
                    ) : (
                      <Unlock className="w-3 h-3 text-slate-400" />
                    )}
                    <span>Khóa View &amp; Zoom</span>
                  </span>
                  <input
                    id="checkbox-restrict-bounds"
                    type="checkbox"
                    checked={restrictBounds}
                    onChange={(e) => setRestrictBounds(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>

                <label
                  htmlFor="checkbox-is-default-route"
                  className="px-2 py-1 bg-amber-50/70 hover:bg-amber-50 rounded-md border border-amber-200/80 flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <span className="text-[11px] font-semibold text-amber-950 flex items-center gap-1.5">
                    <Star className={`w-3 h-3 ${isDefault ? 'fill-amber-500 text-amber-500' : 'text-amber-600'}`} />
                    <span>Tuyến hiển thị ngầm định</span>
                  </span>
                  <input
                    id="checkbox-is-default-route"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Expandable Advanced Options */}
              <div className="border border-slate-200 rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="w-full px-2 py-1 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-600 transition-colors cursor-pointer"
                >
                  <span>Mô tả &amp; Ảnh thực địa</span>
                  {showAdvancedOptions ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>

                {showAdvancedOptions && (
                  <div className="p-2 space-y-1.5 bg-white border-t border-slate-200">
                    <div>
                      <textarea
                        id="input-route-description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ghi chú mô tả..."
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-medium text-slate-600 flex items-center gap-1">
                          <Upload className="w-2.5 h-2.5" />
                          Ảnh thực địa
                        </span>
                        {uploadedImagePreview && (
                          <button
                            type="button"
                            onClick={() => { setUploadedImagePreview(null); setImageFileName(''); }}
                            className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <input
                        id="file-upload-map-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload-map-image"
                        className="block p-1.5 text-center border border-dashed border-slate-300 hover:border-indigo-400 rounded-md bg-slate-50 cursor-pointer transition-colors"
                      >
                        {uploadedImagePreview ? (
                          <span className="text-[10px] font-semibold text-emerald-700 flex items-center justify-center gap-1 truncate">
                            <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                            {imageFileName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 hover:text-indigo-600 block">
                            Tải lên ảnh thực địa
                          </span>
                        )}
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Quick Switch Button to Map Studio */}
              <div className="pt-1 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="w-full py-1.5 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mở Bản Đồ Vẽ &amp; Xem Tuyến</span>
                </button>
              </div>

              {/* Action Buttons: Dồn lên trên ngay sát các ô thông tin */}
              <div className="pt-1 flex flex-col gap-1.5">
                {confirmDelete ? (
                  <div className="p-2 bg-rose-50 border border-rose-300 rounded-lg flex flex-col gap-1.5 animate-in fade-in">
                    <span className="text-[11px] font-bold text-rose-800">
                      Xác nhận xóa vĩnh viễn tuyến "{initialRoute?.name}"?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (initialRoute && onDeleteRoute) {
                            onClose();
                            onDeleteRoute(initialRoute.id);
                          }
                        }}
                        className="flex-1 py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                      >
                        Đồng ý xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="py-1 px-2 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    {isEditing && initialRoute && onDeleteRoute && canDelete && (
                      <button
                        type="button"
                        id="btn-delete-route-modal"
                        onClick={() => setConfirmDelete(true)}
                        className="py-1.5 px-2.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-2xs"
                        title="Xóa vĩnh viễn tuyến này"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Xóa</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id="btn-cancel-route"
                      onClick={onClose}
                      className="flex-1 py-1.5 px-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-center"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      id="btn-create-route-submit"
                      className="flex-1 py-1.5 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu tuyến</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Right Panel: Full Interactive Route Drawing Studio */}
          <div className={`${mobileTab === 'form' ? 'hidden md:block' : 'block'} flex-1 h-full relative min-h-0 overflow-hidden`}>
            {/* Mobile return to form button */}
            <div className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001]">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className="px-3.5 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xl flex items-center gap-1.5 cursor-pointer border border-indigo-400/50 backdrop-blur-md"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quay Lại Cấu Hình & Lưu</span>
              </button>
            </div>

            {/* Floating Re-open panel button when collapsed on mobile/tablet */}
            {isPanelCollapsed && (
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="absolute top-3 left-3 z-[1001] px-2.5 py-1.5 bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold rounded-lg shadow-xl border border-slate-300 flex items-center gap-1.5 md:hidden cursor-pointer"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Thông tin</span>
              </button>
            )}

            <RouteDrawerMap
              initialCenter={initialRoute?.center || [20.8449, 106.6881]}
              initialZoom={initialRoute?.zoom || 14}
              initialPolyline={isEditing && hasOriginalRoad && preserveOriginalRoad && initialRoute?.polyline ? initialRoute.polyline : drawnPolyline}
              routeType={type}
              strokeStyle={strokeStyle}
              onStrokeStyleChange={setStrokeStyle}
              onPolylineChange={setDrawnPolyline}
              onMapAreaCaptured={setMapArea}
              restrictBounds={restrictBounds}
              onToggleRestrictBounds={setRestrictBounds}
              onPresetSelect={handlePresetSelect}
              isPreservingOriginalRoad={isEditing && hasOriginalRoad && preserveOriginalRoad}
              onTogglePreserveRoad={setPreserveOriginalRoad}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
