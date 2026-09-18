import React, { useState, useMemo } from 'react';
import { 
  Info, 
  X, 
  MapPin, 
  Navigation, 
  Waves, 
  Search, 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Phone, 
  User, 
  Compass, 
  Layers, 
  CheckCircle, 
  AlertCircle,
  Maximize2,
  GripHorizontal,
  Ban,
  RotateCcw
} from 'lucide-react';
import { RouteItem, LocationPoint, UserRole, getRolePermissions, EffectivePermissions, getAllPointsFromPolyline, getSegmentsFromPolyline } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';

interface RouteInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: RouteItem;
  points: LocationPoint[];
  selectedPointId: string | null;
  onSelectPoint: (point: LocationPoint) => void;
  onEditPoint: (point: LocationPoint) => void;
  onDeletePoint: (pointId: string) => void;
  onOpenNewPointModal: () => void;
  onFitBounds?: () => void;
  userRole: UserRole;
  permissions?: EffectivePermissions;
  onEditRoute?: (route: RouteItem) => void;
  onToggleRouteStatus?: (routeId: string, status: 'active' | 'inactive') => void;
  onDeleteRoute?: (routeId: string) => void;
}

export const RouteInfoModal: React.FC<RouteInfoModalProps> = ({
  isOpen,
  onClose,
  currentRoute,
  points,
  selectedPointId,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  onOpenNewPointModal,
  onFitBounds,
  userRole,
  permissions: propPermissions,
  onEditRoute,
  onToggleRouteStatus,
  onDeleteRoute,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'points'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'route' | 'point'; id: string; name: string } | null>(null);

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  const permissions = propPermissions || getRolePermissions(userRole);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    points.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter((point) => {
      const matchSearch =
        point.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        point.phone.includes(searchTerm) ||
        (point.address && point.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || point.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [points, searchTerm, selectedCategory]);

  const activeCount = points.filter((p) => p.status === 'Đang hoạt động').length;
  const pendingCount = points.filter((p) => p.status !== 'Đang hoạt động').length;

  if (!isOpen) return null;

  const getStatusBadge = (status: LocationPoint['status']) => {
    switch (status) {
      case 'Đang hoạt động':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Tạm ngừng':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Đang cải tạo / xây dựng':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Cần kiểm tra định kỳ':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Chưa có giấy phép':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handlePointClick = (point: LocationPoint) => {
    onSelectPoint(point);
    onClose(); // Automatically close modal so user can view location on map
  };

  return (
    <div 
      id="route-info-modal-backdrop"
      className="fixed inset-0 z-[999990] flex items-center justify-center p-0 bg-slate-950/80 backdrop-blur-[2px] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="route-info-dialog" 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-2xl overflow-hidden my-auto animate-in fade-in duration-150 z-[999995] relative flex flex-col"
      >
        {/* Modal Header */}
        <div 
          className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              {currentRoute.type === 'river' ? (
                <Waves className="w-4 h-4 text-cyan-300" />
              ) : (
                <Navigation className="w-4 h-4 text-emerald-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  currentRoute.type === 'river'
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                }`}>
                  {currentRoute.type === 'river' ? 'Tuyến Đường Thủy Sông' : 'Tuyến Phố Đô Thị'}
                </span>
                <span className="text-xs text-slate-400">• {currentRoute.province}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  currentRoute.status === 'inactive'
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-emerald-900/80 text-emerald-300 border-emerald-600'
                }`}>
                  {currentRoute.status === 'inactive' ? 'Đã vô hiệu' : 'Đang hoạt động'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1">
                {currentRoute.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-close-route-info"
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-semibold"
              title="Đóng (Close) form"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              id="tab-route-overview"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Thông Tin Tuyến</span>
            </button>
            <button
              id="tab-route-points"
              onClick={() => setActiveTab('points')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'points'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Danh Sách Điểm ({points.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {onFitBounds && (
              <button
                type="button"
                onClick={() => {
                  onFitBounds();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Thu phóng toàn bộ tuyến trên bản đồ"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Xem Toàn Tuyến</span>
              </button>
            )}

            {/* Edit Route Button */}
            {onEditRoute && permissions.canEditRoute && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditRoute(currentRoute);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Chỉnh sửa thông tin và vẽ lại tuyến đường"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Sửa Tuyến</span>
              </button>
            )}

            {/* Toggle Active / Inactive Status */}
            {onToggleRouteStatus && permissions.canEditRoute && (
              <button
                type="button"
                onClick={() => {
                  const newStatus = currentRoute.status === 'inactive' ? 'active' : 'inactive';
                  onToggleRouteStatus(currentRoute.id, newStatus);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                  currentRoute.status === 'inactive'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
                title={currentRoute.status === 'inactive' ? 'Khôi phục hiển thị tuyến trong dropdown' : 'Vô hiệu hóa tuyến (ẩn khỏi dropdown list)'}
              >
                {currentRoute.status === 'inactive' ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Khôi Phục Tuyến</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Vô Hiệu Tuyến</span>
                  </>
                )}
              </button>
            )}

            {/* Delete Route */}
            {onDeleteRoute && permissions.canDeleteRoute && (
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget({ type: 'route', id: currentRoute.id, name: currentRoute.name });
                }}
                className="px-2.5 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Xóa vĩnh viễn tuyến đường này"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Xóa Tuyến</span>
              </button>
            )}

            {permissions.canCreatePoint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewPointModal();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Thêm điểm GPS mới vào tuyến này"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0" />
                <span>Thêm Điểm GPS</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 flex flex-col space-y-4 min-h-0">
          {/* In-UI Delete Confirmation */}
          {deleteTarget && (
            <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950">
                    {deleteTarget.type === 'route' ? 'Xác Nhận Xóa Tuyến Đường' : 'Xác Nhận Xóa Điểm GPS'}
                  </h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    {deleteTarget.type === 'route'
                      ? `Bạn có chắc chắn muốn xóa vĩnh viễn tuyến "${deleteTarget.name}" cùng tất cả các điểm GPS thuộc tuyến này? Hành động này không thể hoàn tác.`
                      : `Bạn có chắc chắn muốn xóa vị trí "${deleteTarget.name}" khỏi danh sách?`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteTarget.type === 'route') {
                      const id = deleteTarget.id;
                      setDeleteTarget(null);
                      onClose();
                      onDeleteRoute?.(id);
                    } else {
                      const id = deleteTarget.id;
                      setDeleteTarget(null);
                      onDeletePoint(id);
                    }
                  }}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </div>
          )}

          {activeTab === 'overview' ? (
            /* TAB 1: Chi Tiết Tuyến Phố / Tuyến Sông */
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tổng Điểm Định Vị</div>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{points.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Vị trí GPS đã lưu</div>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Đang Hoạt Động</div>
                  <div className="text-xl font-black text-emerald-700 mt-0.5">{activeCount}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">Cơ sở vận hành bình thường</div>
                </div>

                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
                  <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Cần Kiểm Tra</div>
                  <div className="text-xl font-black text-amber-700 mt-0.5">{pendingCount}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">Tạm dừng / Chưa giấy phép</div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
                  <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Tọa Độ Nét Đỏ</div>
                  <div className="text-xl font-black text-indigo-700 mt-0.5">
                    {getAllPointsFromPolyline(currentRoute.polyline).length}
                  </div>
                  <div className="text-[11px] text-indigo-600 mt-0.5">
                    {getSegmentsFromPolyline(currentRoute.polyline).length > 1
                      ? `${getSegmentsFromPolyline(currentRoute.polyline).length} phân đoạn rời`
                      : 'Điểm nối tuyến (Polyline)'}
                  </div>
                </div>
              </div>

              {/* Description & Overview Section */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>Mô Tả Chi Tiết Tuyến Đường</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {currentRoute.description || 'Chưa có mô tả chi tiết cho tuyến này.'}
                </p>
              </div>

              {/* Geographic Coordinates & GIS Specs */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <span>Thông Số Kỹ Thuật GIS &amp; Vị Trí Trung Tâm</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Tọa Độ Tâm Tuyến (Center)</span>
                    <span className="font-mono font-bold text-slate-800">
                      {currentRoute.center[0].toFixed(5)}, {currentRoute.center[1].toFixed(5)}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Độ Phóng Mặc Định (Zoom)</span>
                    <span className="font-mono font-bold text-slate-800">
                      Mức {currentRoute.zoom}x
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Lớp Ảnh Vệ Tinh Đã Vẽ Tô</span>
                    <span className="font-bold text-slate-800">
                      {currentRoute.mapOverlay ? 'Có (Tùy chọn độ mờ)' : 'Chưa thiết lập'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action notice */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3 text-xs text-indigo-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Chuyển sang tab <strong>Danh Sách Điểm ({points.length})</strong> để tìm kiếm, tra cứu chi tiết và chọn điểm hiển thị trực tiếp trên bản đồ.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('points')}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors"
                >
                  Xem danh sách
                </button>
              </div>
            </div>
          ) : (
            /* TAB 2: Danh Sách & Tìm Kiếm Điểm Trên Tuyến */
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              {/* Search & Category Filter Section */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="search-route-info-points"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên cơ sở, chủ sở hữu, số điện thoại, địa chỉ..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({points.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Point Cards List */}
              <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
                {filteredPoints.length === 0 ? (
                  <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400">
                    <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-semibold text-slate-600">Không tìm thấy địa điểm phù hợp</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thử đổi từ khóa tìm kiếm hoặc chọn danh mục khác.
                    </p>
                  </div>
                ) : (
                  filteredPoints.map((point) => {
                    const isSelected = selectedPointId === point.id;
                    return (
                      <div
                        key={point.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-1 ring-indigo-300'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                {point.category}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadge(point.status)}`}>
                                {point.status}
                              </span>
                            </div>

                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                              {point.name}
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600 pt-0.5">
                              <div className="flex items-center gap-1.5 truncate">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-medium text-slate-700">{point.owner}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <a href={`tel:${point.phone}`} className="hover:text-indigo-600 font-mono">
                                  {point.phone}
                                </a>
                              </div>
                            </div>

                            {point.address && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                📍 {point.address}
                              </div>
                            )}

                            <div className="text-[10px] font-mono text-slate-400">
                              Tọa độ: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                            </div>
                          </div>

                          {/* Point Action Buttons */}
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handlePointClick(point)}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                              title="Xem trực tiếp trên bản đồ"
                            >
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Xem trên bản đồ</span>
                            </button>

                            {permissions.canEditPoint && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onEditPoint(point);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Chỉnh sửa điểm GPS"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {permissions.canDeletePoint && (
                              <button
                                onClick={() => {
                                  setDeleteTarget({ type: 'point', id: point.id, name: point.name });
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Xóa địa điểm này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Tuyến: <strong className="text-slate-800">{currentRoute.name}</strong> ({points.length} điểm vị trí)
          </span>

          <button
            id="btn-footer-close-route-info"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Đóng / Quay Lại Bản Đồ
          </button>
        </div>
      </div>
    </div>
  );
};
