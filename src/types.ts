import { safeStorage } from './utils/storage';

export type UserRole = 'super_admin' | 'admin' | 'route_manager' | 'surveyor' | 'viewer';

// Commercial IAM Granular Permissions (CRUD across resources)
export interface UserPermissions {
  // Tuyến bản đồ GIS (Routes)
  canViewRoute: boolean;       // Xem tuyến
  canCreateRoute: boolean;     // Tạo tuyến mới
  canEditRoute: boolean;       // Sửa cấu hình tuyến
  canDeleteRoute: boolean;     // Xóa tuyến

  // Điểm GPS thực địa & Bến bãi (Points)
  canViewPoint: boolean;       // Xem điểm & tra cứu popup
  canCreatePoint: boolean;     // Tạo điểm GPS mới
  canEditPoint: boolean;       // Sửa điểm GPS
  canDeletePoint: boolean;     // Xóa điểm GPS

  // Dữ liệu & Báo cáo (Data)
  canExportData: boolean;      // Xuất Excel / CSV
  canImportBackup: boolean;    // Sao lưu / Nhập phục hồi JSON

  // Quản trị Hệ thống (System)
  canManageUsers: boolean;     // Quản lý người dùng & phân quyền
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  title: string;
  department?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  // Commercial IAM: Quyền hạn tùy chỉnh riêng biệt cho từng cá nhân
  customPermissions?: UserPermissions;
}

export interface RolePermissionConfig extends UserPermissions {
  role: UserRole;
  roleName: string;
  badgeColor: string;
  description: string;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  super_admin: {
    role: 'super_admin',
    roleName: 'Quản trị viên Tối cao',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Toàn quyền quản lý hệ thống, cấp quyền chi tiết cho từng người dùng, quản lý tuyến và dữ liệu.',
    canViewRoute: true,
    canCreateRoute: true,
    canEditRoute: true,
    canDeleteRoute: true,
    canViewPoint: true,
    canCreatePoint: true,
    canEditPoint: true,
    canDeletePoint: true,
    canExportData: true,
    canImportBackup: true,
    canManageUsers: true,
  },
  admin: {
    role: 'admin',
    roleName: 'Quản trị viên Tối cao',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Toàn quyền quản lý hệ thống, cấp quyền chi tiết cho từng người dùng, quản lý tuyến và dữ liệu.',
    canViewRoute: true,
    canCreateRoute: true,
    canEditRoute: true,
    canDeleteRoute: true,
    canViewPoint: true,
    canCreatePoint: true,
    canEditPoint: true,
    canDeletePoint: true,
    canExportData: true,
    canImportBackup: true,
    canManageUsers: true,
  },
  route_manager: {
    role: 'route_manager',
    roleName: 'Quản lý & Điều hành Tuyến',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Quản lý thông tin tuyến, thêm/sửa/xóa điểm GPS trên tuyến, xuất báo cáo dữ liệu.',
    canViewRoute: true,
    canCreateRoute: true,
    canEditRoute: true,
    canDeleteRoute: false,
    canViewPoint: true,
    canCreatePoint: true,
    canEditPoint: true,
    canDeletePoint: true,
    canExportData: true,
    canImportBackup: false,
    canManageUsers: false,
  },
  surveyor: {
    role: 'surveyor',
    roleName: 'Cán bộ Khảo sát Thực địa',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Khảo sát GPS thực địa, ghi nhận và cập nhật thông tin điểm tại hiện trường.',
    canViewRoute: true,
    canCreateRoute: false,
    canEditRoute: false,
    canDeleteRoute: false,
    canViewPoint: true,
    canCreatePoint: true,
    canEditPoint: true,
    canDeletePoint: false,
    canExportData: true,
    canImportBackup: false,
    canManageUsers: false,
  },
  viewer: {
    role: 'viewer',
    roleName: 'Người xem / Khách tra cứu',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Chỉ xem bản đồ, tra cứu tọa độ và thông tin chi tiết các điểm trên tuyến.',
    canViewRoute: true,
    canCreateRoute: false,
    canEditRoute: false,
    canDeleteRoute: false,
    canViewPoint: true,
    canCreatePoint: false,
    canEditPoint: false,
    canDeletePoint: false,
    canExportData: false,
    canImportBackup: false,
    canManageUsers: false,
  },
};

export const ROLE_PERMISSIONS = DEFAULT_ROLE_PERMISSIONS;

