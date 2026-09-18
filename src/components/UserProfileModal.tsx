import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle, 
  AlertCircle,
  Clock,
  LogOut,
  GripHorizontal
} from 'lucide-react';
import { UserAccount, getRolePermissions } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateProfile: (updated: UserAccount) => void;
  onLogout: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [title, setTitle] = useState(currentUser.title || '');
  
  // Change password
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  if (!isOpen) return null;

  const permissions = getRolePermissions(currentUser.role);

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...currentUser,
      name: name.trim(),
      phone: phone.trim(),
      title: title.trim(),
    });
    setFeedback({ message: 'Đã cập nhật thông tin cá nhân thành công!', type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.password && currentPasswordInput !== currentUser.password) {
      setFeedback({ message: 'Mật khẩu hiện tại không chính xác!', type: 'error' });
      return;
    }
    if (!newPassword.trim()) {
      setFeedback({ message: 'Vui lòng nhập mật khẩu mới!', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ message: 'Xác nhận mật khẩu mới không khớp!', type: 'error' });
      return;
    }

    onUpdateProfile({
      ...currentUser,
      password: newPassword.trim(),
    });
    setCurrentPasswordInput('');
    setNewPassword('');
    setConfirmPassword('');
    setFeedback({ message: 'Đã đổi mật khẩu thành công!', type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div 
      className="fixed inset-0 z-[999990] flex items-center justify-center p-0 bg-slate-950/80 backdrop-blur-[2px] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="user-profile-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-2xl overflow-hidden z-[999995] relative animate-in fade-in duration-150 my-auto flex flex-col"
      >
        {/* Header */}
        <div 
          className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 select-none"
        >
          <div className="flex items-center gap-3">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-400 shrink-0"
            />
            <div>
              <h3 className="text-sm font-bold text-white">{currentUser.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${permissions.badgeColor}`}>
                  <ShieldCheck className="w-3 h-3" />
                  {permissions.roleName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">@{currentUser.username}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
          <div className={`px-6 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0 ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 bg-slate-50 flex items-center gap-6 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'info' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Thông Tin Cá Nhân
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'password' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Đổi Mật Khẩu
          </button>
        </div>

        {activeTab === 'info' ? (
          <form onSubmit={handleSaveInfo} className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col justify-between min-h-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tên đăng nhập hệ thống</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.username}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email tài khoản</label>
                  <input
                    type="email"
                    disabled
                    value={currentUser.email}
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chức danh / Vị trí công tác</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Kỹ sư trắc địa / Giám sát hiện trường..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Permissions Summary Card */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-indigo-950 block text-xs">Phạm vi quyền hạn được cấp:</span>
                <p className="text-xs text-slate-700 leading-relaxed">{permissions.description}</p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-slate-600">
                  <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                    Phòng ban: <strong>{currentUser.department || 'Phòng Kỹ Thuật GIS'}</strong>
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                    Trạng thái: <strong className="text-emerald-700">Đang hoạt động</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất tài khoản</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col justify-between min-h-0">
            <div className="space-y-4 max-w-lg mx-auto w-full pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Cập Nhật Mật Khẩu
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
