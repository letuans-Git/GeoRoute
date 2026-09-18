import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MapComponent } from './components/MapComponent';
import { RouteInfoModal } from './components/RouteInfoModal';
import { PointModal } from './components/PointModal';
import { RouteModal } from './components/RouteModal';
import { RouteManagementModal } from './components/RouteManagementModal';
import { DataManagementModal } from './components/DataManagementModal';
import { LoginView } from './components/LoginView';
import { UserManagementModal } from './components/UserManagementModal';
import { UserProfileModal } from './components/UserProfileModal';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { safeStorage, safeSessionStorage } from './utils/storage';
import { 
  INITIAL_ROUTES, 
  INITIAL_POINTS, 
  INITIAL_USERS 
} from './data/mockData';
import { 
  RouteItem, 
  LocationPoint, 
  UserAccount, 
  UserRole,
  RolePermissionConfig,
  getRolePermissions,
  loadStoredRolePermissions,
  saveStoredRolePermissions,
  resetStoredRolePermissions,
  getUserEffectivePermissions,
  EffectivePermissions,
  getAllPointsFromPolyline
} from './types';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Waves, 
  Navigation,
  ExternalLink
} from 'lucide-react';
import {
  seedFirestoreIfEmpty,
  subscribeCloudUsers,
  subscribeCloudRoutes,
  subscribeCloudPoints,
  subscribeCloudRolePermissions,
  saveCloudRolePermissions,
  syncAllDataToFirestore,
  saveCloudUser,
  deleteCloudUser,
  saveCloudRoute,
  deleteCloudRoute,
  saveCloudPoint,
  deleteCloudPoint,
} from './services/cloudDb';

