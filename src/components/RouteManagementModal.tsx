import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  X, 
  Search, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  PowerOff, 
  RotateCcw, 
  Waves, 
  Navigation, 
  MapPin, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  GripHorizontal,
  Star
} from 'lucide-react';
import { RouteItem, LocationPoint, EffectivePermissions, getAllPointsFromPolyline, getSegmentsFromPolyline } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';

interface RouteManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteItem[];
  currentRouteId: string;
  points: LocationPoint[];
  onOpenCreateRoute: () => void;
  onEditRoute: (route: RouteItem) => void;
  onDeleteRoute: (routeId: string) => void;
  onToggleRouteStatus: (routeId: string, newStatus: 'active' | 'inactive') => void;
  onSetDefaultRoute: (routeId: string) => void;
  onSelectRoute?: (routeId: string) => void;
  permissions: EffectivePermissions;
}

export const RouteManagementModal: React.FC<RouteManagementModalProps> = ({
  isOpen,
  onClose,
  routes,
  currentRouteId,
  points,
  onOpenCreateRoute,
  onEditRoute,
  onDeleteRoute,
  onToggleRouteStatus,
  onSetDefaultRoute,
  onSelectRoute,
  permissions,
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'river' | 'street'>('all');
  const [deleteConfirmRouteId, setDeleteConfirmRouteId] = useState<string | null>(null);

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  // Separate active and inactive routes
  const activeRoutes = useMemo(() => {
    return routes.filter((r) => r.status !== 'inactive');
  }, [routes]);

  const inactiveRoutes = useMemo(() => {
    return routes.filter((r) => r.status === 'inactive');
  }, [routes]);

  // Current tab list with filters applied
  const displayedRoutes = useMemo(() => {
    const list = activeTab === 'active' ? activeRoutes : inactiveRoutes;
    return list.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchType = typeFilter === 'all' || r.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [activeTab, activeRoutes, inactiveRoutes, searchTerm, typeFilter]);

  if (!isOpen) return null;

  const routeToDelete = routes.find((r) => r.id === deleteConfirmRouteId);
  const pointsOnRouteToDelete = deleteConfirmRouteId
    ? points.filter((p) => p.routeId === deleteConfirmRouteId).length
    : 0;

  return (
    <div
      id="route-management-modal-backdrop"
      className="fixed inset-0 z-[999990] flex items-center justify-center p-0 bg-slate-950/80 backdrop-blur-[2px] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="route-management-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-2xl overflow-hidden animate-in fade-in duration-150 z-[999995] relative flex flex-col"
      >
        {/* Compact Header */}
        <div
          className="px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs border-b border-slate-800 select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
              <Layers className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                Quản Lý Danh Sách Tuyến Đường
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700/60">
                {routes.length} tuyến
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-close-route-mgmt"
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

        {/* Compact Single-Row Toolbar: Tabs + Search + Type Filters + Add Button */}
        <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Left: Status Tabs & Type Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Tabs */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                id="tab-routes-active"
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'active'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Hoạt động</span>
                <span className="px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                  {activeRoutes.length}
                </span>
              </button>

              <button
                id="tab-routes-inactive"
                type="button"
                onClick={() => setActiveTab('inactive')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'inactive'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Đã tắt</span>
                <span className="px-1 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono">
                  {inactiveRoutes.length}
                </span>
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

            {/* Type Filters */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('river')}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                  typeFilter === 'river'
                    ? 'bg-cyan-700 text-white font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Waves className="w-3 h-3 text-cyan-500" />
                <span>Sông</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('street')}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1 ${
                  typeFilter === 'street'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Navigation className="w-3 h-3 text-emerald-500" />
                <span>Phố</span>
              </button>
            </div>
          </div>

          {/* Right: Search Input & Create Route Button */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-56 min-w-[140px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, tỉnh thành..."
                className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-hidden transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {permissions.canCreateRoute && (
              <button
                id="btn-create-route-mgmt"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateRoute();
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer shrink-0"
                title="Tạo mới tuyến đường"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tạo Tuyến Mới</span>
                <span className="sm:hidden">Tạo Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Route List Body - Maximized height and density */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2 min-h-0 bg-slate-50/50">
          {displayedRoutes.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">
                {activeTab === 'active'
                  ? 'Không tìm thấy tuyến đường đang hoạt động nào'
                  : 'Không có tuyến đường nào bị vô hiệu hóa'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeTab === 'active'
                  ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc tạo thêm tuyến mới.'
                  : 'Tất cả tuyến đường hiện đang ở trạng thái hoạt động.'}
              </p>
              {activeTab === 'active' && permissions.canCreateRoute && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateRoute();
                  }}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tạo Tuyến Mới Ngay</span>
                </button>
              )}
            </div>
          ) : (
            displayedRoutes.map((route) => {
              const isCurrent = route.id === currentRouteId;
              const pointCount = points.filter((p) => p.routeId === route.id).length;
              const strokeColor = route.strokeStyle?.color || '#dc2626';

              return (
                <div
                  key={route.id}
                  id={`route-mgmt-card-${route.id}`}
                  className={`bg-white rounded-xl border transition-all px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs ${
                    isCurrent
                      ? 'border-indigo-400 ring-1 ring-indigo-200 bg-indigo-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Route Info & Identification */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                      style={{
                        backgroundColor: route.type === 'river' ? '#0891b2' : '#059669',
                      }}
                    >
                      {route.type === 'river' ? (
                        <Waves className="w-4 h-4 text-white" />
                      ) : (
                        <Navigation className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {route.name}
                        </h3>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            route.type === 'river'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {route.type === 'river' ? 'Sông' : 'Phố'}
                        </span>

                        <span className="text-xs text-slate-500 font-medium">
                          • {route.province}
                        </span>

                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                            Đang xem
                          </span>
                        )}

                        {route.isDefault && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                            Ngầm định
                          </span>
                        )}

                        {route.status === 'inactive' && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Đã tắt
                          </span>
                        )}
                      </div>

                      {/* Meta stats */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          <span><strong>{pointCount}</strong> điểm GPS</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-1.5 rounded-sm inline-block border border-white"
                            style={{ backgroundColor: strokeColor }}
                          />
                          <span>Nét vẽ ({getSegmentsFromPolyline(route.polyline).length > 1 ? `${getSegmentsFromPolyline(route.polyline).length} đoạn, ` : ''}{getAllPointsFromPolyline(route.polyline).length} điểm)</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="flex items-center gap-1">
                          {route.restrictBounds !== false ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              Khóa vùng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <Unlock className="w-3 h-3 text-slate-400" />
                              Tự do
                            </span>
                          )}
                        </span>

                        {route.description && (
                          <>
                            <span className="text-slate-300 hidden md:inline">•</span>
                            <span className="text-slate-400 truncate max-w-xs hidden md:inline">
                              {route.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons - Compact & Aligned */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-100">
                    {/* Default Route Selector Button */}
                    {route.isDefault ? (
                      <div
                        id={`badge-default-route-${route.id}`}
                        className="px-2 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-bold flex items-center gap-1 shadow-2xs select-none"
                        title="Tuyến này là tuyến ngầm định khi khởi chạy"
                      >
                        <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                        <span>Ngầm Định</span>
                      </div>
                    ) : (
                      <button
                        id={`btn-set-default-route-${route.id}`}
                        type="button"
                        onClick={() => onSetDefaultRoute(route.id)}
                        className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-600 hover:text-amber-800 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-all cursor-pointer group"
                        title="Chọn tuyến này làm ngầm định khi khởi chạy"
                      >
                        <Star className="w-3 h-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                        <span>Đặt Ngầm Định</span>
                      </button>
                    )}

                    {/* Select / View Route Button */}
                    {onSelectRoute && !isCurrent && (
                      <button
                        id={`btn-select-route-${route.id}`}
                        type="button"
                        onClick={() => {
                          onSelectRoute(route.id);
                          onClose();
                        }}
                        className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Chọn tuyến này để hiển thị trên bản đồ chính"
                      >
                        <Navigation className="w-3 h-3 text-indigo-600" />
                        <span>Xem</span>
                      </button>
                    )}

                    {/* Edit Route */}
                    {permissions.canEditRoute && (
                      <button
                        id={`btn-edit-route-${route.id}`}
                        type="button"
                        onClick={() => {
                          onEditRoute(route);
                        }}
                        className="px-2 py-1 rounded-md border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Chỉnh sửa tuyến"
                      >
                        <Edit3 className="w-3 h-3 text-indigo-600" />
                        <span>Sửa</span>
                      </button>
                    )}

                    {/* Toggle Status: Disable vs Restore */}
                    {route.status === 'inactive' ? (
                      <button
                        id={`btn-restore-route-${route.id}`}
                        type="button"
                        onClick={() => onToggleRouteStatus(route.id, 'active')}
                        className="px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Khôi phục tuyến"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-600" />
                        <span>Bật</span>
                      </button>
                    ) : (
                      <button
                        id={`btn-disable-route-${route.id}`}
                        type="button"
                        onClick={() => onToggleRouteStatus(route.id, 'inactive')}
                        className="px-2 py-1 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Tắt tuyến (ẩn khỏi danh sách chọn)"
                      >
                        <PowerOff className="w-3 h-3 text-amber-600" />
                        <span>Tắt</span>
                      </button>
                    )}

                    {/* Delete Route */}
                    {permissions.canDeleteRoute && (
                      <button
                        id={`btn-delete-route-${route.id}`}
                        type="button"
                        onClick={() => setDeleteConfirmRouteId(route.id)}
                        className="px-2 py-1 rounded-md border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Xóa vĩnh viễn tuyến đường này"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {deleteConfirmRouteId && routeToDelete && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-rose-200 animate-in zoom-in-95 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Xác Nhận Xóa Tuyến Đường</h4>
                  <span className="text-xs text-rose-600 font-semibold">Hành động này không thể hoàn tác!</span>
                </div>
              </div>

              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 text-xs space-y-2 text-slate-700">
                <div>
                  Bạn có chắc chắn muốn xóa vĩnh viễn tuyến: <strong>"{routeToDelete.name}"</strong>?
                </div>
                {pointsOnRouteToDelete > 0 && (
                  <div className="text-rose-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Cảnh báo: Hiện có {pointsOnRouteToDelete} điểm GPS thuộc tuyến này.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmRouteId(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  id="btn-confirm-delete-route"
                  type="button"
                  onClick={() => {
                    onDeleteRoute(deleteConfirmRouteId);
                    setDeleteConfirmRouteId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác Nhận Xóa Tuyến</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span>
              Đang hoạt động: <strong>{activeRoutes.length}</strong> tuyến • Đã vô hiệu: <strong>{inactiveRoutes.length}</strong> tuyến
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
