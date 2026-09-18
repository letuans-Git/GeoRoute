import React, { useState, useRef, useEffect } from 'react';
import { 
  Navigation, 
  Waves, 
  MapPin, 
  PlusCircle, 
  ShieldCheck, 
  Download, 
  Layers, 
  Sparkles, 
  Users, 
  LogOut, 
  User as UserIcon, 
  ChevronDown, 
  Shield, 
  Info, 
  SlidersHorizontal, 
  Edit3, 
  Trash2,
  Cloud,
  RefreshCw,
  Globe
} from 'lucide-react';
import { RouteItem, UserAccount, EffectivePermissions, getUserEffectivePermissions } from '../types';

interface HeaderProps {
  routes: RouteItem[];
  currentRouteId: string;
  onSelectRoute: (id: string) => void;
  onEditCurrentRoute?: () => void;
  onDeleteCurrentRoute?: (routeId: string) => void;
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSwitchUser: (user: UserAccount) => void;
  onOpenNewPointModal: () => void;
  onOpenNewRouteModal: () => void;
  onOpenRouteManagementModal: () => void;
  onOpenDataModal: () => void;
  onOpenUserManagementModal: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  onLocateMe: () => void;
  isLocating: boolean;
  onOpenRouteInfo: () => void;
  currentPermissions?: EffectivePermissions;
  isCloudConnected?: boolean;
  isSyncing?: boolean;
  onForceCloudSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  routes,
  currentRouteId,
  onSelectRoute,
  onEditCurrentRoute,
  onDeleteCurrentRoute,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenNewPointModal,
  onOpenNewRouteModal,
  onOpenRouteManagementModal,
  onOpenDataModal,
  onOpenUserManagementModal,
  onOpenProfileModal,
  onLogout,
  onLocateMe,
  isLocating,
  onOpenRouteInfo,
  currentPermissions,
  isCloudConnected = true,
  isSyncing = false,
  onForceCloudSync,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; right: number }>({ top: 65, right: 8 });

  const handleToggleUserMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUserMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const rightOffset = Math.max(8, window.innerWidth - rect.right);
      setMenuCoords({
        top: Math.round(rect.bottom + 6),
        right: Math.round(rightOffset),
      });
    }
    setIsUserMenuOpen(prev => !prev);
  };

  // Đóng popover khi cuộn trang, đổi kích thước cửa sổ hoặc nhấn phím ESC
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleClose = () => setIsUserMenuOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsUserMenuOpen(false);
    };
    window.addEventListener('resize', handleClose);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleClose);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const currentRoute = routes.find(r => r.id === currentRouteId);
  const permissions = currentPermissions || getUserEffectivePermissions(currentUser);
  const canManageRoutes = Boolean(permissions.canCreateRoute || permissions.canEditRoute || permissions.canDeleteRoute);
  
  // Mandatory filter: Deactivated routes must NOT appear in the popup list dropdown
  const activeRoutes = routes.filter((r) => r.status !== 'inactive');

  return (
    <header id="main-header" className="bg-white border-b border-slate-200 sticky top-0 z-[999] shadow-xs">
      {/* Top Banner: Commercial Ownership & Attribution */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-slate-200 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] flex items-center justify-between gap-1 sm:gap-2 border-b border-slate-700">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
          <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] border border-amber-400/30 shrink-0">
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            GIS PRO
          </span>
          <span className="text-slate-300 truncate">
            <span className="hidden sm:inline">Hệ thống Quản lý Tuyến Sông &amp; Tuyến Phố GIS • </span>
            <strong className="text-white">Tuấn Lê Software</strong>
            <span className="hidden md:inline"> • letuans@gmail.com</span>
          </span>
        </div>

        {/* Live Cloud Web App Sync Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isSyncing ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-400" />
              <span>Đang đồng bộ Firestore...</span>
            </span>
          ) : isCloudConnected ? (
            <button
              id="btn-header-cloud-sync"
              type="button"
              onClick={onForceCloudSync}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
              title="Cloud Firestore đã đồng bộ 100%. Bấm để đồng bộ lại toàn bộ dữ liệu ngay lập tức."
            >
              <Globe className="w-2.5 h-2.5 text-emerald-400" />
              <span className="hidden xs:inline">Cloud Firestore 100% (Đồng bộ chung)</span>
              <span className="xs:hidden">Cloud 100%</span>
            </button>
          ) : (
            <button
              id="btn-header-cloud-reconnect"
              type="button"
              onClick={onForceCloudSync}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors cursor-pointer"
              title="Chưa kết nối Cloud Firestore. Bấm để kết nối lại."
            >
              <Cloud className="w-2.5 h-2.5 text-amber-400" />
              <span>Kết nối lại Cloud</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar - Responsive 1-Row Toolbar with Persistent Scrollbar */}
      <div 
        id="header-nav-toolbar"
        className="px-2 sm:px-3 pt-1 sm:pt-1.5 pb-2 sm:pb-1.5 flex items-center justify-between gap-1.5 sm:gap-2.5 w-full overflow-x-auto always-scrollbar min-w-0 select-none"
      >
        {/* Left Group: Logo & Popup list tuyến phố nằm sát Logo */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 py-0.5">
          {/* Logo & Software Name */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
              <Navigation className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap hidden xs:inline">
              GeoRoute
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5 shrink-0 hidden xs:block" />

          {/* Popup list tuyến phố nằm sát với Logo */}
          <div className="relative shrink-0">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-400">
              {currentRoute?.type === 'river' ? (
                <Waves className="w-3.5 h-3.5 text-cyan-600" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <select
              id="route-select-dropdown"
              value={currentRouteId}
              onChange={(e) => {
                if (e.target.value === '__NEW_ROUTE__') {
                  onOpenNewRouteModal();
                } else if (e.target.value === '__MANAGE_ROUTES__') {
                  onOpenRouteManagementModal();
                } else {
                  onSelectRoute(e.target.value);
                }
              }}
              title="Chọn tuyến sông hoặc tuyến phố đang hoạt động"
              className="h-7 pl-6 sm:pl-7 pr-4 sm:pr-6 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer w-[125px] xs:w-[155px] sm:w-[200px] md:w-[260px] lg:w-[310px] truncate"
            >
              {activeRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.isDefault ? '★ ' : ''}
                  {r.type === 'river' ? '🌊 [Sông] ' : '🏙️ [Phố] '}
                  {r.name} {r.province ? `(${r.province})` : ''}
                  {r.isDefault ? ' (Ngầm định)' : ''}
                </option>
              ))}
              {permissions.canCreateRoute && (
                <option value="__NEW_ROUTE__" className="font-semibold text-indigo-600">
                  ➕ Tạo tuyến mới...
                </option>
              )}
              {canManageRoutes && (
                <option value="__MANAGE_ROUTES__" className="font-semibold text-slate-700">
                  ⚙️ Quản lý danh sách tuyến...
                </option>
              )}
            </select>
          </div>

          {/* Nút Thông tin tuyến */}
          <button
            id="btn-header-route-info"
            type="button"
            onClick={onOpenRouteInfo}
            title="Xem thông tin chi tiết và danh sách địa điểm tuyến"
            className="h-7 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Thông Tin</span>
          </button>

          {/* Nút Quản Lý Tuyến (Tạo, Sửa, Xóa, Vô hiệu, Khôi phục) - Chỉ người có quyền quản lý tuyến mới nhìn thấy */}
          {canManageRoutes && (
            <button
              id="btn-header-route-management"
              type="button"
              onClick={onOpenRouteManagementModal}
              title="Quản lý toàn bộ danh sách tuyến (Tạo, Sửa, Xóa, Vô hiệu hóa, Khôi phục)"
              className="h-7 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">Quản Lý Tuyến</span>
            </button>
          )}
        </div>

        {/* Right: Function Buttons (Compact on Mobile & Tablet) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Action: Add Route (RBAC check) */}
          {permissions.canCreateRoute && (
            <button
              id="btn-add-route-header"
              onClick={onOpenNewRouteModal}
              title="Tạo tuyến mới cần quản lý"
              className="h-7 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-md border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs shrink-0 cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3 h-3 text-indigo-600" />
              <span className="hidden lg:inline">Tạo Tuyến</span>
            </button>
          )}

          {/* Action: Add Point (RBAC check) - Always prominent */}
          {permissions.canCreatePoint && (
            <button
              id="btn-add-point-header"
              onClick={onOpenNewPointModal}
              title="Nhập thêm điểm GPS thực địa mới vào tuyến"
              className="h-7 inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 text-xs font-bold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs shrink-0 cursor-pointer whitespace-nowrap"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white shadow-xs inline-block shrink-0" />
              <span>Thêm Điểm</span>
            </button>
          )}

          {/* Locate Me (GPS) */}
          <button
            id="btn-locate-me-header"
            onClick={onLocateMe}
            disabled={isLocating}
            title="Lấy tọa độ GPS tức thời của bạn"
            className="h-7 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs shrink-0 cursor-pointer whitespace-nowrap"
          >
            <MapPin className={`w-3 h-3 text-red-500 ${isLocating ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isLocating ? 'Dò GPS...' : 'GPS'}</span>
          </button>

          {/* Nút Người Dùng (Phân quyền cho từng tài khoản qua canManageUsers) */}
          {permissions.canManageUsers && (
            <button
              id="btn-user-management"
              onClick={onOpenUserManagementModal}
              title="Quản lý Người Dùng & Phân Quyền"
              className="h-7 inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-xs font-semibold rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors shrink-0 cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden lg:inline">Người Dùng</span>
            </button>
          )}

          {/* User Profile Button */}
          <div className="relative shrink-0">
            <button
              id="btn-user-menu-toggle"
              ref={buttonRef}
              type="button"
              onClick={handleToggleUserMenu}
              className={`h-7 flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-md border transition-all cursor-pointer select-none shadow-2xs ${
                isUserMenuOpen 
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-400' 
                  : 'bg-white border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800'
              }`}
              title="Tài khoản & Đăng xuất"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover ring-1 ring-indigo-400 shrink-0"
              />
              <span className="text-[11px] sm:text-xs font-bold truncate max-w-[55px] sm:max-w-[110px]">
                {currentUser.name}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isUserMenuOpen ? 'rotate-180 text-indigo-600' : 'text-slate-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown Menu Sổ Xuống: Tinh gọn, hiển thị chuẩn xác trên Mobile, Tablet, Computer */}
      {isUserMenuOpen && (
        <div className="fixed inset-0 z-[100000] pointer-events-auto">
          {/* Backdrop mờ nhẹ đóng menu khi click ra ngoài */}
          <div 
            id="user-menu-backdrop"
            className="fixed inset-0 bg-slate-950/20 backdrop-blur-[1px] transition-opacity" 
            onClick={() => setIsUserMenuOpen(false)} 
          />

          {/* Popover Tinh Gọn */}
          <div 
            id="user-dropdown-popover"
            style={{
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed w-72 max-w-[calc(100vw-16px)] bg-white border border-slate-200/95 rounded-2xl shadow-2xl z-[100001] py-1.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden select-none"
          >
            {/* 1. Thông Tin Người Dùng (Thu gọn) */}
            <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-400/80 shrink-0 shadow-2xs"
                />
                <div className="min-w-0">
                  <div className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">@{currentUser.username}</div>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${permissions.badgeColor}`}>
                <ShieldCheck className="w-2.5 h-2.5" />
                <span>{permissions.roleName}</span>
              </span>
            </div>

            {/* 2. Các Mục Tác Vụ Chính */}
            <div className="py-1 px-1">
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenProfileModal();
                }}
                className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 rounded-lg text-left flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="font-medium">Hồ sơ cá nhân &amp; Đổi mật khẩu</span>
              </button>

              {permissions.canManageUsers && (
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onOpenUserManagementModal();
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-900 rounded-lg text-left flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span className="font-medium">Quản lý người dùng &amp; Phân quyền</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onOpenDataModal();
                }}
                className="w-full px-2.5 py-1.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-lg text-left flex items-center gap-2.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-medium">Sao lưu &amp; Quản lý dữ liệu</span>
              </button>
            </div>

            {/* 3. Nút Đăng Xuất - Nổi bật & Tinh gọn */}
            <div className="pt-1.5 pb-0.5 border-t border-slate-100 px-2">
              <button
                id="btn-header-logout"
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className="w-full py-1.5 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center justify-center gap-2 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Đăng Xuất Khỏi Hệ Thống</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

