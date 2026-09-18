import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  KeyRound, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert,
  Lock, 
  Unlock, 
  Mail, 
  Phone, 
  Building2, 
  Sparkles,
  Check,
  Ban,
  Download,
  Upload,
  Copy,
  Eye,
  ArrowUpDown,
  FileSpreadsheet,
  CheckSquare,
  Square,
  RefreshCw,
  Clock,
  Calendar,
  Briefcase,
  ExternalLink,
  EyeOff,
  Save,
  RotateCcw,
  Sliders,
  HelpCircle,
  Undo2,
  GripHorizontal
} from 'lucide-react';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { 
  UserAccount, 
  UserRole, 
  ROLE_PERMISSIONS, 
  getRolePermissions,
  RolePermissionConfig,
  PERMISSION_FEATURE_DEFINITIONS,
  loadStoredRolePermissions,
  saveStoredRolePermissions,
  resetStoredRolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
  UserPermissions,
  EffectivePermissions,
  getUserEffectivePermissions,
  USER_PERMISSION_PRESETS,
  UserPermissionPreset,
} from '../types';

export const AVATAR_PRESETS = [
  { id: 'av-1', label: 'Nam Kỹ sư 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-2', label: 'Nam Quản lý', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-3', label: 'Nữ Khảo sát', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-4', label: 'Nam Lãnh đạo', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-5', label: 'Nữ Chuyên viên', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-6', label: 'Nam Trắc địa', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-7', label: 'Nữ Kỹ sư', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-8', label: 'Nam Điều hành', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-9', label: 'Nữ Điều phối', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-10', label: 'Nam Hiện trường', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-11', label: 'Nữ Quản trị', url: 'https://images.unsplash.com/photo-1534751516642-a171edd26a0d?w=150&auto=format&fit=crop&q=80' },
  { id: 'av-12', label: 'Nam Đối tác', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' },
];

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onAddUser: (newUser: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onBatchUpdateUsers?: (updatedUsers: UserAccount[]) => void;
  onImportUsers?: (importedUsers: UserAccount[]) => void;
  rolePermissions?: Record<UserRole, RolePermissionConfig>;
  onSaveRolePermissions?: (updatedRolePermissions: Record<UserRole, RolePermissionConfig>) => void;
  onResetRolePermissions?: () => void;
  permissions?: EffectivePermissions;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onBatchUpdateUsers,
  onImportUsers,
  rolePermissions,
  onSaveRolePermissions,
  onResetRolePermissions,
  permissions,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'created_desc' | 'created_asc' | 'login_desc'>('name_asc');

  // Multi-select batch action state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Individual User Permission Modal (Commercial IAM - Cấp quyền Tạo - Sửa - Xóa - Xem cho từng người)
  const [permissionTargetUser, setPermissionTargetUser] = useState<UserAccount | null>(null);
  const [userCustomPermissionsState, setUserCustomPermissionsState] = useState<UserPermissions>({
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
  });
  const [userIsCustomEnabled, setUserIsCustomEnabled] = useState<boolean>(false);
  const [isUserPermissionModalOpen, setIsUserPermissionModalOpen] = useState(false);

  // Batch permission modal
  const [isBatchPermissionModalOpen, setIsBatchPermissionModalOpen] = useState(false);
  const [batchSelectedPresetId, setBatchSelectedPresetId] = useState<string>('surveyor');

  // Sub-modal: Add / Edit
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  // Form fields
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('surveyor');
  const [formTitle, setFormTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formAvatar, setFormAvatar] = useState(AVATAR_PRESETS[0].url);
  const [formError, setFormError] = useState<string | null>(null);

  // Sub-modal: Password Reset
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(true);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sub-modal: User Detail View
  const [detailUser, setDetailUser] = useState<UserAccount | null>(null);

  // Sub-modal: Safe Deletion Confirm
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserAccount | null>(null);
  const [confirmBatchDeleteIds, setConfirmBatchDeleteIds] = useState<string[] | null>(null);
  const [showResetMatrixConfirm, setShowResetMatrixConfirm] = useState(false);

  // Sub-modal: Import JSON Data
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Draggable hooks for main and sub-modals
  const mainDrag = useDraggableModal({ isOpen });
  const formModalDrag = useDraggableModal({ isOpen: isFormModalOpen });
  const passwordModalDrag = useDraggableModal({ isOpen: isPasswordModalOpen });
  const detailModalDrag = useDraggableModal({ isOpen: Boolean(detailUser) });
  const deleteModalDrag = useDraggableModal({ isOpen: Boolean(deleteTargetUser) });
  const importModalDrag = useDraggableModal({ isOpen: isImportModalOpen });
  const userPermissionModalDrag = useDraggableModal({ isOpen: isUserPermissionModalOpen });
  const batchPermissionModalDrag = useDraggableModal({ isOpen: isBatchPermissionModalOpen });

  // Toast feedback
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const currentPermissions = getRolePermissions(currentUser.role);
  const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.email === 'letuans@gmail.com';

  // Enterprise RBAC Matrix State
  const [matrixPermissions, setMatrixPermissions] = useState<Record<UserRole, RolePermissionConfig>>(() => {
    return rolePermissions || loadStoredRolePermissions();
  });
  const [hasMatrixChanges, setHasMatrixChanges] = useState<boolean>(false);
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('all');
  const [matrixSearch, setMatrixSearch] = useState<string>('');

  // Synchronize when modal opens or rolePermissions updates
  useEffect(() => {
    if (isOpen) {
      setMatrixPermissions(rolePermissions || loadStoredRolePermissions());
      setHasMatrixChanges(false);
    }
  }, [isOpen, rolePermissions]);

  // Toggle individual permission cell
  const handleTogglePermission = (
    role: UserRole,
    key: keyof Omit<RolePermissionConfig, 'role' | 'roleName' | 'badgeColor' | 'description'>
  ) => {
    if (!isSuperAdmin) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền sửa đổi ma trận phân quyền!', 'error');
      return;
    }

    // Safety lock: Super Admin canManageUsers cannot be turned off
    if ((role === 'super_admin' || role === 'admin') && key === 'canManageUsers') {
      showFeedback('Bảo vệ hệ thống: Không thể thu hồi quyền Quản lý Người dùng của Quản trị viên Tối cao!', 'error');
      return;
    }

    setMatrixPermissions(prev => {
      const currentVal = prev[role]?.[key] ?? false;
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [key]: !currentVal,
        },
      };
      // Keep admin synced with super_admin
      if (role === 'super_admin' && updated.admin) {
        updated.admin = {
          ...updated.admin,
          [key]: !currentVal,
        };
      }
      return updated;
    });
    setHasMatrixChanges(true);
  };

  // Bulk enable or disable for a specific role column
  const handleSetRoleAllPermissions = (role: UserRole, enabled: boolean) => {
    if (!isSuperAdmin) return;

    setMatrixPermissions(prev => {
      const targetConfig = { ...prev[role] };
      PERMISSION_FEATURE_DEFINITIONS.forEach(def => {
        if ((role === 'super_admin' || role === 'admin') && def.key === 'canManageUsers') {
          targetConfig[def.key] = true; // protect
        } else {
          targetConfig[def.key] = enabled;
        }
      });

      const updated = {
        ...prev,
        [role]: targetConfig,
      };
      if (role === 'super_admin' && updated.admin) {
        updated.admin = { ...targetConfig, role: 'admin' };
      }
      return updated;
    });
    setHasMatrixChanges(true);
    showFeedback(
      enabled 
        ? `Đã cấp tất cả quyền cho vai trò ${ROLE_PERMISSIONS[role]?.roleName || role}. Bấm 'Lưu Ma Trận' để kích hoạt!`
        : `Đã thu hồi tất cả quyền của vai trò ${ROLE_PERMISSIONS[role]?.roleName || role}. Bấm 'Lưu Ma Trận' để kích hoạt!`,
      'info'
    );
  };

  // Save Matrix Handler
  const handleSaveMatrix = () => {
    if (!isSuperAdmin) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền lưu ma trận phân quyền!', 'error');
      return;
    }

    saveStoredRolePermissions(matrixPermissions);
    if (onSaveRolePermissions) {
      onSaveRolePermissions(matrixPermissions);
    }
    setHasMatrixChanges(false);
    showFeedback('Đã lưu ma trận phân quyền (RBAC) thành công! Toàn bộ quyền hạn mới đã được kích hoạt trên toàn hệ thống.', 'success');
  };

  // Discard Unsaved Changes Handler
  const handleDiscardMatrixChanges = () => {
    const loaded = rolePermissions || loadStoredRolePermissions();
    setMatrixPermissions(loaded);
    setHasMatrixChanges(false);
    showFeedback('Đã hủy bỏ toàn bộ các thay đổi chưa lưu trên ma trận phân quyền.', 'info');
  };

  // Reset to System Default Handler
  const handleResetMatrixToDefault = () => {
    if (!isSuperAdmin) return;
    setShowResetMatrixConfirm(true);
  };

  const executeResetMatrixToDefault = () => {
    setShowResetMatrixConfirm(false);
    const defaults = resetStoredRolePermissions();
    setMatrixPermissions(defaults);
    if (onResetRolePermissions) {
      onResetRolePermissions();
    } else if (onSaveRolePermissions) {
      onSaveRolePermissions(defaults);
    }
    setHasMatrixChanges(false);
    showFeedback('Đã khôi phục ma trận phân quyền về mặc định ban đầu thành công!', 'success');
  };

  // --- Commercial IAM Handlers for Individual User Permissions ---
  // Open individual user permission dialog
  const handleOpenUserPermission = (user: UserAccount) => {
    setPermissionTargetUser(user);
    const effective = getUserEffectivePermissions(user, matrixPermissions);
    setUserIsCustomEnabled(!!user.customPermissions);
    setUserCustomPermissionsState({
      canViewRoute: effective.canViewRoute,
      canCreateRoute: effective.canCreateRoute,
      canEditRoute: effective.canEditRoute,
      canDeleteRoute: effective.canDeleteRoute,
      canViewPoint: effective.canViewPoint,
      canCreatePoint: effective.canCreatePoint,
      canEditPoint: effective.canEditPoint,
      canDeletePoint: effective.canDeletePoint,
      canExportData: effective.canExportData,
      canImportBackup: effective.canImportBackup,
      canManageUsers: effective.canManageUsers,
    });
    setIsUserPermissionModalOpen(true);
  };

  // Toggle permission flag for the targeted user
  const handleToggleUserPermissionFlag = (key: keyof UserPermissions) => {
    if (!permissionTargetUser) return;
    const isTargetSuper = permissionTargetUser.role === 'super_admin' || permissionTargetUser.role === 'admin' || permissionTargetUser.email === 'letuans@gmail.com';
    if (key === 'canManageUsers' && isTargetSuper) {
      showFeedback('Bảo vệ hệ thống: Không thể thu hồi quyền Quản lý Người dùng của Quản trị viên Tối cao!', 'error');
      return;
    }
    setUserCustomPermissionsState(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setUserIsCustomEnabled(true);
  };

  // Apply a standard preset to the targeted user
  const handleApplyUserPreset = (preset: UserPermissionPreset) => {
    setUserCustomPermissionsState({ ...preset.permissions });
    setUserIsCustomEnabled(true);
    showFeedback(`Đã áp dụng mẫu phân quyền: "${preset.name}"`, 'info');
  };

  // Bulk enable / disable all flags for targeted user
  const handleSetUserAllPermissions = (enable: boolean) => {
    if (!permissionTargetUser) return;
    const isTargetSuper = permissionTargetUser.role === 'super_admin' || permissionTargetUser.role === 'admin' || permissionTargetUser.email === 'letuans@gmail.com';
    setUserCustomPermissionsState({
      canViewRoute: enable,
      canCreateRoute: enable,
      canEditRoute: enable,
      canDeleteRoute: enable,
      canViewPoint: enable,
      canCreatePoint: enable,
      canEditPoint: enable,
      canDeletePoint: enable,
      canExportData: enable,
      canImportBackup: enable,
      canManageUsers: isTargetSuper ? true : enable,
    });
    setUserIsCustomEnabled(true);
  };

  // Reset to role default
  const handleResetUserToRoleDefault = () => {
    if (!permissionTargetUser) return;
    const roleConfig = matrixPermissions[permissionTargetUser.role] || matrixPermissions.viewer || DEFAULT_ROLE_PERMISSIONS.viewer;
    setUserCustomPermissionsState({
      canViewRoute: roleConfig.canViewRoute,
      canCreateRoute: roleConfig.canCreateRoute,
      canEditRoute: roleConfig.canEditRoute,
      canDeleteRoute: roleConfig.canDeleteRoute,
      canViewPoint: roleConfig.canViewPoint,
      canCreatePoint: roleConfig.canCreatePoint,
      canEditPoint: roleConfig.canEditPoint,
      canDeletePoint: roleConfig.canDeletePoint,
      canExportData: roleConfig.canExportData,
      canImportBackup: roleConfig.canImportBackup,
      canManageUsers: roleConfig.canManageUsers,
    });
    setUserIsCustomEnabled(false);
    showFeedback(`Đã chuyển sang dùng quyền mặc định theo vai trò ${roleConfig.roleName}`, 'info');
  };

  // Save individual user permissions
  const handleSaveUserPermissions = () => {
    if (!permissionTargetUser) return;
    const updated: UserAccount = {
      ...permissionTargetUser,
      customPermissions: userIsCustomEnabled ? userCustomPermissionsState : undefined,
    };
    onUpdateUser(updated);
    setIsUserPermissionModalOpen(false);
    showFeedback(
      userIsCustomEnabled
        ? `Đã lưu thành công phân quyền riêng biệt cho ${permissionTargetUser.name}!`
        : `Đã khôi phục phân quyền theo vai trò mặc định cho ${permissionTargetUser.name}!`,
      'success'
    );
  };

  // Apply batch preset to all selected users
  const handleBatchApplyPreset = (preset: UserPermissionPreset) => {
    if (selectedUserIds.length === 0) return;
    const updatedUsers = users.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return {
          ...u,
          customPermissions: { ...preset.permissions },
        };
      }
      return u;
    });
    if (onBatchUpdateUsers) {
      onBatchUpdateUsers(updatedUsers);
    } else {
      updatedUsers.forEach(u => {
        if (selectedUserIds.includes(u.id)) onUpdateUser(u);
      });
    }
    setIsBatchPermissionModalOpen(false);
    const count = selectedUserIds.length;
    setSelectedUserIds([]);
    showFeedback(`Đã cấp quyền "${preset.name}" cho ${count} tài khoản được chọn!`, 'success');
  };

  // Filtered permission features
  const filteredPermissionFeatures = useMemo(() => {
    return PERMISSION_FEATURE_DEFINITIONS.filter(feature => {
      const matchCategory = matrixCategoryFilter === 'all' || feature.category === matrixCategoryFilter;
      const matchSearch = 
        feature.label.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        feature.desc.toLowerCase().includes(matrixSearch.toLowerCase()) ||
        feature.category.toLowerCase().includes(matrixSearch.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [matrixCategoryFilter, matrixSearch]);

  // Filtered and Sorted Users
  const processedUsers = useMemo(() => {
    let result = users.filter(u => {
      const matchSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm)) ||
        (u.title && u.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (u.department && u.department.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchRole = filterRole === 'all' || u.role === filterRole;
      const matchStatus = filterStatus === 'all' || u.status === filterStatus;

      return matchSearch && matchRole && matchStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'vi');
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'vi');
      if (sortBy === 'created_desc') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortBy === 'created_asc') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortBy === 'login_desc') {
        const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });

    return result;
  }, [users, searchTerm, filterRole, filterStatus, sortBy]);

  if (!isOpen) return null;

  // Open Form to Add
  const handleOpenAdd = () => {
    if (!isSuperAdmin) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền thêm người dùng!', 'error');
      return;
    }
    setEditingUser(null);
    setFormUsername('');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('123');
    setFormRole('surveyor');
    setFormTitle('Cán bộ Khảo sát Thực địa');
    setFormDepartment('Đội Khảo Sát Hiện Trường');
    setFormStatus('active');
    setFormAvatar(AVATAR_PRESETS[(users.length % AVATAR_PRESETS.length)].url);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form to Edit
  const handleOpenEdit = (user: UserAccount) => {
    if (!isSuperAdmin && currentUser.id !== user.id) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền sửa tài khoản khác!', 'error');
      return;
    }
    setEditingUser(user);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPhone(user.phone || '');
    setFormPassword(user.password || '');
    setFormRole(user.role);
    setFormTitle(user.title || '');
    setFormDepartment(user.department || '');
    setFormStatus(user.status);
    setFormAvatar(user.avatar || AVATAR_PRESETS[0].url);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Save Add / Edit
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formUsername.trim()) {
      setFormError('Vui lòng nhập Tên đăng nhập!');
      return;
    }
    if (!formName.trim()) {
      setFormError('Vui lòng nhập Họ và tên!');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Vui lòng nhập Email hợp lệ!');
      return;
    }

    // Check duplicate username or email
    const duplicate = users.find(u => 
      u.id !== editingUser?.id && 
      (u.username.toLowerCase() === formUsername.trim().toLowerCase() ||
       u.email.toLowerCase() === formEmail.trim().toLowerCase())
    );

    if (duplicate) {
      setFormError('Tên đăng nhập hoặc Email này đã tồn tại trong hệ thống!');
      return;
    }

    if (editingUser) {
      // Prevent demoting the primary owner
      if (editingUser.email === 'letuans@gmail.com' && formRole !== 'super_admin') {
        setFormError('Không thể hạ quyền Quản trị viên Tối cao của chủ sở hữu hệ thống Tuấn Lê Software!');
        return;
      }

      onUpdateUser({
        ...editingUser,
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole,
        title: formTitle.trim(),
        department: formDepartment.trim(),
        status: formStatus,
        avatar: formAvatar,
        password: formPassword || editingUser.password,
      });
      showFeedback(`Đã cập nhật thành công hồ sơ của "${formName.trim()}"!`, 'success');
    } else {
      onAddUser({
        username: formUsername.trim().toLowerCase(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        phone: formPhone.trim(),
        role: formRole,
        title: formTitle.trim() || getRolePermissions(formRole).roleName,
        department: formDepartment.trim() || 'Phòng Kỹ Thuật GIS',
        status: formStatus,
        password: formPassword.trim() || '123',
        avatar: formAvatar,
      });
      showFeedback(`Đã tạo thành công tài khoản mới cho "${formName.trim()}"!`, 'success');
    }

    setIsFormModalOpen(false);
  };

  // Toggle Active / Inactive
  const handleToggleStatus = (user: UserAccount) => {
    if (!isSuperAdmin) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền khóa/mở khóa tài khoản!', 'error');
      return;
    }

    if (user.email === 'letuans@gmail.com') {
      showFeedback('Không thể khóa tài khoản Chủ sở hữu hệ thống Tuấn Lê Software!', 'error');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    onUpdateUser({
      ...user,
      status: nextStatus,
    });
    showFeedback(
      nextStatus === 'active' 
        ? `Đã mở khóa tài khoản của ${user.name}` 
        : `Đã tạm khóa tài khoản của ${user.name}`,
      nextStatus === 'active' ? 'success' : 'info'
    );
  };

  // Open Safe Delete Dialog
  const handlePromptDelete = (user: UserAccount) => {
    if (!isSuperAdmin) {
      showFeedback('Chỉ Quản trị viên Tối cao mới có quyền xóa tài khoản!', 'error');
      return;
    }
    if (user.email === 'letuans@gmail.com') {
      showFeedback('Không thể xóa tài khoản Chủ sở hữu hệ thống Tuấn Lê Software!', 'error');
      return;
    }
    if (user.id === currentUser.id) {
      showFeedback('Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình!', 'error');
      return;
    }

    setDeleteTargetUser(user);
  };

  const handleConfirmDelete = () => {
    if (deleteTargetUser) {
      onDeleteUser(deleteTargetUser.id);
      setSelectedUserIds(prev => prev.filter(id => id !== deleteTargetUser.id));
      showFeedback(`Đã xóa vĩnh viễn tài khoản "${deleteTargetUser.name}"!`, 'success');
      setDeleteTargetUser(null);
    }
  };

  // Open Password Modal
  const handleOpenPasswordModal = (user: UserAccount) => {
    if (!isSuperAdmin && currentUser.id !== user.id) {
      showFeedback('Bạn không có quyền đặt lại mật khẩu của người dùng khác!', 'error');
      return;
    }
    setPasswordTargetUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordText(true);
    setPasswordError(null);
    setIsPasswordModalOpen(true);
  };

  // Generate random strong password
  const handleGenerateRandomPassword = () => {
    const prefixes = ['Geo', 'Gps', 'Route', 'Atlas', 'Survey'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['@', '#', '!', '$'];
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const gen = `${prefix}${sym}${num}`;
    setNewPassword(gen);
    setConfirmPassword(gen);
    showFeedback('Đã sinh ngẫu nhiên mật khẩu mạnh!', 'info');
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    showFeedback('Đã sao chép mật khẩu vào bộ nhớ tạm!', 'success');
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setPasswordError('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Xác nhận mật khẩu không khớp!');
      return;
    }

    if (passwordTargetUser) {
      onUpdateUser({
        ...passwordTargetUser,
        password: newPassword.trim(),
      });
      showFeedback(`Đã đổi mật khẩu thành công cho tài khoản "${passwordTargetUser.name}"!`, 'success');
      setIsPasswordModalOpen(false);
    }
  };

  // Batch Selection Handlers
  const handleSelectAll = () => {
    if (selectedUserIds.length === processedUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(processedUsers.map(u => u.id));
    }
  };

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Batch Lock
  const handleBatchLock = () => {
    if (!isSuperAdmin) return;
    const targets = users.filter(u => selectedUserIds.includes(u.id) && u.email !== 'letuans@gmail.com');
    if (targets.length === 0) return;

    const updated = users.map(u => {
      if (selectedUserIds.includes(u.id) && u.email !== 'letuans@gmail.com') {
        return { ...u, status: 'inactive' as const };
      }
      return u;
    });

    if (onBatchUpdateUsers) {
      onBatchUpdateUsers(updated);
    } else {
      targets.forEach(u => onUpdateUser({ ...u, status: 'inactive' }));
    }
    showFeedback(`Đã khóa thành công ${targets.length} tài khoản được chọn!`, 'info');
    setSelectedUserIds([]);
  };

  // Batch Unlock
  const handleBatchUnlock = () => {
    if (!isSuperAdmin) return;
    const targets = users.filter(u => selectedUserIds.includes(u.id));
    if (targets.length === 0) return;

    const updated = users.map(u => {
      if (selectedUserIds.includes(u.id)) {
        return { ...u, status: 'active' as const };
      }
      return u;
    });

    if (onBatchUpdateUsers) {
      onBatchUpdateUsers(updated);
    } else {
      targets.forEach(u => onUpdateUser({ ...u, status: 'active' }));
    }
    showFeedback(`Đã kích hoạt mở khóa ${targets.length} tài khoản được chọn!`, 'success');
    setSelectedUserIds([]);
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (!isSuperAdmin) return;
    const deletableIds = selectedUserIds.filter(id => {
      const u = users.find(x => x.id === id);
      return u && u.email !== 'letuans@gmail.com' && u.id !== currentUser.id;
    });

    if (deletableIds.length === 0) {
      showFeedback('Không có tài khoản nào được phép xóa (bảo vệ chủ sở hữu & bản thân)!', 'error');
      return;
    }

    setConfirmBatchDeleteIds(deletableIds);
  };

  const executeBatchDelete = () => {
    if (!confirmBatchDeleteIds) return;
    confirmBatchDeleteIds.forEach(id => onDeleteUser(id));
    setSelectedUserIds([]);
    showFeedback(`Đã xóa thành công ${confirmBatchDeleteIds.length} tài khoản!`, 'success');
    setConfirmBatchDeleteIds(null);
  };

  // Export to CSV (Excel compatible with UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      'Mã Hệ Thống',
      'Tên Đăng Nhập',
      'Họ Và Tên',
      'Email',
      'Số Điện Thoại',
      'Vai Trò',
      'Tên Vai Trò',
      'Chức Danh',
      'Phòng Ban',
      'Trạng Thái',
      'Lần Đăng Nhập Cuối',
      'Ngày Tạo'
    ];

    const rows = users.map(u => {
      const p = getRolePermissions(u.role);
      return [
        `"${u.id}"`,
        `"${u.username}"`,
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.phone || ''}"`,
        `"${u.role}"`,
        `"${p.roleName}"`,
        `"${u.title || ''}"`,
        `"${u.department || ''}"`,
        `"${u.status === 'active' ? 'Đang hoạt động' : 'Đã khóa'}"`,
        `"${u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Chưa đăng nhập'}"`,
        `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : ''}"`
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `GeoRoute_DanhSachNhanSu_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showFeedback('Đã xuất danh sách người dùng ra file Excel/CSV thành công!', 'success');
  };

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(users, null, 2));
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `GeoRoute_Backup_Users_${dateStr}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback('Đã xuất dữ liệu người dùng JSON an toàn!', 'success');
  };

  // Import JSON Users
  const handleProcessImportJSON = () => {
    setImportError(null);
    if (!importJsonText.trim()) {
      setImportError('Vui lòng dán hoặc tải nội dung JSON!');
      return;
    }

    try {
      const parsed = JSON.parse(importJsonText);
      if (!Array.isArray(parsed)) {
        setImportError('Dữ liệu JSON phải là một mảng danh sách các tài khoản người dùng!');
        return;
      }

      // Validate minimal structure
      const validUsers: UserAccount[] = [];
      for (const item of parsed) {
        if (!item.username || !item.name || !item.email || !item.role) {
          setImportError('Một số bản ghi trong file JSON bị thiếu các trường bắt buộc (username, name, email, role)!');
          return;
        }
        validUsers.push({
          id: item.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          username: item.username,
          name: item.name,
          email: item.email,
          phone: item.phone || '',
          password: item.password || '123',
          role: item.role,
          avatar: item.avatar || AVATAR_PRESETS[0].url,
          title: item.title || '',
          department: item.department || '',
          status: item.status || 'active',
          lastLogin: item.lastLogin,
          createdAt: item.createdAt || new Date().toISOString(),
        });
      }

      if (onImportUsers) {
        onImportUsers(validUsers);
      } else if (onBatchUpdateUsers) {
        onBatchUpdateUsers(validUsers);
      }

      showFeedback(`Đã phục hồi thành công ${validUsers.length} tài khoản người dùng!`, 'success');
      setIsImportModalOpen(false);
      setImportJsonText('');
    } catch (err: any) {
      setImportError('Cú pháp JSON không hợp lệ: ' + (err?.message || 'Vui lòng kiểm tra lại'));
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999990] flex items-center justify-center p-0 bg-slate-950/80 backdrop-blur-[2px] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="user-management-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-2xl overflow-hidden my-auto z-[999995] relative flex flex-col animate-in fade-in duration-150"
      >
        {/* Header */}
        <div 
          className="sticky top-0 z-20 px-6 py-4 bg-slate-900 text-white flex items-center justify-between shadow-xs shrink-0 border-b border-slate-800 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Trung Tâm Quản Lý Người Dùng &amp; Phân Quyền</h3>
                <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  RBAC Complete Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Toàn quyền quản trị tài khoản, phân bổ vai trò nghiệp vụ, phân quyền dữ liệu &amp; xuất nhập nhân sự
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
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

        {/* Feedback Alert */}
        {feedback && (
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 border-b border-emerald-200 text-emerald-800' 
              : feedback.type === 'info'
              ? 'bg-blue-50 border-b border-blue-200 text-blue-800'
              : 'bg-rose-50 border-b border-rose-200 text-rose-800'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'users'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Danh Sách Người Dùng ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('permissions')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Ma Trận Phân Quyền (RBAC)</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Nhật Ký &amp; Thống Kê Phiên</span>
            </button>
          </div>

          <div className="flex items-center gap-2 py-2">
            {activeTab === 'users' ? (
              <>
                {/* Export Dropdown / Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportCSV}
                    title="Xuất file Excel / CSV đầy đủ thông tin nhân sự"
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Xuất Excel/CSV</span>
                  </button>
                  
                  <button
                    onClick={handleExportJSON}
                    title="Tải tệp JSON sao lưu nhân sự"
                    className="p-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      title="Nhập dữ liệu người dùng từ file JSON"
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Nhập JSON</span>
                    </button>
                  )}
                </div>

                {/* Add User Button */}
                {isSuperAdmin && (
                  <button
                    id="btn-open-add-user"
                    onClick={handleOpenAdd}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ml-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Thêm Người Dùng</span>
                  </button>
                )}
              </>
            ) : activeTab === 'permissions' ? (
              <div className="flex items-center gap-2">
                {hasMatrixChanges && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>Chưa lưu</span>
                  </span>
                )}
                {isSuperAdmin && (
                  <>
                    {hasMatrixChanges && (
                      <button
                        onClick={handleDiscardMatrixChanges}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                        title="Hủy bỏ thay đổi chưa lưu"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Hủy</span>
                      </button>
                    )}
                    <button
                      onClick={handleResetMatrixToDefault}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                      title="Khôi phục ma trận phân quyền về mặc định ban đầu"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden md:inline">Mặc Định</span>
                    </button>
                    <button
                      id="btn-tab-save-matrix"
                      onClick={handleSaveMatrix}
                      className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                        hasMatrixChanges 
                          ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-1 scale-105' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="Lưu ma trận phân quyền cho toàn hệ thống"
                    >
                      <Save className="w-4 h-4" />
                      <span>{hasMatrixChanges ? 'Lưu Ma Trận (Đang Chờ)' : 'Lưu Ma Trận'}</span>
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Tab 1: Users Directory */}
        {activeTab === 'users' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Tổng Người Dùng</span>
                <span className="text-xl font-bold text-slate-900">{users.length} tài khoản</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[11px] font-semibold text-purple-700 block">Quản Trị Tối Cao</span>
                <span className="text-xl font-bold text-purple-900">
                  {users.filter(u => u.role === 'super_admin' || u.role === 'admin').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[11px] font-semibold text-blue-700 block">Quản Lý Tuyến &amp; Khảo Sát</span>
                <span className="text-xl font-bold text-blue-900">
                  {users.filter(u => u.role === 'route_manager' || u.role === 'surveyor').length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-semibold text-emerald-700 block">Đang Kích Hoạt</span>
                <span className="text-xl font-bold text-emerald-900">
                  {users.filter(u => u.status === 'active').length} hoạt động
                </span>
              </div>
            </div>

            {/* Filter, Search & Sort Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên, email, tài khoản, SĐT..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc:</span>
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="super_admin">Quản trị viên Tối cao</option>
                  <option value="route_manager">Quản lý Tuyến</option>
                  <option value="surveyor">Khảo sát Thực địa</option>
                  <option value="viewer">Khách xem tra cứu</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã khóa</option>
                </select>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Xếp:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700"
                >
                  <option value="name_asc">Tên A-Z</option>
                  <option value="name_desc">Tên Z-A</option>
                  <option value="created_desc">Mới tạo nhất</option>
                  <option value="created_asc">Cũ nhất</option>
                  <option value="login_desc">Đăng nhập gần nhất</option>
                </select>
              </div>
            </div>

            {/* Batch Action Floating Bar */}
            {selectedUserIds.length > 0 && isSuperAdmin && (
              <div className="bg-indigo-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  <span>Đã chọn <strong>{selectedUserIds.length}</strong> tài khoản:</span>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <button
                    onClick={() => setIsBatchPermissionModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-white transition-colors flex items-center gap-1 shadow-xs"
                    title="Cấp quyền hàng loạt cho các người dùng được chọn"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Cấp quyền ({selectedUserIds.length})</span>
                  </button>

                  <button
                    onClick={handleBatchUnlock}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition-colors flex items-center gap-1"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>Mở khóa</span>
                  </button>

                  <button
                    onClick={handleBatchLock}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 font-bold text-white transition-colors flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Khóa tài khoản</span>
                  </button>

                  <button
                    onClick={handleBatchDelete}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-white transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa đã chọn</span>
                  </button>

                  <button
                    onClick={() => setSelectedUserIds([])}
                    className="px-2 py-1 rounded-lg bg-indigo-800 hover:bg-indigo-700 text-slate-300 hover:text-white transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      {isSuperAdmin && (
                        <th className="py-3 px-3 w-8 text-center">
                          <button 
                            onClick={handleSelectAll}
                            className="text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            {selectedUserIds.length === processedUsers.length && processedUsers.length > 0 ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="py-3 px-4">Người dùng</th>
                      <th className="py-3 px-3">Tài khoản &amp; Email</th>
                      <th className="py-3 px-3">Vai trò &amp; Quyền hạn</th>
                      <th className="py-3 px-3">Phòng ban</th>
                      <th className="py-3 px-3 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={isSuperAdmin ? 7 : 6} className="py-8 text-center text-slate-400 italic">
                          Không tìm thấy người dùng phù hợp với bộ lọc tìm kiếm.
                        </td>
                      </tr>
                    ) : (
                      processedUsers.map((user) => {
                        const perm = getRolePermissions(user.role);
                        const effPerm = getUserEffectivePermissions(user, matrixPermissions);
                        const hasCustom = !!user.customPermissions;
                        const isOwner = user.email === 'letuans@gmail.com';
                        const isCurrent = user.id === currentUser.id;
                        const isSelected = selectedUserIds.includes(user.id);

                        return (
                          <tr 
                            key={user.id} 
                            className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'}`}
                          >
                            {isSuperAdmin && (
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleToggleSelectUser(user.id)}
                                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>
                            )}

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setDetailUser(user)}
                                  title="Bấm để xem chi tiết hồ sơ"
                                  className="relative group shrink-0"
                                >
                                  <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-indigo-500 transition-all"
                                  />
                                  <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                </button>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      onClick={() => setDetailUser(user)}
                                      className="font-bold text-slate-900 hover:text-indigo-600 text-left transition-colors"
                                    >
                                      {user.name}
                                    </button>
                                    {isOwner && (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                                        CHỦ SỞ HỮU
                                      </span>
                                    )}
                                    {isCurrent && (
                                      <span className="bg-indigo-100 text-indigo-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                                        BẠN
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500 line-clamp-1 block">
                                    {user.title}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-mono text-slate-800 font-semibold text-[11px]">
                                @{user.username}
                              </div>
                              <div className="text-slate-500 text-[11px] flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="text-slate-400 text-[10px] flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{user.phone}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] border ${perm.badgeColor}`}>
                                  <ShieldCheck className="w-3 h-3 shrink-0" />
                                  <span>{perm.roleName}</span>
                                </span>
                                {hasCustom ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Tài khoản này được cấp quyền riêng biệt">
                                    <Sliders className="w-2.5 h-2.5 text-amber-700" />
                                    <span>Quyền riêng</span>
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400">Theo vai trò</span>
                                )}
                              </div>
                              {/* CRUD Status Badges */}
                              <div className="flex items-center gap-1 mt-1.5">
                                <span 
                                  title={effPerm.canCreatePoint || effPerm.canCreateRoute ? "Có quyền Tạo" : "Không có quyền Tạo"}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    effPerm.canCreatePoint || effPerm.canCreateRoute 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  Tạo
                                </span>
                                <span 
                                  title={effPerm.canEditPoint || effPerm.canEditRoute ? "Có quyền Sửa" : "Không có quyền Sửa"}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    effPerm.canEditPoint || effPerm.canEditRoute 
                                      ? 'bg-blue-100 text-blue-800' 
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  Sửa
                                </span>
                                <span 
                                  title={effPerm.canDeletePoint || effPerm.canDeleteRoute ? "Có quyền Xóa" : "Không có quyền Xóa"}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    effPerm.canDeletePoint || effPerm.canDeleteRoute 
                                      ? 'bg-rose-100 text-rose-800' 
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  Xóa
                                </span>
                                <span 
                                  title={effPerm.canViewPoint || effPerm.canViewRoute ? "Có quyền Xem" : "Không có quyền Xem"}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    effPerm.canViewPoint || effPerm.canViewRoute 
                                      ? 'bg-purple-100 text-purple-800' 
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  Xem
                                </span>
                                <span 
                                  title={effPerm.canManageUsers ? "Có quyền Nút Người Dùng (Quản lý tài khoản & phân quyền)" : "Không có quyền Nút Người Dùng"}
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    effPerm.canManageUsers 
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                      : 'bg-slate-100 text-slate-400 line-through'
                                  }`}
                                >
                                  Nút User
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-slate-600 text-[11px]">
                              {user.department || 'Ban Kỹ thuật'}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => handleToggleStatus(user)}
                                disabled={isOwner || !isSuperAdmin}
                                title={isOwner ? 'Không thể khóa chủ sở hữu' : !isSuperAdmin ? 'Chỉ Quản trị viên mới được đổi trạng thái' : 'Bấm để đổi trạng thái hoạt động'}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                  user.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                                } ${isOwner || !isSuperAdmin ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
                              >
                                {user.status === 'active' ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Hoạt động</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span>Đã khóa</span>
                                  </>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handleOpenUserPermission(user)}
                                    title="Cấp và phân bổ quyền chi tiết Tạo - Sửa - Xóa - Xem cho người dùng này"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-[11px] border border-indigo-200 transition-all shadow-2xs cursor-pointer mr-0.5"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>Phân quyền</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setDetailUser(user)}
                                  title="Xem chi tiết hồ sơ"
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {(isSuperAdmin || isCurrent) && (
                                  <button
                                    onClick={() => handleOpenPasswordModal(user)}
                                    title="Đổi mật khẩu"
                                    className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-500 hover:text-amber-700 transition-colors"
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </button>
                                )}

                                {(isSuperAdmin || isCurrent) && (
                                  <button
                                    onClick={() => handleOpenEdit(user)}
                                    title="Chỉnh sửa thông tin"
                                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                )}

                                {isSuperAdmin && (
                                  <button
                                    onClick={() => handlePromptDelete(user)}
                                    disabled={isOwner || isCurrent}
                                    title={isOwner ? 'Không thể xóa chủ sở hữu' : isCurrent ? 'Không thể xóa chính bạn' : 'Xóa tài khoản'}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isOwner || isCurrent 
                                        ? 'text-slate-300 cursor-not-allowed' 
                                        : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                    }`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Permission Matrix */}
        {activeTab === 'permissions' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Super Admin Top Control & Notice Banner */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isSuperAdmin 
                ? 'bg-gradient-to-r from-purple-50/80 via-indigo-50/60 to-blue-50/80 border-indigo-200 text-indigo-950 shadow-2xs' 
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${isSuperAdmin ? 'bg-indigo-600 text-white shadow-xs' : 'bg-amber-600 text-white'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm">
                        Ma Trận Phân Quyền Vai Trò (Enterprise RBAC)
                      </h3>
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          Quản Trị Tối Cao: Được Phép Sửa &amp; Lưu
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Lock className="w-3 h-3 text-amber-700" />
                          Chế Độ Chỉ Đọc
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {isSuperAdmin 
                        ? 'Nhấp trực tiếp vào từng ô Cho phép / Cấm để hiệu chỉnh quyền hạn. Bấm "Lưu Ma Trận" để kích hoạt tức thì cho toàn bộ các tài khoản.' 
                        : 'Bạn đang xem cấu hình phân quyền ở chế độ tra cứu. Chỉ Quản trị viên Tối cao mới có quyền sửa đổi và lưu ma trận.'}
                    </p>
                  </div>
                </div>

                {/* Super Admin Quick Action Buttons */}
                {isSuperAdmin && (
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {hasMatrixChanges && (
                      <button
                        onClick={handleDiscardMatrixChanges}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                        title="Hủy các thay đổi chưa lưu"
                      >
                        <Undo2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Hủy Thay Đổi</span>
                      </button>
                    )}
                    <button
                      onClick={handleResetMatrixToDefault}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                      title="Khôi phục phân quyền về mặc định ban đầu"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="hidden md:inline">Khôi Phục Mặc Định</span>
                    </button>
                    <button
                      id="btn-save-permissions-matrix"
                      onClick={handleSaveMatrix}
                      className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all ${
                        hasMatrixChanges 
                          ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-2 scale-105 animate-pulse' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                      title="Lưu các thay đổi phân quyền"
                    >
                      <Save className="w-4 h-4" />
                      <span>{hasMatrixChanges ? 'Lưu Ma Trận (Đang Chờ)' : 'Lưu Ma Trận'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 shrink-0 mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Nhóm:</span>
                </span>
                {[
                  { id: 'all', label: 'Tất Cả' },
                  { id: 'Hệ Thống', label: 'Hệ Thống' },
                  { id: 'Tuyến GIS', label: 'Tuyến GIS' },
                  { id: 'Điểm Thực Địa', label: 'Điểm Thực Địa' },
                  { id: 'Dữ Liệu', label: 'Dữ Liệu & Báo Cáo' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMatrixCategoryFilter(cat.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      matrixCategoryFilter === cat.id 
                        ? 'bg-indigo-600 text-white shadow-2xs' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder="Lọc tính năng & quyền hạn..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                {matrixSearch && (
                  <button
                    onClick={() => setMatrixSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 w-[34%] min-w-[220px]">
                        <span>Tính Năng &amp; Quyền Hạn ({filteredPermissionFeatures.length})</span>
                      </th>
                      
                      {/* Super Admin Column Header */}
                      <th className="py-3 px-2 text-center text-purple-800 bg-purple-50/50 min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-[11px]">Quản trị Tối cao</span>
                          <span className="text-[9px] text-purple-600 font-normal lowercase">super_admin</span>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => handleSetRoleAllPermissions('super_admin', true)}
                                className="px-1.5 py-0.5 rounded bg-purple-200/70 hover:bg-purple-300 text-purple-900 text-[9px] font-semibold transition-colors"
                                title="Cấp toàn bộ quyền cho Quản trị viên Tối cao"
                              >
                                Cấp hết
                              </button>
                            </div>
                          )}
                        </div>
                      </th>

                      {/* Route Manager Column Header */}
                      <th className="py-3 px-2 text-center text-blue-800 bg-blue-50/50 min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-[11px]">Quản lý Tuyến</span>
                          <span className="text-[9px] text-blue-600 font-normal lowercase">route_manager</span>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => handleSetRoleAllPermissions('route_manager', true)}
                                className="px-1.5 py-0.5 rounded bg-blue-200/70 hover:bg-blue-300 text-blue-900 text-[9px] font-semibold transition-colors"
                                title="Cấp tất cả quyền cho Quản lý Tuyến"
                              >
                                Bật hết
                              </button>
                              <button
                                onClick={() => handleSetRoleAllPermissions('route_manager', false)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-semibold transition-colors"
                                title="Thu hồi tất cả quyền của Quản lý Tuyến"
                              >
                                Tắt hết
                              </button>
                            </div>
                          )}
                        </div>
                      </th>

                      {/* Surveyor Column Header */}
                      <th className="py-3 px-2 text-center text-emerald-800 bg-emerald-50/50 min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-[11px]">Khảo sát Thực địa</span>
                          <span className="text-[9px] text-emerald-600 font-normal lowercase">surveyor</span>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => handleSetRoleAllPermissions('surveyor', true)}
                                className="px-1.5 py-0.5 rounded bg-emerald-200/70 hover:bg-emerald-300 text-emerald-900 text-[9px] font-semibold transition-colors"
                                title="Cấp tất cả quyền cho Cán bộ Khảo sát"
                              >
                                Bật hết
                              </button>
                              <button
                                onClick={() => handleSetRoleAllPermissions('surveyor', false)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-semibold transition-colors"
                                title="Thu hồi tất cả quyền của Cán bộ Khảo sát"
                              >
                                Tắt hết
                              </button>
                            </div>
                          )}
                        </div>
                      </th>

                      {/* Viewer Column Header */}
                      <th className="py-3 px-2 text-center text-slate-700 bg-slate-50/80 min-w-[130px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-extrabold text-[11px]">Khách xem tra cứu</span>
                          <span className="text-[9px] text-slate-500 font-normal lowercase">viewer</span>
                          {isSuperAdmin && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                onClick={() => handleSetRoleAllPermissions('viewer', true)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[9px] font-semibold transition-colors"
                                title="Cấp tất cả quyền cho Khách xem"
                              >
                                Bật hết
                              </button>
                              <button
                                onClick={() => handleSetRoleAllPermissions('viewer', false)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-semibold transition-colors"
                                title="Thu hồi tất cả quyền của Khách xem"
                              >
                                Tắt hết
                              </button>
                            </div>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPermissionFeatures.map((feat) => {
                      const saVal = matrixPermissions.super_admin?.[feat.key] ?? false;
                      const rmVal = matrixPermissions.route_manager?.[feat.key] ?? false;
                      const svVal = matrixPermissions.surveyor?.[feat.key] ?? false;
                      const viVal = matrixPermissions.viewer?.[feat.key] ?? false;

                      const categoryBadgeColor = 
                        feat.category === 'Hệ Thống' ? 'bg-purple-100 text-purple-700' :
                        feat.category === 'Tuyến GIS' ? 'bg-blue-100 text-blue-700' :
                        feat.category === 'Điểm Thực Địa' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-amber-100 text-amber-800';

                      return (
                        <tr key={feat.key} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${categoryBadgeColor}`}>
                                {feat.category}
                              </span>
                              <span className="font-bold text-slate-900">{feat.label}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block leading-snug">{feat.desc}</span>
                          </td>

                          {/* Super Admin Cell */}
                          <td className="py-2.5 px-3 text-center bg-purple-50/20">
                            {feat.key === 'canManageUsers' ? (
                              <span 
                                title="Bảo vệ nòng cốt: Quyền Quản lý Người dùng của Quản trị viên Tối cao luôn được duy trì an toàn"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 cursor-not-allowed select-none"
                              >
                                <Lock className="w-3 h-3 text-purple-700" />
                                <span>Cố định</span>
                              </span>
                            ) : isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission('super_admin', feat.key)}
                                title={`Bấm để ${saVal ? 'CẤM' : 'CHO PHÉP'} quyền "${feat.label}" cho Quản trị viên Tối cao`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 ${
                                  saVal 
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {saVal ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5 text-rose-500" />}
                                <span>{saVal ? 'Cho phép' : 'Cấm'}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                saVal ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {saVal ? <Check className="w-3.5 h-3.5 font-bold" /> : <X className="w-3.5 h-3.5" />}
                                <span>{saVal ? 'Cho phép' : 'Cấm'}</span>
                              </span>
                            )}
                          </td>

                          {/* Route Manager Cell */}
                          <td className="py-2.5 px-3 text-center bg-blue-50/20">
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission('route_manager', feat.key)}
                                title={`Bấm để ${rmVal ? 'CẤM' : 'CHO PHÉP'} quyền "${feat.label}" cho Quản lý Tuyến`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 ${
                                  rmVal 
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {rmVal ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5 text-rose-500" />}
                                <span>{rmVal ? 'Cho phép' : 'Cấm'}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                rmVal ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {rmVal ? <Check className="w-3.5 h-3.5 font-bold" /> : <X className="w-3.5 h-3.5" />}
                                <span>{rmVal ? 'Cho phép' : 'Cấm'}</span>
                              </span>
                            )}
                          </td>

                          {/* Surveyor Cell */}
                          <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission('surveyor', feat.key)}
                                title={`Bấm để ${svVal ? 'CẤM' : 'CHO PHÉP'} quyền "${feat.label}" cho Cán bộ Khảo sát`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 ${
                                  svVal 
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {svVal ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5 text-rose-500" />}
                                <span>{svVal ? 'Cho phép' : 'Cấm'}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                svVal ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {svVal ? <Check className="w-3.5 h-3.5 font-bold" /> : <X className="w-3.5 h-3.5" />}
                                <span>{svVal ? 'Cho phép' : 'Cấm'}</span>
                              </span>
                            )}
                          </td>

                          {/* Viewer Cell */}
                          <td className="py-2.5 px-3 text-center bg-slate-50/50">
                            {isSuperAdmin ? (
                              <button
                                type="button"
                                onClick={() => handleTogglePermission('viewer', feat.key)}
                                title={`Bấm để ${viVal ? 'CẤM' : 'CHO PHÉP'} quyền "${feat.label}" cho Khách xem tra cứu`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-2xs active:scale-95 ${
                                  viVal 
                                    ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {viVal ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Ban className="w-3.5 h-3.5 text-rose-500" />}
                                <span>{viVal ? 'Cho phép' : 'Cấm'}</span>
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                viVal ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {viVal ? <Check className="w-3.5 h-3.5 font-bold" /> : <X className="w-3.5 h-3.5" />}
                                <span>{viVal ? 'Cho phép' : 'Cấm'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Standard Base Capability Row */}
                    <tr className="bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                            Tiêu Chuẩn
                          </span>
                          <span className="font-bold text-slate-900">Xem Bản đồ GIS, định vị GPS &amp; Tra cứu</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block leading-snug">
                          Chuyển đổi Vệ tinh / Đường bộ, tìm kiếm địa danh và xem popup thông tin chi tiết các điểm
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-purple-50/20">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5 font-bold" /> Cho phép
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-blue-50/20">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5 font-bold" /> Cho phép
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-emerald-50/20">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5 font-bold" /> Cho phép
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center bg-slate-50/50">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5 font-bold" /> Cho phép
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Floating Bar when changes exist */}
            {hasMatrixChanges && isSuperAdmin && (
              <div className="p-4 bg-emerald-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  <span className="font-bold text-emerald-100">
                    Bạn có các thay đổi phân quyền chưa lưu!
                  </span>
                  <span className="text-emerald-300 hidden md:inline">
                    (Bấm "Lưu Ma Trận Phân Quyền" để cập nhật ngay lập tức)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDiscardMatrixChanges}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-slate-200 text-xs font-semibold transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleSaveMatrix}
                    className="px-4 py-1.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-4 h-4 text-emerald-700" />
                    <span>Lưu Ma Trận Phân Quyền Ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audit & Sessions */}
        {activeTab === 'audit' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Nhật Ký Phiên &amp; Hoạt Động Tài Khoản</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Theo dõi thời điểm đăng nhập thực tế gần nhất của từng cán bộ nhân sự để kiểm soát an toàn bảo mật dữ liệu GPS.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Cán bộ / Nhân sự</th>
                    <th className="py-3 px-3">Vai trò</th>
                    <th className="py-3 px-3">Lần đăng nhập cuối</th>
                    <th className="py-3 px-3">Ngày kích hoạt</th>
                    <th className="py-3 px-3 text-center">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const perm = getRolePermissions(u.role);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                            <div>
                              <span className="font-bold text-slate-900 block">{u.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${perm.badgeColor}`}>
                            {perm.roleName}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString('vi-VN') : 'Chưa có lượt đăng nhập'}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Khởi tạo hệ thống'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Hệ thống phân quyền bản quyền của <strong>Tuấn Lê Software (letuans@gmail.com)</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition-colors"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>

      {/* Sub-modal: Add / Edit User Form */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div 
            style={formModalDrag.dragStyle}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col z-[1000005] relative"
          >
            <div 
              {...formModalDrag.headerProps}
              className={`px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 ${formModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold">
                  {editingUser ? `Chỉnh Sửa Hồ Sơ: ${editingUser.name}` : 'Thêm Tài Khoản Người Dùng Mới'}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Avatar Preset Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn Ảnh Đại Diện (Avatar)
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={formAvatar}
                    alt="Preview avatar"
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-indigo-500 shadow-md shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="url"
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      placeholder="Hoặc dán URL ảnh đại diện tùy chọn..."
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Bấm chọn ảnh mẫu bên dưới hoặc dán đường dẫn ảnh hợp lệ
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormAvatar(p.url)}
                      title={p.label}
                      className={`relative rounded-full overflow-hidden transition-all aspect-square ${
                        formAvatar === p.url ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      {formAvatar === p.url && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="ví dụ: tuanha"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="ví dụ: Nguyễn Văn A"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vai trò phân quyền <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="super_admin">Quản trị viên Tối cao (Super Admin) - Toàn quyền quản trị</option>
                  <option value="route_manager">Quản lý &amp; Điều hành Tuyến - Tạo tuyến, Sửa, Xóa điểm</option>
                  <option value="surveyor">Cán bộ Khảo sát Thực địa - Nhập GPS, Cập nhật thông tin</option>
                  <option value="viewer">Người xem / Khách hàng Tra cứu - Chỉ xem dữ liệu</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {getRolePermissions(formRole).description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chức danh / Vị trí
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="ví dụ: Kỹ thuật viên hiện trường"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phòng ban / Đơn vị
                  </label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="ví dụ: Đội khảo sát 1"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mặc định: 123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái tài khoản
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                    />
                    <span>Kích hoạt (Hoạt động bình thường)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                    />
                    <span>Khóa (Chặn đăng nhập)</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: Reset Password */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div 
            style={passwordModalDrag.dragStyle}
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative"
          >
            <div 
              {...passwordModalDrag.headerProps}
              className={`px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between ${passwordModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold">Đặt Lại Mật Khẩu</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSavePassword} className="p-5 space-y-3.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                <img src={passwordTargetUser.avatar} alt={passwordTargetUser.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                <div>
                  <span className="font-bold text-xs text-slate-900 block">{passwordTargetUser.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">@{passwordTargetUser.username}</span>
                </div>
              </div>

              {passwordError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* Quick Generator & Copy tool */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tạo ngẫu nhiên mật khẩu mạnh</span>
                </button>

                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs"
                >
                  Xác Nhận Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: User Detail View */}
      {detailUser && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div 
            style={detailModalDrag.dragStyle}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative"
          >
            <div 
              {...detailModalDrag.headerProps}
              className={`px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between ${detailModalDrag.headerProps.className}`}
            >
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Hồ Sơ Nhân Sự Chi Tiết</span>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setDetailUser(null)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={detailUser.avatar}
                  alt={detailUser.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-100 shadow-md shrink-0"
                />
                <div>
                  <h4 className="text-base font-bold text-slate-900">{detailUser.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">@{detailUser.username}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRolePermissions(detailUser.role).badgeColor}`}>
                      <ShieldCheck className="w-3 h-3" />
                      {getRolePermissions(detailUser.role).roleName}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      detailUser.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {detailUser.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email:</span>
                  </span>
                  <a href={`mailto:${detailUser.email}`} className="font-semibold text-indigo-600 hover:underline">{detailUser.email}</a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Số điện thoại:</span>
                  </span>
                  <span className="font-semibold text-slate-800">{detailUser.phone || 'Chưa cung cấp'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>Chức danh:</span>
                  </span>
                  <span className="font-semibold text-slate-800">{detailUser.title || 'Nhân sự'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phòng ban:</span>
                  </span>
                  <span className="font-semibold text-slate-800">{detailUser.department || 'Đội kỹ thuật'}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ngày tham gia:</span>
                  </span>
                  <span className="font-mono text-slate-600">
                    {detailUser.createdAt ? new Date(detailUser.createdAt).toLocaleDateString('vi-VN') : 'Khởi tạo'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Đăng nhập gần nhất:</span>
                  </span>
                  <span className="font-mono text-slate-600">
                    {detailUser.lastLogin ? new Date(detailUser.lastLogin).toLocaleString('vi-VN') : 'Chưa có lượt đăng nhập'}
                  </span>
                </div>
              </div>

              {/* Role description card */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 block">Quyền Hạn Hiện Có (Effective Rights):</span>
                  {detailUser.customPermissions ? (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Quyền riêng biệt
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Mặc định theo vai trò
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                  {(() => {
                    const eff = getUserEffectivePermissions(detailUser, matrixPermissions);
                    return (
                      <>
                        <div className={`flex items-center gap-1.5 ${eff.canCreateRoute || eff.canCreatePoint ? 'text-emerald-700 font-semibold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Tạo mới (Tuyến/Điểm)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${eff.canEditRoute || eff.canEditPoint ? 'text-blue-700 font-semibold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Chỉnh sửa (Tuyến/Điểm)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${eff.canDeleteRoute || eff.canDeletePoint ? 'text-rose-700 font-semibold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Xóa bỏ (Tuyến/Điểm)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${eff.canViewRoute || eff.canViewPoint ? 'text-purple-700 font-semibold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Xem tra cứu bản đồ</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${eff.canExportData ? 'text-amber-700 font-semibold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Xuất báo cáo Excel</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${eff.canManageUsers ? 'text-purple-700 font-bold' : 'text-slate-400 line-through'}`}>
                          <Check className="w-3 h-3" />
                          <span>Quyền Nút Người Dùng &amp; Quản trị IAM</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons inside detail view */}
              <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      const u = detailUser;
                      setDetailUser(null);
                      handleOpenUserPermission(u);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Phân Quyền</span>
                  </button>
                )}

                {(isSuperAdmin || detailUser.id === currentUser.id) && (
                  <button
                    onClick={() => {
                      const u = detailUser;
                      setDetailUser(null);
                      handleOpenPasswordModal(u);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                    <span>Đổi Mật Khẩu</span>
                  </button>
                )}

                {(isSuperAdmin || detailUser.id === currentUser.id) && (
                  <button
                    onClick={() => {
                      const u = detailUser;
                      setDetailUser(null);
                      handleOpenEdit(u);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1 shadow-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sửa Hồ Sơ</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Safe Delete Confirmation Dialog */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div 
            style={deleteModalDrag.dragStyle}
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative"
          >
            <div 
              {...deleteModalDrag.headerProps}
              className={`px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 ${deleteModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">Xác Nhận Xóa Tài Khoản</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setDeleteTargetUser(null)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 shadow-inner">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Xác Nhận Xóa Tài Khoản</h3>
              <p className="text-xs text-slate-600 mb-4">
                Hành động này sẽ xóa vĩnh viễn quyền truy cập của người dùng khỏi hệ thống GeoRoute Pro và không thể hoàn tác.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-5 flex items-center gap-3 text-left">
                <img
                  src={deleteTargetUser.avatar}
                  alt={deleteTargetUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-300 shrink-0"
                />
                <div className="overflow-hidden">
                  <div className="font-bold text-xs text-slate-900 truncate">{deleteTargetUser.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{deleteTargetUser.email}</div>
                  <div className="text-[10px] text-indigo-600 font-semibold">{getRolePermissions(deleteTargetUser.role).roleName}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteTargetUser(null)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xác Nhận Xóa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Batch Deletion Confirmation */}
      {confirmBatchDeleteIds && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">Xác Nhận Xóa Hàng Loạt</span>
              </div>
              <button 
                type="button"
                onClick={() => setConfirmBatchDeleteIds(null)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3 shadow-inner">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Xóa {confirmBatchDeleteIds.length} Tài Khoản</h3>
              <p className="text-xs text-slate-600 mb-5">
                Bạn có chắc chắn muốn xóa vĩnh viễn {confirmBatchDeleteIds.length} tài khoản đã chọn khỏi hệ thống? Hành động này không thể hoàn tác.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmBatchDeleteIds(null)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={executeBatchDelete}
                  className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xác Nhận Xóa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Reset Matrix Confirmation */}
      {showResetMatrixConfirm && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">Khôi Phục Phân Quyền</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowResetMatrixConfirm(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-3 shadow-inner">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Khôi Phục Mặc Định</h3>
              <p className="text-xs text-slate-600 mb-5">
                Bạn có chắc chắn muốn khôi phục ma trận phân quyền về cấu hình mặc định ban đầu của hệ thống? Các tùy chỉnh hiện tại sẽ được thay thế.
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowResetMatrixConfirm(false)}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={executeResetMatrixToDefault}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Khôi Phục</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Import JSON Data */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div 
            style={importModalDrag.dragStyle}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh] z-[1000005] relative"
          >
            <div 
              {...importModalDrag.headerProps}
              className={`px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 ${importModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold">Nhập Danh Sách Người Dùng Từ File JSON</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsImportModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tải lên tệp sao lưu JSON hoặc dán chuỗi JSON danh sách tài khoản người dùng để phục hồi hoặc đồng bộ dữ liệu:
              </p>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn tệp JSON từ máy tính:
                </label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        setImportJsonText(content);
                      };
                      reader.readAsText(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hoặc dán nội dung JSON:
                </label>
                <textarea
                  rows={8}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="[{ 'username': 'tuanle', 'name': 'Tuấn Lê', ... }]"
                  className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleProcessImportJSON}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>Xác Nhận Nhập Dữ Liệu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Phân Quyền Chi Tiết Cho Từng Người Dùng (Commercial IAM) */}
      {isUserPermissionModalOpen && permissionTargetUser && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div 
            style={userPermissionModalDrag.dragStyle}
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] z-[1000005] relative"
          >
            
            {/* Header */}
            <div 
              {...userPermissionModalDrag.headerProps}
              className={`px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 ${userPermissionModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400 shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span>Phân Quyền Cho Người Dùng: {permissionTargetUser.name}</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700">
                      @{permissionTargetUser.username}
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Cấp các quyền Tạo - Sửa - Xóa - Xem riêng biệt theo tiêu chuẩn thương mại
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsUserPermissionModalOpen(false)} 
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">
              
              {/* User Profile Summary & Custom Override Toggle */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={permissionTargetUser.avatar}
                    alt={permissionTargetUser.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-indigo-500/50 shadow-xs shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{permissionTargetUser.name}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRolePermissions(permissionTargetUser.role).badgeColor}`}>
                        {getRolePermissions(permissionTargetUser.role).roleName}
                      </span>
                      {permissionTargetUser.email === 'letuans@gmail.com' && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded border border-amber-300">
                          CHỦ SỞ HỮU
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{permissionTargetUser.email}</span>
                      <span>•</span>
                      <span>{permissionTargetUser.department || 'Phòng Kỹ thuật GIS'}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Override Mode Toggle */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {userIsCustomEnabled ? 'Quyền Riêng Biệt (Custom)' : 'Theo Quyền Mặc Định'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {userIsCustomEnabled ? 'Đang bật quyền cá nhân' : `Kế thừa từ vai trò`}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userIsCustomEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUserIsCustomEnabled(checked);
                        if (!checked) {
                          handleResetUserToRoleDefault();
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Quick Presets Bar */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mẫu Cấp Quyền Nhanh Chuẩn Thương Mại:</span>
                  </span>
                  <span className="text-[10px] text-indigo-700 font-medium">Bấm để nạp nhanh quyền chuẩn</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {USER_PERMISSION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyUserPreset(preset)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50/80 transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Permissions Section Grouped by Module */}
              <div className="space-y-4">
                
                {/* 1. Tuyến GIS (Routes) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        1. Quản Lý Tuyến Đường GIS (Routes)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Tạo • Sửa • Xóa • Xem
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    
                    {/* canViewRoute */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 uppercase">
                            Xem
                          </span>
                          <span className="text-xs font-bold text-slate-900">Xem Tuyến Bản Đồ GIS</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép mở bản đồ số, tra cứu danh sách và hiển thị đường vẽ GeoJSON tuyến phố
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canViewRoute}
                          onChange={() => handleToggleUserPermissionFlag('canViewRoute')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {/* canCreateRoute */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                            Tạo
                          </span>
                          <span className="text-xs font-bold text-slate-900">Tạo Tuyến Đường Mới</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép mở form thêm tuyến phố mới và vẽ đường dẫn GIS trên bản đồ số
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canCreateRoute}
                          onChange={() => handleToggleUserPermissionFlag('canCreateRoute')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* canEditRoute */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                            Sửa
                          </span>
                          <span className="text-xs font-bold text-slate-900">Sửa Tuyến Đường</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép chỉnh sửa tên tuyến, cự ly km, phân loại đường, tốc độ và màu nét vẽ GIS
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canEditRoute}
                          onChange={() => handleToggleUserPermissionFlag('canEditRoute')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* canDeleteRoute */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 uppercase">
                            Xóa
                          </span>
                          <span className="text-xs font-bold text-slate-900">Xóa Tuyến Đường</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép xóa vĩnh viễn tuyến đường và cấu hình liên quan khỏi cơ sở dữ liệu
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canDeleteRoute}
                          onChange={() => handleToggleUserPermissionFlag('canDeleteRoute')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                  </div>
                </div>

                {/* 2. Điểm Thực Địa (Points) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        2. Quản Lý Điểm Khảo Sát &amp; Bến Bãi (GPS Points)
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Tạo • Sửa • Xóa • Xem
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    
                    {/* canViewPoint */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 uppercase">
                            Xem
                          </span>
                          <span className="text-xs font-bold text-slate-900">Xem Điểm GPS Thực Địa</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép xem vị trí các điểm dừng, bến bãi trên bản đồ và mở popup thông số kỹ thuật
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canViewPoint}
                          onChange={() => handleToggleUserPermissionFlag('canViewPoint')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {/* canCreatePoint */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 uppercase">
                            Tạo
                          </span>
                          <span className="text-xs font-bold text-slate-900">Thêm Điểm GPS Mới</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép chấm điểm trên bản đồ hoặc nhập tọa độ để thêm mới trạm dừng / bến xe
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canCreatePoint}
                          onChange={() => handleToggleUserPermissionFlag('canCreatePoint')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {/* canEditPoint */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                            Sửa
                          </span>
                          <span className="text-xs font-bold text-slate-900">Chỉnh Sửa Điểm GPS</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép cập nhật tên bến, lý trình km, tọa độ kinh/vĩ độ, loại điểm và ghi chú
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canEditPoint}
                          onChange={() => handleToggleUserPermissionFlag('canEditPoint')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* canDeletePoint */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-rose-100 text-rose-800 uppercase">
                            Xóa
                          </span>
                          <span className="text-xs font-bold text-slate-900">Xóa Điểm Khỏi Tuyến</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép xóa điểm khảo sát / trạm dừng khỏi tuyến đường hiện tại
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canDeletePoint}
                          onChange={() => handleToggleUserPermissionFlag('canDeletePoint')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                  </div>
                </div>

                {/* 3. Dữ Liệu & Quản Trị Hệ Thống (Data & Admin) */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      3. Dữ Liệu, Báo Cáo &amp; Quản Trị Hệ Thống
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    
                    {/* canExportData */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 uppercase">
                            Báo Cáo
                          </span>
                          <span className="text-xs font-bold text-slate-900">Xuất Báo Cáo Excel / CSV</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép tải bảng kê dữ liệu tuyến đường và danh mục điểm ra định dạng Excel / CSV
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canExportData}
                          onChange={() => handleToggleUserPermissionFlag('canExportData')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {/* canImportBackup */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border-t border-slate-100">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-800 uppercase">
                            Sao Lưu
                          </span>
                          <span className="text-xs font-bold text-slate-900">Sao Lưu &amp; Khôi Phục Dữ Liệu JSON</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Cho phép trích xuất tệp sao lưu hệ thống và nhập tệp JSON để phục hồi cơ sở dữ liệu
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canImportBackup}
                          onChange={() => handleToggleUserPermissionFlag('canImportBackup')}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {/* canManageUsers - Phân Quyền Nút Người Dùng */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl transition-colors border border-purple-200 bg-purple-50/60 shadow-2xs mt-1">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-700 text-white uppercase tracking-wider">
                            NÚT NGƯỜI DÙNG
                          </span>
                          <span className="text-xs font-bold text-slate-900">Phân Quyền Nút Người Dùng (Quản Trị &amp; IAM)</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Quyết định tài khoản này có được hiển thị nút <strong>"Người Dùng"</strong> trên thanh điều hướng để mở module quản lý tài khoản và phân quyền hay không
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                        <input
                          type="checkbox"
                          checked={userCustomPermissionsState.canManageUsers}
                          onChange={() => handleToggleUserPermissionFlag('canManageUsers')}
                          disabled={permissionTargetUser.role === 'super_admin' || permissionTargetUser.email === 'letuans@gmail.com'}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-700 peer-disabled:opacity-60 peer-disabled:cursor-not-allowed"></div>
                      </label>
                    </div>

                  </div>
                </div>

              </div>

              {/* Quick action buttons row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSetUserAllPermissions(true)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                  >
                    Bật tất cả quyền
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => handleSetUserAllPermissions(false)}
                    className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                  >
                    Tắt tất cả quyền
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleResetUserToRoleDefault}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục theo vai trò ({getRolePermissions(permissionTargetUser.role).roleName})</span>
                </button>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-500">
                {userIsCustomEnabled ? (
                  <span className="text-amber-700 font-semibold">
                    * Đang áp dụng quyền cá nhân riêng biệt cho tài khoản này.
                  </span>
                ) : (
                  <span className="text-slate-500">
                    * Đang kế thừa quyền mặc định theo vai trò {getRolePermissions(permissionTargetUser.role).roleName}.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUserPermissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserPermissions}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu Phân Quyền Cho Người Này</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Sub-modal: Cấp Quyền Hàng Loạt Cho Nhiều Người Dùng (Batch IAM) */}
      {isBatchPermissionModalOpen && (
        <div className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div 
            style={batchPermissionModalDrag.dragStyle}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 z-[1000005] relative"
          >
            <div 
              {...batchPermissionModalDrag.headerProps}
              className={`px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 ${batchPermissionModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold">
                  Cấp Quyền Cho {selectedUserIds.length} Người Dùng Được Chọn
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsBatchPermissionModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Chọn một mẫu quyền tiêu chuẩn dưới đây để áp dụng đồng loạt cho <strong>{selectedUserIds.length}</strong> tài khoản đã chọn:
              </p>

              <div className="space-y-2">
                {USER_PERMISSION_PRESETS.map((preset) => {
                  const isSelected = batchSelectedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setBatchSelectedPresetId(preset.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-500' 
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                        {isSelected && <CheckCircle className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{preset.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBatchPermissionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const preset = USER_PERMISSION_PRESETS.find(p => p.id === batchSelectedPresetId);
                    if (preset) {
                      handleBatchApplyPreset(preset);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác Nhận Cấp Quyền Hàng Loạt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
