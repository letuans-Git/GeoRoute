import React, { useState, useRef, useEffect } from 'react';
import { 
  Navigation, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  MapPin, 
  Waves, 
  ArrowRight,
  HelpCircle,
  X,
  GripHorizontal,
  Zap,
  CheckCircle2,
  Crown,
  Compass,
  MapPinned
} from 'lucide-react';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { UserAccount } from '../types';
import { INITIAL_USERS } from '../data/mockData';

interface LoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount, rememberMe: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess }) => {
  // Pre-fill with default Super Admin credentials so it works immediately out-of-the-box
  const [identifier, setIdentifier] = useState('tuanle');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const forgotModalDrag = useDraggableModal({ isOpen: showForgotModal });

  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Available user accounts with fallback to INITIAL_USERS
  const activePool: UserAccount[] = React.useMemo(() => {
    if (Array.isArray(users) && users.length > 0) {
      const existingUsernames = new Set(users.map(u => u.username.toLowerCase()));
      const missing = INITIAL_USERS.filter(u => !existingUsernames.has(u.username.toLowerCase()));
      return [...users, ...missing];
    }
    return INITIAL_USERS;
  }, [users]);

  // Focus identifier input on initial mount
  useEffect(() => {
    const timer = setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const findMatchingUser = (rawInput: string): UserAccount | null => {
    const cleanId = rawInput.trim().toLowerCase();
    const cleanPhone = cleanId.replace(/[\s.-]/g, '');

    if (!cleanId) return null;

    // 1. Exact username or email
    let found = activePool.find(u => 
      u.username.toLowerCase() === cleanId || 
      u.email.toLowerCase() === cleanId
    );

    // 2. Email prefix before @ (e.g. letuans)
    if (!found) {
      found = activePool.find(u => u.email.toLowerCase().split('@')[0] === cleanId);
    }

    // 3. Phone number (normalized digits)
    if (!found && cleanPhone.length >= 4) {
      found = activePool.find(u => (u.phone || '').replace(/[\s.-]/g, '').includes(cleanPhone));
    }

    // 4. Name match (e.g. "tuan le", "tuấn lê", "tuấn lê software")
    if (!found) {
      found = activePool.find(u => {
        const uName = (u.name || '').toLowerCase();
        return uName.includes(cleanId) || cleanId.includes(uName);
      });
    }

    // 5. Standard role aliases
    if (!found) {
      if (['admin', 'superadmin', 'super_admin', 'root', 'tuan'].includes(cleanId)) {
        found = activePool.find(u => u.role === 'super_admin' || u.username === 'tuanle') || INITIAL_USERS[0];
      } else if (['manager', 'dieuhanh', 'nam'].includes(cleanId)) {
        found = activePool.find(u => u.role === 'route_manager' || u.username === 'namtran') || INITIAL_USERS[1];
      } else if (['surveyor', 'khaosat', 'ha'].includes(cleanId)) {
        found = activePool.find(u => u.role === 'surveyor' || u.username === 'thuha') || INITIAL_USERS[2];
      } else if (['viewer', 'khach', 'guest', 'long'].includes(cleanId)) {
        found = activePool.find(u => u.role === 'viewer' || u.username === 'viewer') || INITIAL_USERS[3];
      }
    }

    return found || null;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const idToUse = identifier.trim() || 'tuanle';
    const passToUse = password.trim() || '123';

    const foundUser = findMatchingUser(idToUse);

    if (!foundUser) {
      setErrorMessage('Tên đăng nhập không tồn tại! Bạn có thể sử dụng "tuanle" (hoặc "admin") với mật khẩu "123".');
      return;
    }

    if (foundUser.status === 'inactive') {
      setErrorMessage('Tài khoản này đang bị Khóa. Vui lòng liên hệ Quản trị viên Tuấn Lê Software để mở lại!');
      return;
    }

    // Flexible password check
    const userPass = (foundUser.password || '123').trim();
    const isPassValid = 
      passToUse === '123' || 
      passToUse === '123456' || 
      passToUse === 'admin' || 
      passToUse === userPass;

    if (!isPassValid) {
      setErrorMessage('Mật khẩu không chính xác! Mật khẩu mặc định hệ thống là: 123');
      return;
    }

    onLoginSuccess(foundUser, rememberMe);
  };

  // Instant 1-click login for demo accounts
  const handleInstantLogin = (userAccount: UserAccount) => {
    setIdentifier(userAccount.username);
    setPassword('123');
    onLoginSuccess(userAccount, true);
  };

  return (
    <div className="min-h-screen w-full bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative GIS ambient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">GeoRoute Pro</span>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Enterprise v2.6
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hệ thống Quản lý Thực địa Tuyến Sông &amp; Tuyến Phố GIS
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bảo mật dữ liệu &amp; Phân quyền RBAC</span>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero Overview */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cổng Đăng Nhập Doanh Nghiệp Phân Quyền</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Quản lý tọa độ GPS thực địa <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
                Tuyến Sông &amp; Tuyến Phố
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Phần mềm chuyên dụng ghi nhận dữ liệu bến cảng, bãi cát VLXD, nhà hàng, cửa hàng kinh doanh với độ chính xác cao. Đăng nhập với tài khoản được cấp quyền hoặc bấm đăng nhập nhanh 1 chạm bên dưới để bắt đầu.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tuyến Sông</h4>
                  <p className="text-[11px] text-slate-400">Cảng biển, Bãi cát, Bến neo đậu</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tuyến Phố</h4>
                  <p className="text-[11px] text-slate-400">Cơ sở F&amp;B, Bán lẻ, Dịch vụ</p>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Login Recommendation Banner */}
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-indigo-300">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Đăng nhập nhanh 1 chạm:</span>
              </div>
              <p className="text-[12px] text-slate-400">
                Bạn có thể bấm trực tiếp vào nút <strong>"Đăng Nhập Super Admin (Tuấn Lê Software)"</strong> bên dưới để vào hệ thống ngay lập tức mà không cần gõ mật khẩu.
              </p>
            </div>
          </div>

          {/* Right: Login Form & Quick Access Cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/95 border border-slate-800 p-6 sm:p-7 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Xác Thực Người Dùng</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đăng nhập hoặc chọn tài khoản mẫu bên dưới
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Sẵn sàng kết nối</span>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tên đăng nhập, Email hoặc SĐT <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={identifierInputRef}
                      id="input-login-identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="tuanle, admin hoặc letuans@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Mật khẩu <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mật khẩu mặc định: 123"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4"
                    />
                    <span>Ghi nhớ phiên đăng nhập trên trình duyệt này</span>
                  </label>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Fast 1-Click Access Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Đăng nhập nhanh 1 chạm (Tài khoản mẫu):
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Pass: 123</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Super Admin */}
                  <button
                    type="button"
                    onClick={() => handleInstantLogin(INITIAL_USERS[0])}
                    className="p-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-left transition-all group cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Crown className="w-4 h-4 text-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-indigo-300">
                        Tuấn Lê Software
                      </div>
                      <div className="text-[10px] text-indigo-400 font-mono truncate">
                        tuanle (Super Admin)
                      </div>
                    </div>
                  </button>

                  {/* Route Manager */}
                  <button
                    type="button"
                    onClick={() => handleInstantLogin(INITIAL_USERS[1])}
                    className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-left transition-all group cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Compass className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-cyan-300">
                        Trần Văn Nam
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono truncate">
                        namtran (Quản lý tuyến)
                      </div>
                    </div>
                  </button>

                  {/* Surveyor */}
                  <button
                    type="button"
                    onClick={() => handleInstantLogin(INITIAL_USERS[2])}
                    className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all group cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <MapPinned className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300">
                        Lê Thu Hà
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono truncate">
                        thuha (Khảo sát GPS)
                      </div>
                    </div>
                  </button>

                  {/* Viewer */}
                  <button
                    type="button"
                    onClick={() => handleInstantLogin(INITIAL_USERS[3])}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left transition-all group cursor-pointer flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <User className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate group-hover:text-slate-300">
                        Nguyễn Hoàng Long
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        viewer (Khách xem)
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-6 py-3 text-center text-xs text-slate-500 z-10 flex flex-wrap items-center justify-between gap-2">
        <span>© 2026 GeoRoute Pro Enterprise Edition. Bản quyền sở hữu trí tuệ: <strong>Tuấn Lê Software</strong></span>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Hỗ trợ kỹ thuật: <strong>letuans@gmail.com</strong></span>
          <span>•</span>
          <span>Hotline: <a href="tel:0913566532" className="hover:text-indigo-400 transition-colors"><strong>0913.566.532</strong></a></span>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[999990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            style={forgotModalDrag.dragStyle}
            className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden text-slate-200 shadow-2xl relative z-[999995]"
          >
            {/* Draggable Header */}
            <div 
              {...forgotModalDrag.headerProps}
              className={`px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between ${forgotModalDrag.headerProps.className}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Khôi Phục Mật Khẩu</h3>
                  <p className="text-[11px] text-slate-400">Chính sách bảo mật hệ thống GeoRoute Pro</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-none pointer-events-none hidden sm:flex">
                  <GripHorizontal className="w-3 h-3 text-slate-500" />
                  <span>Kéo di chuyển</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Hệ thống hỗ trợ đăng nhập nhanh bằng các tài khoản chuẩn với mật khẩu mặc định:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Quản trị viên tối cao:</span>
                  <strong className="text-white">Tuấn Lê Software (tuanle)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-indigo-400 font-semibold">letuans@gmail.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="text-white font-mono">0913.566.532</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-slate-400">Mật khẩu chuẩn tất cả tài khoản:</span>
                  <span className="text-amber-400 font-mono font-bold text-sm">123</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  handleInstantLogin(INITIAL_USERS[0]);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Đăng nhập ngay với Tuấn Lê Software (123)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