export const loadStoredRolePermissions = (): Record<UserRole, RolePermissionConfig> => {
  try {
    const saved = safeStorage.getItem('georoute_role_permissions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_ROLE_PERMISSIONS,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.error('Error loading stored role permissions:', e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
};

export const saveStoredRolePermissions = (permissions: Record<UserRole, RolePermissionConfig>): void => {
  try {
    safeStorage.setItem('georoute_role_permissions', JSON.stringify(permissions));
  } catch (e) {
    console.error('Error saving role permissions:', e);
  }
};

export const resetStoredRolePermissions = (): Record<UserRole, RolePermissionConfig> => {
  try {
    safeStorage.removeItem('georoute_role_permissions');
  } catch (e) {
    console.error('Error resetting role permissions:', e);
  }
  return DEFAULT_ROLE_PERMISSIONS;
};

export const getRolePermissions = (role: UserRole): RolePermissionConfig => {
  const all = loadStoredRolePermissions();
  return all[role] || all.viewer || DEFAULT_ROLE_PERMISSIONS.viewer;
};

// Effective Permissions Structure for any user
export interface EffectivePermissions extends UserPermissions {
  isCustom: boolean; // whether this user has individual custom overrides
  role: UserRole;
  roleName: string;
  badgeColor: string;
}

// Compute exact effective permissions for an individual user
export const getUserEffectivePermissions = (
  user: UserAccount,
  rolePermissionsMap?: Record<UserRole, RolePermissionConfig>
): EffectivePermissions => {
  const roles = rolePermissionsMap || loadStoredRolePermissions();
  const roleConfig = roles[user.role] || roles.viewer || DEFAULT_ROLE_PERMISSIONS.viewer;
  const isSuper = user.role === 'super_admin' || user.role === 'admin' || user.email === 'letuans@gmail.com';

  if (user.customPermissions) {
    return {
      canViewRoute: user.customPermissions.canViewRoute ?? true,
      canCreateRoute: user.customPermissions.canCreateRoute ?? false,
      canEditRoute: user.customPermissions.canEditRoute ?? false,
      canDeleteRoute: user.customPermissions.canDeleteRoute ?? false,
      canViewPoint: user.customPermissions.canViewPoint ?? true,
      canCreatePoint: user.customPermissions.canCreatePoint ?? false,
      canEditPoint: user.customPermissions.canEditPoint ?? false,
      canDeletePoint: user.customPermissions.canDeletePoint ?? false,
      canExportData: user.customPermissions.canExportData ?? false,
      canImportBackup: user.customPermissions.canImportBackup ?? false,
      canManageUsers: isSuper ? true : (user.customPermissions.canManageUsers ?? false),
      isCustom: true,
      role: user.role,
      roleName: roleConfig.roleName,
      badgeColor: roleConfig.badgeColor,
    };
  }

  return {
    canViewRoute: roleConfig.canViewRoute ?? true,
    canCreateRoute: roleConfig.canCreateRoute,
    canEditRoute: roleConfig.canEditRoute,
    canDeleteRoute: roleConfig.canDeleteRoute,
    canViewPoint: roleConfig.canViewPoint ?? true,
    canCreatePoint: roleConfig.canCreatePoint,
    canEditPoint: roleConfig.canEditPoint,
    canDeletePoint: roleConfig.canDeletePoint,
    canExportData: roleConfig.canExportData,
    canImportBackup: roleConfig.canImportBackup,
    canManageUsers: roleConfig.canManageUsers,
    isCustom: false,
    role: user.role,
    roleName: roleConfig.roleName,
    badgeColor: roleConfig.badgeColor,
  };
};

// Commercial IAM Permission Presets for quick assignment
export interface UserPermissionPreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  permissions: UserPermissions;
}

export const USER_PERMISSION_PRESETS: UserPermissionPreset[] = [
  {
    id: 'full_admin',
    name: 'Toàn Quyền Quản Trị (CRUD Tất Cả)',
    description: 'Toàn quyền Tạo, Sửa, Xóa, Xem trên Tuyến, Điểm GPS, Dữ liệu và Phân quyền người dùng.',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: true,
      canEditRoute: true,
      canDeleteRoute: true,
      canViewPoint: true,
      canCreatePoint: true,
      canEditPoint: true,
      canDeletePoint: true,
      canExportData: true,
      canImportBackup: true,
      canManageUsers: true,
    },
  },
  {
    id: 'manager',
    name: 'Quản Lý Tuyến & Điểm (Tạo - Sửa - Xóa Điểm)',
    description: 'Tạo và sửa tuyến; Tạo, Sửa, Xóa điểm GPS thực địa và xuất báo cáo nghiệp vụ.',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: true,
      canEditRoute: true,
      canDeleteRoute: false,
      canViewPoint: true,
      canCreatePoint: true,
      canEditPoint: true,
      canDeletePoint: true,
      canExportData: true,
      canImportBackup: false,
      canManageUsers: false,
    },
  },
  {
    id: 'surveyor',
    name: 'Khảo Sát Thực Địa (Tạo & Sửa Điểm GPS)',
    description: 'Xem tuyến và điểm; Tạo điểm GPS và Sửa thông tin điểm. Không có quyền xóa.',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: false,
      canEditRoute: false,
      canDeleteRoute: false,
      canViewPoint: true,
      canCreatePoint: true,
      canEditPoint: true,
      canDeletePoint: false,
      canExportData: true,
      canImportBackup: false,
      canManageUsers: false,
    },
  },
  {
    id: 'editor_only',
    name: 'Biên Tập Viên (Chỉ Sửa Thông Tin)',
    description: 'Chỉ được Sửa cấu hình tuyến và điểm hiện có. Không được Tạo mới hoặc Xóa.',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: false,
      canEditRoute: true,
      canDeleteRoute: false,
      canViewPoint: true,
      canCreatePoint: false,
      canEditPoint: true,
      canDeletePoint: false,
      canExportData: true,
      canImportBackup: false,
      canManageUsers: false,
    },
  },
  {
    id: 'user_admin',
    name: 'Quản Trị Người Dùng (Nút Người Dùng & Phân Quyền)',
    description: 'Có quyền mở Nút Người Dùng trên thanh điều hướng, quản lý tài khoản nhân sự và cấp quyền hạn.',
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: false,
      canEditRoute: false,
      canDeleteRoute: false,
      canViewPoint: true,
      canCreatePoint: false,
      canEditPoint: false,
      canDeletePoint: false,
      canExportData: true,
      canImportBackup: false,
      canManageUsers: true,
    },
  },
  {
    id: 'read_only',
    name: 'Chỉ Xem Tra Cứu (Read-Only)',
    description: 'Chỉ Xem bản đồ và thông tin các điểm trên tuyến, cấm tất cả các quyền Tạo, Sửa, Xóa.',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    permissions: {
      canViewRoute: true,
      canCreateRoute: false,
      canEditRoute: false,
      canDeleteRoute: false,
      canViewPoint: true,
      canCreatePoint: false,
      canEditPoint: false,
      canDeletePoint: false,
      canExportData: false,
      canImportBackup: false,
      canManageUsers: false,
    },
  },
];