export default function App() {
  // Enterprise User Accounts State with canonical database synchronization across all devices
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = safeStorage.getItem('georoute_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Khởi tạo map từ INITIAL_USERS chuẩn làm cơ sở dữ liệu gốc
          const userMap = new Map<string, UserAccount>();
          INITIAL_USERS.forEach((u) => {
            userMap.set(u.username.toLowerCase(), { ...u });
          });

          // Hòa trộn và đồng bộ dữ liệu người dùng lưu trên thiết bị
          parsed.forEach((storedUser: UserAccount) => {
            if (!storedUser || !storedUser.username) return;
            const uname = storedUser.username.toLowerCase();
            const initial = userMap.get(uname);
            if (initial) {
              // Cập nhật người dùng chuẩn nhưng đảm bảo password và status active đồng bộ đồng nhất
              userMap.set(uname, {
                ...initial,
                ...storedUser,
                password: storedUser.password?.trim() || initial.password || '123',
                status: storedUser.status || 'active',
                phone: initial.phone || storedUser.phone
              });
            } else {
              // Người dùng được thêm mới bởi quản trị viên
              userMap.set(uname, {
                ...storedUser,
                password: storedUser.password?.trim() || '123',
                status: storedUser.status || 'active'
              });
            }
          });
          return Array.from(userMap.values());
        }
      }
    } catch (e) {
      console.error('Failed to parse georoute_users:', e);
    }
    return INITIAL_USERS;
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    let savedUser = safeStorage.getItem('georoute_current_user');
    if (!savedUser) {
      savedUser = safeSessionStorage.getItem('georoute_session_user');
    }
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object') {
          if (parsed.name === 'Kỹ sư Tuấn Lê') {
            parsed.name = 'Tuấn Lê Software';
          }
          if (parsed.username === 'tuanle' || parsed.phone === '0903 888 999') {
            parsed.phone = '0913.566.532';
          }
          if (!parsed.password) {
            parsed.password = '123';
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = safeStorage.getItem('georoute_is_authenticated');
    if (savedAuth === 'true') return true;
    const sessionAuth = safeSessionStorage.getItem('georoute_session_auth');
    return sessionAuth === 'true';
  });

  // Load and synchronize initial routes ensuring default startup route is strictly respected
  const initialData = useMemo(() => {
    let savedRoutes: RouteItem[] | null = null;
    const rawRoutes = safeStorage.getItem('georoute_routes');
    if (rawRoutes) {
      try {
        savedRoutes = JSON.parse(rawRoutes);
      } catch (e) {
        console.error(e);
      }
    }

    const baseList: RouteItem[] = (savedRoutes && savedRoutes.length > 0) ? savedRoutes : INITIAL_ROUTES;
    const savedDefaultId = safeStorage.getItem('georoute_default_route_id');

    // Determine target default ID
    let targetDefaultId: string | null = null;

    // 1. Explicit saved default ID
    if (savedDefaultId && baseList.some(r => r.id === savedDefaultId)) {
      targetDefaultId = savedDefaultId;
    }

    // 2. Route marked isDefault
    if (!targetDefaultId) {
      const marked = baseList.find(r => r.isDefault);
      if (marked) {
        targetDefaultId = marked.id;
      }
    }

    // 3. Fallback to INITIAL_ROUTES default
    if (!targetDefaultId) {
      const initDefault = INITIAL_ROUTES.find(r => r.isDefault);
      if (initDefault && baseList.some(r => r.id === initDefault.id)) {
        targetDefaultId = initDefault.id;
      }
    }

    // 4. Fallback to first active route or first in list
    if (!targetDefaultId) {
      const firstActive = baseList.find(r => r.status !== 'inactive') || baseList[0];
      targetDefaultId = firstActive.id;
    }

    const normalized = baseList.map(r => ({
      ...r,
      isDefault: r.id === targetDefaultId,
      status: r.id === targetDefaultId ? 'active' : r.status,
    }));

    safeStorage.setItem('georoute_default_route_id', targetDefaultId);

    return {
      routes: normalized,
      defaultRouteId: targetDefaultId,
    };
  }, []);

  // Persistence in localStorage with mock fallbacks
  const [routes, setRoutes] = useState<RouteItem[]>(initialData.routes);

  const [points, setPoints] = useState<LocationPoint[]>(() => {
    const saved = safeStorage.getItem('georoute_points');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_POINTS;
  });

  // Current selected route initialized strictly with the default route upon startup
  const [currentRouteId, setCurrentRouteId] = useState<string>(initialData.defaultRouteId);

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Modals state
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<LocationPoint | null>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isRouteManagementModalOpen, setIsRouteManagementModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isRouteInfoModalOpen, setIsRouteInfoModalOpen] = useState(false);

  // Map interaction state
  const [isPickingLocationOnMap, setIsPickingLocationOnMap] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Toast Notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Real-time Cloud Synchronization (Firestore)
  // Seeds default data if cloud database is empty, then listens for real-time changes
  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);

    seedFirestoreIfEmpty().then(() => {
      if (!mounted) return;
      setIsSyncing(false);
    });

    const unsubUsers = subscribeCloudUsers(
      (cloudUsers) => {
        if (cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
          setIsCloudConnected(true);
        }
      },
      (err) => {
        console.warn('Users cloud sync error:', err);
        setIsCloudConnected(false);
      }
    );

    const unsubRoutes = subscribeCloudRoutes(
      (cloudRoutes) => {
        if (cloudRoutes && cloudRoutes.length > 0) {
          setRoutes(cloudRoutes);
          setIsCloudConnected(true);
        }
      },
      (err) => {
        console.warn('Routes cloud sync error:', err);
        setIsCloudConnected(false);
      }
    );

    const unsubPoints = subscribeCloudPoints(
      (cloudPoints) => {
        if (cloudPoints) {
          setPoints(cloudPoints);
          setIsCloudConnected(true);
        }
      },
      (err) => {
        console.warn('Points cloud sync error:', err);
        setIsCloudConnected(false);
      }
    );

    const unsubRolePerms = subscribeCloudRolePermissions(
      (cloudPerms) => {
        if (cloudPerms) {
          setRolePermissions(cloudPerms);
        }
      },
      (err) => {
        console.warn('Role permissions cloud sync error:', err);
      }
    );

    return () => {
      mounted = false;
      unsubUsers();
      unsubRoutes();
      unsubPoints();
      unsubRolePerms();
    };
  }, []);

  // Persist users, routes & points locally for offline speed
  useEffect(() => {
    safeStorage.setItem('georoute_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeStorage.setItem('georoute_routes', JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    safeStorage.setItem('georoute_points', JSON.stringify(points));
  }, [points]);

  // Enterprise Role Permissions Matrix State
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, RolePermissionConfig>>(() => {
    return loadStoredRolePermissions();
  });

  const currentRoute = useMemo(() => {
    return (
      routes.find((r) => r.id === currentRouteId) ||
      routes.find((r) => r.status !== 'inactive') ||
      routes[0] ||
      INITIAL_ROUTES[0]
    );
  }, [routes, currentRouteId]);

  const currentRoutePoints = useMemo(() => {
    if (!currentRoute || !Array.isArray(points)) return [];
    return points.filter((p) => p && p.routeId === currentRoute.id);
  }, [points, currentRoute]);
  
  // Commercial IAM Effective Permissions (combining role permissions + individual custom permissions)
  const currentPermissions = useMemo(() => {
    return getUserEffectivePermissions(currentUser, rolePermissions);
  }, [currentUser, rolePermissions]);

  // Login handler
  const handleLoginSuccess = (user: UserAccount, rememberMe: boolean = false) => {
    const updatedUser: UserAccount = {
      ...user,
      lastLogin: new Date().toISOString()
    };
    setCurrentUser(updatedUser);
    setIsAuthenticated(true);

    // Update in users collection
    setUsers(prev => {
      const exists = prev.some(u => u.id === user.id);
      if (exists) {
        return prev.map(u => u.id === user.id ? updatedUser : u);
      }
      return [updatedUser, ...prev];
    });

    if (rememberMe) {
      safeStorage.setItem('georoute_is_authenticated', 'true');
      safeStorage.setItem('georoute_current_user', JSON.stringify(updatedUser));
      safeSessionStorage.removeItem('georoute_session_auth');
      safeSessionStorage.removeItem('georoute_session_user');
    } else {
      // Unchecked: chỉ lưu phiên trong session hiện tại, không lưu vĩnh viễn trên trình duyệt
      safeStorage.removeItem('georoute_is_authenticated');
      safeStorage.removeItem('georoute_current_user');
      safeSessionStorage.setItem('georoute_session_auth', 'true');
      safeSessionStorage.setItem('georoute_session_user', JSON.stringify(updatedUser));
    }

    const perms = getUserEffectivePermissions(updatedUser, rolePermissions);
    showToast(`Đăng nhập thành công! Chào mừng ${user.name} (${perms.roleName}${perms.isCustom ? ' - Quyền tùy biến' : ''})`, 'success');
  };

  // Logout handler
  const handleLogout = () => {
    setIsAuthenticated(false);
    safeStorage.removeItem('georoute_is_authenticated');
    safeStorage.removeItem('georoute_current_user');
    safeSessionStorage.removeItem('georoute_session_auth');
    safeSessionStorage.removeItem('georoute_session_user');
    showToast('Đã đăng xuất an toàn khỏi hệ thống!', 'info');
  };

  // Switch Route Handler
  const handleSelectRoute = (routeId: string) => {
    setCurrentRouteId(routeId);
    setSelectedPointId(null);
    const targetRoute = routes.find(r => r.id === routeId);
    if (targetRoute) {
      showToast(`Đã chuyển sang ${targetRoute.name} (${targetRoute.province})`, 'info');
    }
  };

  // Switch User Profile (Fast Switch Demo)
  const handleSwitchUser = (user: UserAccount) => {
    setCurrentUser(user);
    const perms = getUserEffectivePermissions(user, rolePermissions);
    safeStorage.setItem('georoute_current_user', JSON.stringify(user));
    showToast(`Đã chuyển phiên làm việc sang: ${user.name} (${perms.roleName}${perms.isCustom ? ' - Custom IAM' : ''})`, 'info');
  };

  // User Management CRUD Handlers
  const handleAddUser = (newUserData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...newUserData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [newUser, ...prev]);
    saveCloudUser(newUser);
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    saveCloudUser(updatedUser);
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      safeStorage.setItem('georoute_current_user', JSON.stringify(updatedUser));
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    deleteCloudUser(userId);
  };

  const handleBatchUpdateUsers = (updatedUsers: UserAccount[]) => {
    setUsers(updatedUsers);
    updatedUsers.forEach(u => saveCloudUser(u));
    const updatedCurrent = updatedUsers.find(u => u.id === currentUser.id);
    if (updatedCurrent) {
      setCurrentUser(updatedCurrent);
      safeStorage.setItem('georoute_current_user', JSON.stringify(updatedCurrent));
    }
  };

  const handleImportUsers = (newUsers: UserAccount[]) => {
    setUsers(newUsers);
    newUsers.forEach(u => saveCloudUser(u));
    showToast(`Đã nhập thành công ${newUsers.length} tài khoản người dùng!`, 'success');
  };

  // Enterprise Role Permissions Handlers
  const handleSaveRolePermissions = (updatedPermissions: Record<UserRole, RolePermissionConfig>) => {
    setRolePermissions(updatedPermissions);
    saveStoredRolePermissions(updatedPermissions);
    saveCloudRolePermissions(updatedPermissions);
    showToast('Đã lưu cấu hình Ma trận phân quyền (RBAC) lên Cloud thành công! Toàn bộ quyền hạn đã được áp dụng tức thì.', 'success');
  };

  const handleResetRolePermissions = () => {
    const defaults = resetStoredRolePermissions();
    setRolePermissions(defaults);
    saveCloudRolePermissions(defaults);
    showToast('Đã khôi phục ma trận phân quyền về cấu hình mặc định ban đầu của hệ thống & đồng bộ Cloud!', 'info');
  };

  // Real GPS acquisition for header button
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt hoặc thiết bị không hỗ trợ Geolocation GPS.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setIsLocating(false);
        showToast(
          `Đã định vị thành công vị trí GPS của bạn! Sai số ±${Math.round(pos.coords.accuracy)}m`,
          'success'
        );
      },
      (err) => {
        setIsLocating(false);
        showToast(`Không thể lấy vị trí GPS: ${err.message}`, 'error');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Point CRUD Handlers with RBAC Check
  const handleOpenNewPointModal = () => {
    if (!currentPermissions.canCreatePoint) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Tạo Điểm mới!`, 'error');
      return;
    }
    setEditingPoint(null);
    setPickedCoords(null);
    setIsPointModalOpen(true);
  };

  const handleEditPoint = (point: LocationPoint) => {
    if (!currentPermissions.canEditPoint) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Chỉnh Sửa Điểm!`, 'error');
      return;
    }
    setSelectedPointId(point.id);
    setEditingPoint(point);
    setIsPointModalOpen(true);
  };

  const handleDeletePoint = (pointId: string) => {
    if (!currentPermissions.canDeletePoint) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Xóa Điểm này!`, 'error');
      return;
    }
    const pointToDelete = points.find(p => p.id === pointId);
    setPoints(prev => prev.filter(p => p.id !== pointId));
    deleteCloudPoint(pointId);
    if (selectedPointId === pointId) setSelectedPointId(null);
    showToast(`Đã xóa thành công địa điểm "${pointToDelete?.name || ''}"`, 'success');
  };

  const handleSavePoint = (savedData: Partial<LocationPoint>) => {
    if (savedData.id) {
      // Update existing
      const updatedPt = {
        ...(points.find(p => p.id === savedData.id) || {}),
        ...savedData,
        updatedAt: new Date().toISOString(),
      } as LocationPoint;

      setPoints(prev => prev.map(p => (p.id === savedData.id ? updatedPt : p)));
      saveCloudPoint(updatedPt);
      showToast(`Đã cập nhật thành công thông tin "${savedData.name}"`, 'success');
    } else {
      // Create new
      const newPoint: LocationPoint = {
        id: `point-${Date.now()}`,
        routeId: currentRoute.id,
        name: savedData.name || 'Địa điểm mới',
        owner: savedData.owner || 'Chưa cập nhật',
        status: savedData.status || 'Đang hoạt động',
        phone: savedData.phone || '',
        lat: savedData.lat || currentRoute.center[0],
        lng: savedData.lng || currentRoute.center[1],
        accuracy: savedData.accuracy || 3.0,
        category: savedData.category || (currentRoute.type === 'river' ? 'Bến cảng' : 'Cơ sở kinh doanh'),
        address: savedData.address,
        notes: savedData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setPoints(prev => [newPoint, ...prev]);
      saveCloudPoint(newPoint);
      setSelectedPointId(newPoint.id);
      showToast(`Đã lưu thành công địa điểm "${newPoint.name}" vào tuyến!`, 'success');
    }
    setPickedCoords(null);
    setEditingPoint(null);
    setIsPickingLocationOnMap(false);
  };

  // Map coordinate picking flow
  const handleStartPickOnMap = () => {
    setIsPickingLocationOnMap(true);
    showToast('Chế độ chọn trên bản đồ: Vui lòng nhấp chuột vào vị trí cần đánh dấu!', 'info');
  };

  const handleLocationPicked = (lat: number, lng: number) => {
    setPickedCoords({ lat, lng });
    setIsPickingLocationOnMap(false);
    setIsPointModalOpen(true);
    showToast(`Đã ghi nhận tọa độ GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, 'success');
  };

  // Route Handlers with RBAC Check
  const handleOpenNewRouteModal = () => {
    if (!currentPermissions.canCreateRoute) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Tạo Tuyến mới!`, 'error');
      return;
    }
    setEditingRoute(null);
    setIsRouteModalOpen(true);
  };

  const handleEditRoute = (route: RouteItem) => {
    if (!currentPermissions.canEditRoute) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Sửa Tuyến!`, 'error');
      return;
    }
    setEditingRoute(route);
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = (savedRoute: RouteItem) => {
    const existingIndex = routes.findIndex(r => r.id === savedRoute.id);
    const existingRoute = existingIndex >= 0 ? routes[existingIndex] : null;
    if (savedRoute.isDefault) {
      safeStorage.setItem('georoute_default_route_id', savedRoute.id);
    }

    const routeToSave: RouteItem = {
      ...savedRoute,
      status: 'active', // Tuyến vừa tạo/sửa luôn ở trạng thái hoạt động để hiển thị ngay trên bản đồ
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      setRoutes(prev => prev.map(r => {
        if (r.id === routeToSave.id) return routeToSave;
        if (routeToSave.isDefault) return { ...r, isDefault: false };
        return r;
      }));
      saveCloudRoute(routeToSave);
      showToast(`Đã cập nhật và hiển thị ngay bản đồ tuyến "${routeToSave.name}"!`, 'success');
    } else {
      setRoutes(prev => [
        routeToSave,
        ...(routeToSave.isDefault ? prev.map(r => ({ ...r, isDefault: false })) : prev)
      ]);
      saveCloudRoute(routeToSave);
      showToast(`Đã tạo mới và hiển thị ngay bản đồ tuyến "${routeToSave.name}"!`, 'success');
    }

    // Hiển thị ngay lập tức bản đồ của tuyến vừa tạo hoặc vừa sửa
    setCurrentRouteId(routeToSave.id);
    setSelectedPointId(null);
    setEditingRoute(null);
    setIsRouteModalOpen(false);
    setIsRouteManagementModalOpen(false);
  };

  const handleSetDefaultRoute = (routeId: string) => {
    const targetRoute = routes.find(r => r.id === routeId);
    if (!targetRoute) return;

    setRoutes(prev =>
      prev.map(r => ({
        ...r,
        isDefault: r.id === routeId,
        // If it was inactive, restore it to active so it can be viewed on startup
        status: r.id === routeId ? 'active' : r.status,
      }))
    );

    safeStorage.setItem('georoute_default_route_id', routeId);
    showToast(`Đã đặt tuyến "${targetRoute.name}" làm ngầm định khi khởi chạy chương trình!`, 'success');
  };

  const handleToggleRouteStatus = (routeId: string, newStatus: 'active' | 'inactive') => {
    if (!currentPermissions.canEditRoute) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền thay đổi trạng thái tuyến!`, 'error');
      return;
    }
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: newStatus, updatedAt: new Date().toISOString() } : r));
    const target = routes.find(r => r.id === routeId);
    if (target) {
      saveCloudRoute({ ...target, status: newStatus, updatedAt: new Date().toISOString() });
    }
    const statusName = newStatus === 'active' ? 'khôi phục' : 'vô hiệu hóa';
    showToast(`Đã ${statusName} tuyến "${target?.name || routeId}".`, 'info');

    // If current route was deactivated, automatically switch to first remaining active route
    if (newStatus === 'inactive' && currentRouteId === routeId) {
      const remainingActive = routes.filter(r => r.id !== routeId && r.status !== 'inactive');
      if (remainingActive.length > 0) {
        setCurrentRouteId(remainingActive[0].id);
      }
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    if (!currentPermissions.canDeleteRoute) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền Xóa Tuyến!`, 'error');
      return;
    }
    const target = routes.find(r => r.id === routeId);
    if (target?.isDefault || safeStorage.getItem('georoute_default_route_id') === routeId) {
      safeStorage.removeItem('georoute_default_route_id');
    }
    setRoutes(prev => prev.filter(r => r.id !== routeId));
    setPoints(prev => prev.filter(p => p.routeId !== routeId));
    deleteCloudRoute(routeId);
    if (currentRouteId === routeId) {
      const remaining = routes.filter(r => r.id !== routeId && r.status !== 'inactive');
      if (remaining.length > 0) {
        setCurrentRouteId(remaining[0].id);
      } else if (routes.length > 1) {
        setCurrentRouteId(routes.filter(r => r.id !== routeId)[0].id);
      }
    }
    showToast(`Đã xóa hoàn toàn tuyến "${target?.name || routeId}" và các điểm liên quan.`, 'success');
  };

  // User Management Handler with RBAC Check
  const handleOpenUserManagementModal = () => {
    if (!currentPermissions.canManageUsers) {
      showToast(`Tài khoản "${currentUser.name}" (${currentPermissions.roleName}) không có quyền truy cập Nút Người Dùng!`, 'error');
      return;
    }
    setIsUserManagementModalOpen(true);
  };

  // Manual Master Cloud Synchronization Handler
  const handleForceCloudSync = async () => {
    setIsSyncing(true);
    const res = await syncAllDataToFirestore(routes, points, users, rolePermissions);
    setIsSyncing(false);
    if (res.success) {
      showToast(`Đã đồng bộ 100% dữ liệu lên Cloud Firestore thành công! (${res.routesCount} tuyến, ${res.pointsCount} điểm GPS, ${res.usersCount} tài khoản)`, 'success');
    } else {
      showToast(`Lỗi đồng bộ Cloud: ${res.error}`, 'error');
    }
    return res;
  };

  // Data Import / Reset Handlers with 100% Cloud Firestore sync
  const handleImportData = async (importedRoutes: RouteItem[], importedPoints: LocationPoint[]) => {
    setRoutes(importedRoutes);
    setPoints(importedPoints);
    if (importedRoutes.length > 0) {
      setCurrentRouteId(importedRoutes[0].id);
    }
    setIsSyncing(true);
    await syncAllDataToFirestore(importedRoutes, importedPoints, users, rolePermissions);
    setIsSyncing(false);
    showToast('Phục hồi dữ liệu hệ thống & đồng bộ 100% lên Cloud Firestore thành công!', 'success');
  };

  const handleResetDefaultData = async () => {
    setRoutes(INITIAL_ROUTES);
    setPoints(INITIAL_POINTS);
    setCurrentRouteId(INITIAL_ROUTES[0].id);
    setSelectedPointId(null);
    safeStorage.removeItem('georoute_routes');
    safeStorage.removeItem('georoute_points');
    setIsSyncing(true);
    await syncAllDataToFirestore(INITIAL_ROUTES, INITIAL_POINTS, INITIAL_USERS, rolePermissions);
    setIsSyncing(false);
    showToast('Đã khôi phục dữ liệu chuẩn & đồng bộ 100% lên Cloud Firestore!', 'info');
  };

  // Gating check: Must be authenticated to access software
  if (!isAuthenticated) {
    return (
      <LoginView 
        users={users} 
        onLoginSuccess={handleLoginSuccess} 
        onUsersUpdated={(updatedUsers) => setUsers(updatedUsers)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-16 right-4 z-[1000010] px-4 py-3 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-top-4 duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-500' 
            : toast.type === 'error'
            ? 'bg-rose-600 text-white border-rose-500'
            : 'bg-slate-900 text-white border-slate-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Info className="w-4 h-4 shrink-0 text-indigo-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        routes={routes}
        currentRouteId={currentRouteId}
        onSelectRoute={handleSelectRoute}
        onEditCurrentRoute={() => {
          if (currentRoute) {
            handleEditRoute(currentRoute);
          }
        }}
        onDeleteCurrentRoute={handleDeleteRoute}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        onOpenNewPointModal={handleOpenNewPointModal}
        onOpenNewRouteModal={handleOpenNewRouteModal}
        onOpenRouteManagementModal={() => setIsRouteManagementModalOpen(true)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onOpenUserManagementModal={handleOpenUserManagementModal}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        onLocateMe={handleLocateMe}
        isLocating={isLocating}
        onOpenRouteInfo={() => setIsRouteInfoModalOpen(true)}
        currentPermissions={currentPermissions}
        isCloudConnected={isCloudConnected}
        isSyncing={isSyncing}
        onForceCloudSync={handleForceCloudSync}
      />

      {/* Main Screen: Only GIS Interactive Map (Không hiển thị thông tin tuyến phố, người dùng bấm chọn khi cần xem) */}
      <main className="flex-1 relative w-full h-full overflow-hidden">
        <MapComponent
          currentRoute={currentRoute}
          points={currentRoutePoints}
          selectedPointId={selectedPointId}
          editingPointId={editingPoint?.id}
          onSelectPoint={(point) => setSelectedPointId(point ? point.id : null)}
          onEditPoint={handleEditPoint}
          onDeletePoint={handleDeletePoint}
          userRole={currentUser.role}
          userLocation={userLocation}
          isPickingLocation={isPickingLocationOnMap}
          onLocationPicked={handleLocationPicked}
          onOpenRouteInfo={() => setIsRouteInfoModalOpen(true)}
          permissions={currentPermissions}
        />

        {/* Cửa sổ Thông Tin Tuyến Phố & Danh Sách Điểm hiển thị trực tiếp trên bản đồ khi người dùng bấm chọn */}
        <RouteInfoModal
          isOpen={isRouteInfoModalOpen}
          onClose={() => setIsRouteInfoModalOpen(false)}
          currentRoute={currentRoute}
          points={currentRoutePoints}
          selectedPointId={selectedPointId}
          onSelectPoint={(point) => setSelectedPointId(point.id)}
          onEditPoint={handleEditPoint}
          onDeletePoint={handleDeletePoint}
          onOpenNewPointModal={handleOpenNewPointModal}
          userRole={currentUser.role}
          permissions={currentPermissions}
          onEditRoute={handleEditRoute}
          onToggleRouteStatus={handleToggleRouteStatus}
          onDeleteRoute={handleDeleteRoute}
        />

        {/* Các cửa sổ khi xuất hiện hiển thị trực tiếp trên bản đồ (Top-most on Map) */}
        <PointModal
            key={editingPoint ? `edit-${editingPoint.id}` : 'new-point'}
            isOpen={isPointModalOpen}
            onClose={() => {
              setIsPointModalOpen(false);
              setEditingPoint(null);
              setPickedCoords(null);
              setIsPickingLocationOnMap(false);
            }}
            onSavePoint={handleSavePoint}
            currentRoute={currentRoute}
            initialPoint={editingPoint}
            onStartPickOnMap={handleStartPickOnMap}
            pickedCoords={pickedCoords}
            existingPoints={points.filter(p => p.routeId === currentRoute.id)}
            allRoutes={routes}
          />

          {isRouteModalOpen && (
            <RouteModal
              key={editingRoute ? `edit-${editingRoute.id}` : 'new-route'}
              isOpen={isRouteModalOpen}
              onClose={() => {
                setIsRouteModalOpen(false);
                setEditingRoute(null);
              }}
              onSaveRoute={handleSaveRoute}
              initialRoute={editingRoute}
              onDeleteRoute={handleDeleteRoute}
              canDelete={currentPermissions.canDeleteRoute}
            />
          )}

          <RouteManagementModal
            isOpen={isRouteManagementModalOpen}
            onClose={() => setIsRouteManagementModalOpen(false)}
            routes={routes}
            currentRouteId={currentRoute.id}
            points={points}
            onOpenCreateRoute={() => {
              setIsRouteManagementModalOpen(false);
              handleOpenNewRouteModal();
            }}
            onEditRoute={(route) => {
              setIsRouteManagementModalOpen(false);
              handleEditRoute(route);
            }}
            onDeleteRoute={handleDeleteRoute}
            onToggleRouteStatus={handleToggleRouteStatus}
            onSetDefaultRoute={handleSetDefaultRoute}
            onSelectRoute={(routeId) => {
              handleSelectRoute(routeId);
            }}
            permissions={currentPermissions}
          />

          <DataManagementModal
            isOpen={isDataModalOpen}
            onClose={() => setIsDataModalOpen(false)}
            routes={routes}
            points={points}
            currentRoute={currentRoute}
            onImportData={handleImportData}
            onResetDefaultData={handleResetDefaultData}
            permissions={currentPermissions}
            onForceCloudSync={handleForceCloudSync}
            usersCount={users.length}
            isCloudConnected={isCloudConnected}
            isSyncing={isSyncing}
          />

          <UserManagementModal
            isOpen={isUserManagementModalOpen}
            onClose={() => setIsUserManagementModalOpen(false)}
            users={users}
            currentUser={currentUser}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onBatchUpdateUsers={handleBatchUpdateUsers}
            onImportUsers={handleImportUsers}
            rolePermissions={rolePermissions}
            onSaveRolePermissions={handleSaveRolePermissions}
            onResetRolePermissions={handleResetRolePermissions}
            permissions={currentPermissions}
          />

          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUser={currentUser}
            onUpdateProfile={handleUpdateUser}
            onLogout={() => {
              setIsProfileModalOpen(false);
              setIsLogoutConfirmOpen(true);
            }}
          />

          {/* Cửa sổ xác nhận đăng xuất hiển thị trực tiếp trên bản đồ */}
          <LogoutConfirmModal
            isOpen={isLogoutConfirmOpen}
            onClose={() => setIsLogoutConfirmOpen(false)}
            onConfirm={handleLogout}
            currentUser={currentUser}
          />
        </main>

      {/* Bottom Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-4 py-1.5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Hệ thống Bản đồ Sẵn sàng
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Đang quản lý: <strong className="text-slate-800">{routes.length}</strong> tuyến ({points.length} điểm GPS)
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Tài khoản: <strong className="text-indigo-600">
              {currentUser.name}
            </strong> 
            <span className="text-slate-400 font-mono ml-1">({currentPermissions.roleName})</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-600">
            © 2026 Bản quyền sở hữu trí tuệ: <strong>Tuấn Lê Software (letuans@gmail.com)</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}

