import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Phone, 
  User, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  PlusCircle, 
  Eye, 
  Waves, 
  Navigation,
  Building2,
  Anchor,
  Truck,
  Utensils,
  Store,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { LocationPoint, RouteItem, UserRole, getRolePermissions } from '../types';

interface SidebarProps {
  currentRoute: RouteItem;
  points: LocationPoint[];
  selectedPointId: string | null;
  onSelectPoint: (point: LocationPoint) => void;
  onEditPoint: (point: LocationPoint) => void;
  onDeletePoint: (pointId: string) => void;
  onOpenNewPointModal: () => void;
  userRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  points,
  selectedPointId,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  onOpenNewPointModal,
  userRole,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [confirmDeletePointId, setConfirmDeletePointId] = useState<string | null>(null);

  const permissions = getRolePermissions(userRole);

  // Get distinct categories from points
  const categories = useMemo(() => {
    const set = new Set<string>();
    points.forEach(p => set.add(p.category));
    return Array.from(set);
  }, [points]);

  // Filter points based on search and filters
  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone.includes(searchTerm) ||
        (p.address && p.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'all' || p.status === selectedStatus;

      return matchSearch && matchCat && matchStatus;
    });
  }, [points, searchTerm, selectedCategory, selectedStatus]);

  // Stats
  const activeCount = points.filter(p => p.status === 'Đang hoạt động').length;
  const pendingCount = points.length - activeCount;

  const getCategoryIcon = (category: string) => {
    if (category.includes('Bến cảng') || category.includes('Cảng')) {
      return <Anchor className="w-3.5 h-3.5 text-cyan-600" />;
    }
    if (category.includes('Bãi') || category.includes('vật liệu')) {
      return <Truck className="w-3.5 h-3.5 text-amber-600" />;
    }
    if (category.includes('Nhà hàng') || category.includes('Kem') || category.includes('cà phê')) {
      return <Utensils className="w-3.5 h-3.5 text-rose-600" />;
    }
    return <Store className="w-3.5 h-3.5 text-indigo-600" />;
  };

  return (
    <aside 
      id="sidebar-panel" 
      className={`relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-20 shadow-lg md:shadow-none ${
        isCollapsed ? 'w-12 min-w-[48px]' : 'w-full sm:w-96 min-w-[320px] max-w-sm'
      }`}
    >
      {/* Collapse / Expand Toggle Button */}
      <button
        id="btn-toggle-sidebar"
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Mở rộng bảng điều khiển' : 'Thu nhỏ bảng điều khiển'}
        className="absolute -right-3.5 top-5 z-30 w-7 h-7 bg-white border border-slate-300 rounded-full shadow-md flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>

      {isCollapsed ? (
        /* Minimized State */
        <div className="flex flex-col items-center py-4 space-y-4 text-slate-400">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            {currentRoute.type === 'river' ? <Waves className="w-4 h-4 text-cyan-600" /> : <Navigation className="w-4 h-4 text-emerald-600" />}
          </div>
          <span className="[writing-mode:vertical-rl] text-xs font-bold text-slate-600 tracking-wider">
            {points.length} ĐỊA ĐIỂM
          </span>
          {permissions.canCreatePoint && (
            <button
              onClick={onOpenNewPointModal}
              title="Thêm điểm GPS mới"
              className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center cursor-pointer"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block" />
            </button>
          )}
        </div>
      ) : (
        /* Full Expanded Sidebar */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Route Info Header */}
          <div className="p-4 bg-slate-50/80 border-b border-slate-200">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                currentRoute.type === 'river'
                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {currentRoute.type === 'river' ? <Waves className="w-3 h-3" /> : <Navigation className="w-3 h-3" />}
                {currentRoute.type === 'river' ? 'Tuyến Đường Thủy Sông' : 'Tuyến Phố Đô Thị'}
              </span>

              <span className="text-[11px] font-semibold text-slate-500">
                {currentRoute.province}
              </span>
            </div>

            <h2 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
              {currentRoute.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {currentRoute.description}
            </p>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/80 text-center">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="block text-xs font-bold text-slate-900">{points.length}</span>
                <span className="text-[10px] text-slate-500">Tổng điểm</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="block text-xs font-bold text-emerald-600">{activeCount}</span>
                <span className="text-[10px] text-slate-500">Hoạt động</span>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="block text-xs font-bold text-amber-600">{pendingCount}</span>
                <span className="text-[10px] text-slate-500">Cần xử lý</span>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Section */}
          <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-locations-input"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên, chủ sở hữu, số ĐT..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({points.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Points List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {filteredPoints.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400">
                <MapPin className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium">Không tìm thấy địa điểm phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Thử đổi từ khóa tìm kiếm hoặc nhấn nút Thêm Điểm GPS.
                </p>
                {permissions.canCreatePoint && (
                  <button
                    onClick={onOpenNewPointModal}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-2xs inline-block shrink-0" />
                    <span>Nhập điểm mới</span>
                  </button>
                )}
              </div>
            ) : (
              filteredPoints.map((point) => {
                const isSelected = selectedPointId === point.id;
                return (
                  <div
                    key={point.id}
                    id={`point-card-${point.id}`}
                    onClick={() => onSelectPoint(point)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs' 
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-2xs shrink-0 ring-1 ring-slate-200" title="Chấm điểm quản lý"></span>
                        <span className="p-1 rounded-md bg-slate-100">
                          {getCategoryIcon(point.category)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {point.category}
                        </span>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        point.status === 'Đang hoạt động'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : point.status === 'Tạm ngừng'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {point.status}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {point.name}
                    </h3>

                    <div className="mt-1.5 space-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="line-clamp-1 font-medium">{point.owner}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <a 
                          href={`tel:${point.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          {point.phone}
                        </a>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>GPS: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}</span>
                      </div>
                    </div>

                    {/* Bottom action row: Edit, Delete based on RBAC permissions */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5" />
                        Nhấp để xem trên bản đồ
                      </span>

                      {(permissions.canEditPoint || permissions.canDeletePoint) ? (
                        <div className="flex items-center gap-1">
                          {confirmDeletePointId === point.id ? (
                            <div
                              className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-rose-700 font-bold">Xóa?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeletePoint(point.id);
                                  setConfirmDeletePointId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 text-white rounded font-bold hover:bg-rose-700 cursor-pointer text-[10px]"
                              >
                                Có
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeletePointId(null);
                                }}
                                className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold hover:bg-slate-300 cursor-pointer text-[10px]"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <>
                              {permissions.canEditPoint && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditPoint(point);
                                  }}
                                  title="Sửa thông tin điểm"
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {permissions.canDeletePoint && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeletePointId(point.id);
                                  }}
                                  title="Xóa địa điểm"
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Chế độ chỉ xem
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer of sidebar: Add Point CTA */}
          {permissions.canCreatePoint && (
            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                id="btn-sidebar-add-point"
                onClick={onOpenNewPointModal}
                className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0" />
                <span>Nhập Điểm GPS Cho Tuyến Này</span>
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