export interface PermissionFeatureDefinition {
  key: keyof UserPermissions;
  label: string;
  desc: string;
  crudType: 'create' | 'edit' | 'delete' | 'view' | 'manage';
  category: 'Hệ Thống' | 'Tuyến GIS' | 'Điểm Thực Địa' | 'Dữ Liệu';
}

export const PERMISSION_FEATURE_DEFINITIONS: PermissionFeatureDefinition[] = [
  // Tuyến GIS
  {
    key: 'canViewRoute',
    label: 'Xem Tuyến Bản Đồ GIS',
    desc: 'Xem danh sách, thông tin mô tả và tọa độ tuyến sông/phố',
    crudType: 'view',
    category: 'Tuyến GIS',
  },
  {
    key: 'canCreateRoute',
    label: 'Tạo Tuyến sông / Tuyến phố mới',
    desc: 'Tải ảnh nét đỏ Google Maps, định hình tuyến quản lý mới',
    crudType: 'create',
    category: 'Tuyến GIS',
  },
  {
    key: 'canEditRoute',
    label: 'Chỉnh sửa cấu hình tuyến',
    desc: 'Đổi tên, tọa độ trung tâm, mô tả tuyến và cập nhật ảnh bản đồ phủ',
    crudType: 'edit',
    category: 'Tuyến GIS',
  },
  {
    key: 'canDeleteRoute',
    label: 'Xóa Tuyến quản lý',
    desc: 'Hủy bỏ toàn bộ một tuyến sông/phố khỏi cơ sở dữ liệu hệ thống',
    crudType: 'delete',
    category: 'Tuyến GIS',
  },
  // Điểm Thực Địa
  {
    key: 'canViewPoint',
    label: 'Xem Điểm GPS & Tra cứu Popup',
    desc: 'Xem danh sách địa điểm trên tuyến và tra cứu popup thông tin chi tiết',
    crudType: 'view',
    category: 'Điểm Thực Địa',
  },
  {
    key: 'canCreatePoint',
    label: 'Nhập Điểm GPS thực địa mới',
    desc: 'Lấy GPS vệ tinh tại chỗ hoặc click trực tiếp lên bản đồ',
    crudType: 'create',
    category: 'Điểm Thực Địa',
  },
  {
    key: 'canEditPoint',
    label: 'Sửa thông tin Điểm GPS',
    desc: 'Cập nhật chủ cơ sở, số điện thoại, quy mô bến bãi, ghi chú hiện trường',
    crudType: 'edit',
    category: 'Điểm Thực Địa',
  },
  {
    key: 'canDeletePoint',
    label: 'Xóa Điểm GPS thực địa',
    desc: 'Loại bỏ một bến cảng, bãi cát hoặc cơ sở kinh doanh',
    crudType: 'delete',
    category: 'Điểm Thực Địa',
  },
  // Dữ Liệu
  {
    key: 'canExportData',
    label: 'Xuất báo cáo Excel / CSV',
    desc: 'Tải danh sách chi tiết các điểm trên tuyến phục vụ nghiệp vụ',
    crudType: 'manage',
    category: 'Dữ Liệu',
  },
  {
    key: 'canImportBackup',
    label: 'Sao lưu & Khôi phục Dữ liệu (JSON)',
    desc: 'Xuất nhập file JSON sao lưu cơ sở dữ liệu và phục hồi hệ thống',
    crudType: 'manage',
    category: 'Dữ Liệu',
  },
  // Hệ Thống
  {
    key: 'canManageUsers',
    label: 'Nút Người Dùng (Quản lý tài khoản & Phân quyền)',
    desc: 'Hiển thị nút "Người Dùng" trên Header, truy cập danh sách và cấp quyền tài khoản cho từng nhân sự',
    crudType: 'manage',
    category: 'Hệ Thống',
  },
];

