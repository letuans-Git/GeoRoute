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
  GripHorizontal
} from 'lucide-react';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { UserAccount } from '../types';

interface LoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount, rememberMe: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const forgotModalDrag = useDraggableModal({ isOpen: showForgotModal });

  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Tự động Focus vào ô tên đăng nhập mỗi lần khởi chạy / hiển thị Form đăng nhập
  useEffect(() => {
    const timer = setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim().toLowerCase();
    const foundUser = users.find(u => 
      u.username.toLowerCase() === cleanId || 
      u.email.toLowerCase() === cleanId
    );

    if (!foundUser) {
      setErrorMessage('Tên đăng nhập hoặc Email không tồn tại trên hệ thống!');
      return;
    }

    if (foundUser.status === 'inactive') {
      setErrorMessage('Tài khoản này đang bị Khóa. Vui lòng liên hệ Quản trị viên Tuấn Lê Software để mở lại!');
      return;
    }

    // Check password (plain check or fallback)
    if (foundUser.password && foundUser.password !== password) {
      setErrorMessage('Mật khẩu không chính xác. Vui lòng thử lại!');
      return;
    }

    onLoginSuccess(foundUser, rememberMe);
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
              Phần mềm chuyên dụng ghi nhận dữ liệu bến cảng, bãi cát VLXD, nhà hàng, cửa hàng kinh doanh với độ chính xác cao. Vui lòng đăng nhập với tài khoản được cấp quyền để truy cập hệ thống.
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
          </div>

          {/* Right: Login Form & Quick Access Cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white">Xác Thực Người Dùng</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Nhập tên đăng nhập hoặc email và mật khẩu của bạn
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tên đăng nhập hoặc Email <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      ref={identifierInputRef}
                      id="input-login-identifier"
                      type="text"
                      autoFocus
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="tuanle hoặc letuans@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
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
                      placeholder="Nhập mật khẩu (mặc định: 123)"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4"
                    />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Đăng Nhập Vào Hệ Thống</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
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
                Để bảo mật dữ liệu thực địa và thông tin khách hàng, việc cấp lại mật khẩu được quản lý trực tiếp bởi Quản trị viên tối cao:
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 mb-5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Quản trị viên:</span>
                  <strong className="text-white">Tuấn Lê Software</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-indigo-400 font-semibold">letuans@gmail.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mật khẩu mặc định các tài khoản mẫu:</span>
                  <span className="text-amber-400 font-mono font-bold">123</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Đã hiểu, quay lại Đăng nhập
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