export type RouteType = 'river' | 'street';

export interface LocationPoint {
  id: string;
  routeId: string;
  name: string;
  owner: string;
  status: 'Đang hoạt động' | 'Tạm ngừng' | 'Đang cải tạo / xây dựng' | 'Cần kiểm tra định kỳ' | 'Chưa có giấy phép';
  phone: string;
  lat: number;
  lng: number;
  accuracy?: number; // meters
  category: string;
  address?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MapOverlayConfig {
  imageUrl: string;
  fileName: string;
  bounds: [[number, number], [number, number]]; // SW, NE
  opacity: number;
  visible: boolean;
}

export interface RouteStrokeStyle {
  color: string;       // Hex color code (e.g. #dc2626)
  weight: number;      // Width in px (e.g. 3, 6, 10, 14)
  dashArray?: string;  // '' for solid, '8, 8' for dashed, '3, 8' for dotted
  opacity?: number;    // 0.1 - 1.0
  hasGlow?: boolean;   // Glowing aura around line
}

export type RoutePoint = [number, number]; // [lat, lng]
export type RouteSegment = RoutePoint[];    // Array of points in a single segment
export type RoutePolyline = RoutePoint[] | RouteSegment[]; // Single line or multi-segment disconnected lines

export function isMultiSegmentPolyline(poly?: RoutePolyline): poly is RouteSegment[] {
  if (!poly || poly.length === 0) return false;
  return Array.isArray(poly[0]) && Array.isArray(poly[0][0]);
}

export function getSegmentsFromPolyline(poly?: RoutePolyline): RouteSegment[] {
  if (!poly || poly.length === 0) return [];
  if (isMultiSegmentPolyline(poly)) {
    return (poly as RouteSegment[]).filter((seg) => seg && seg.length > 0);
  }
  return [poly as RoutePoint[]].filter((seg) => seg && seg.length > 0);
}

export function getAllPointsFromPolyline(poly?: RoutePolyline): RoutePoint[] {
  if (!poly || poly.length === 0) return [];
  if (isMultiSegmentPolyline(poly)) {
    return (poly as RouteSegment[]).flat();
  }
  return poly as RoutePoint[];
}

export interface RouteItem {
  id: string;
  name: string;
  type: RouteType;
  description: string;
  province: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  polyline: RoutePolyline; // Line coordinates (single line or multi-segment)
  mapOverlay?: MapOverlayConfig;
  strokeStyle?: RouteStrokeStyle;
  bounds?: [[number, number], [number, number]]; // [[southWestLat, southWestLng], [northEastLat, northEastLng]]
  minZoom?: number;
  maxZoom?: number;
  restrictBounds?: boolean;
  mapLayerType?: 'google_hybrid' | 'google_streets' | 'satellite' | 'streets';
  status?: 'active' | 'inactive'; // 'active': visible in popup list; 'inactive': disabled, hidden from popup list
  isDefault?: boolean; // When true, this route is automatically selected and displayed when the app starts up
  createdAt: string;
  updatedAt: string;
}

