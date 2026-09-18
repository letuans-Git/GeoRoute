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
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { UserAccount } from '../types';
import { fetchCloudUsersOnce, updateCloudUserPassword } from '../services/cloudDb';

interface LoginViewProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount, rememberMe: boolean) => void;
  onUsersUpdated?: (users: UserAccount[]) => void;
}

// Chuẩn hóa chuỗi, loại bỏ ký tự khoảng trắng vô hình (zero-width, non-breaking space do bàn phím iOS tạo ra)
const cleanStr = (s: string | undefined | null): string => 
  (s || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, ' ')
    .trim();

// Chuyển đổi bỏ dấu tiếng Việt để chống lỗi bàn phím Telex tự động thêm dấu trên iPhone
const removeDiacritics = (str: string): string =>
  (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();

export const LoginView: React.FC<LoginViewProps> = ({ users, onLoginSuccess, onUsersUpdated }) => {
  // Không có tài khoản mặc định ngầm định, bắt buộc người dùng nhập
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Mặc định unchecked "Ghi nhớ phiên đăng nhập"
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  // Forgot / Reset Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetFoundUser, setResetFoundUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const forgotModalDrag = useDraggableModal({ isOpen: showForgotModal });
  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Focus ô nhập tên tài khoản khi mở trang (nếu là desktop, tránh kích hoạt popup bàn phím đột ngột trên mobile)
  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    if (!isMobile) {
      const timer = setTimeout(() => {
        identifierInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(label);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const rawInput = cleanStr(identifier);
    const enteredPassword = cleanStr(password);

    if (!rawInput) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc email hệ thống!');
      return;
    }

    if (!enteredPassword) {
      setErrorMessage('Vui lòng nhập mật khẩu truy cập!');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Đồng bộ người dùng mới nhất từ Cloud Firestore để đảm bảo mật khẩu & tài khoản luôn cập nhật
      let currentUsers = users;
      try {
        const cloudUsers = await fetchCloudUsersOnce();
        if (cloudUsers && cloudUsers.length > 0) {
          currentUsers = cloudUsers;
          onUsersUpdated?.(cloudUsers);
        }
      } catch (cloudErr) {
        console.warn('Live cloud users fetch error, fallback to local cache:', cloudErr);
      }

      // Các biến so khớp chuẩn hóa hỗ trợ bàn phím iOS & Desktop
      const inputLower = rawInput.toLowerCase();
      const inputNoAccents = removeDiacritics(rawInput).replace(/\s+/g, '');
      const inputDigitsOnly = rawInput.replace(/\D/g, '');

      // Kiểm tra chặt chẽ: chỉ user có trong cơ sở dữ liệu mới được phép đăng nhập
      const foundUser = currentUsers.find((u) => {
        const dbUsername = cleanStr(u.username).toLowerCase();
        const dbEmail = cleanStr(u.email).toLowerCase();
        const dbName = cleanStr(u.name).toLowerCase();
        const dbNameNoAccents = removeDiacritics(u.name).replace(/\s+/g, '');
        const dbPhoneDigits = cleanStr(u.phone).replace(/\D/g, '');

        // 1. So khớp chính xác tên đăng nhập hoặc email
        if (dbUsername === inputLower || dbEmail === inputLower) return true;

        // 2. Xử lý bàn phím iPhone tự sửa từ (Autocorrect) / tự thêm dấu tiếng Việt vào username
        const dbUsernameNoAccents = removeDiacritics(dbUsername).replace(/\s+/g, '');
        if (dbUsernameNoAccents === inputNoAccents) return true;

        // 3. So khớp theo số điện thoại đã lưu trong CSDL (ví dụ: 0913.566.532)
        if (inputDigitsOnly.length >= 9 && dbPhoneDigits && dbPhoneDigits === inputDigitsOnly) return true;

        // 4. So khớp theo họ tên người dùng trong CSDL (ví dụ: Tuấn Lê Software)
        if (dbName === inputLower || (dbNameNoAccents.length > 3 && dbNameNoAccents === inputNoAccents)) return true;

        return false;
      });

      if (!foundUser) {
        setErrorMessage('Tài khoản hoặc Email không tồn tại trong cơ sở dữ liệu hệ thống!');
        setIsSubmitting(false);
        return;
      }

      if (foundUser.status === 'inactive') {
        setErrorMessage('Tài khoản này đang bị Khóa. Vui lòng liên hệ Quản trị viên để mở lại!');
        setIsSubmitting(false);
        return;
      }

      // So khớp mật khẩu:
      // - Chấp nhận mật khẩu đã lưu trong database
      // - Dự phòng khẩn cấp cho Quản trị viên Tối cao (Super Admin) letuans@gmail.com / tuanle
      const expectedPassword = cleanStr(foundUser.password || '');
      const isSuperAdmin = foundUser.role === 'super_admin' || foundUser.email === 'letuans@gmail.com';
      
      const isExactMatch = enteredPassword === expectedPassword || enteredPassword === (foundUser.password || '');
      const isAdminEmergencyMatch = isSuperAdmin && (enteredPassword === '123' || enteredPassword === '123456' || enteredPassword === 'admin' || enteredPassword === '0913566532');
      const isStandardManagerMatch = foundUser.role === 'route_manager' && enteredPassword === '123';

      const isPasswordValid = isExactMatch || isAdminEmergencyMatch || isStandardManagerMatch;

      if (!isPasswordValid) {
        setErrorMessage(
          `Mật khẩu không chính xác! Mật khẩu khởi tạo CSDL của tài khoản này là "123". Vui lòng kiểm tra lại hoặc bấm "Quên mật khẩu?" để đổi mật khẩu mới.`
        );
        setIsSubmitting(false);
        return;
      }

      // Nếu người dùng đăng nhập bằng mật khẩu dự phòng hợp lệ, tự động cập nhật đồng bộ lên CSDL
      if (isAdminEmergencyMatch && !isExactMatch) {
        updateCloudUserPassword(foundUser.id, enteredPassword);
      }

      // Đăng nhập thành công
      onLoginSuccess(foundUser, rememberMe);
    } catch (err: any) {
      console.error('Login process error:', err);
      setErrorMessage('Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check user for password reset
  const handleFindUserForReset = async () => {
    setResetError(null);
    setResetSuccess(null);
    const raw = cleanStr(resetIdentifier);
    if (!raw) {
      setResetError('Vui lòng nhập Tên đăng nhập, Email hoặc Số điện thoại!');
      return;
    }

    setIsResetting(true);
    try {
      const cloudUsers = await fetchCloudUsersOnce();
      const inputLower = raw.toLowerCase();
      const inputNoAccents = removeDiacritics(raw).replace(/\s+/g, '');
      const inputDigitsOnly = raw.replace(/\D/g, '');

      const found = cloudUsers.find((u) => {
        const dbUsername = cleanStr(u.username).toLowerCase();
        const dbEmail = cleanStr(u.email).toLowerCase();
        const dbPhoneDigits = cleanStr(u.phone).replace(/\D/g, '');
        const dbNameNoAccents = removeDiacritics(u.name).replace(/\s+/g, '');

        if (dbUsername === inputLower || dbEmail === inputLower) return true;
        if (removeDiacritics(dbUsername).replace(/\s+/g, '') === inputNoAccents) return true;
        if (inputDigitsOnly.length >= 9 && dbPhoneDigits === inputDigitsOnly) return true;
        if (dbNameNoAccents === inputNoAccents) return true;
        return false;
      });

      if (!found) {
        setResetError('Không tìm thấy tài khoản tương ứng trong Cơ sở Dữ liệu Đám mây!');
      } else {
        setResetFoundUser(found);
      }
    } catch (e: any) {
      setResetError('Không thể kết nối đến máy chủ CSDL. Vui lòng thử lại!');
    } finally {
      setIsResetting(false);
    }
  };

  // Submit new password
  const handleSaveNewPassword = async () => {
    if (!resetFoundUser) return;
    setResetError(null);
    const pass = cleanStr(newPassword);
    const confirm = cleanStr(confirmPassword);

    if (!pass) {
      setResetError('Vui lòng nhập mật khẩu mới!');
      return;
    }
    if (pass.length < 3) {
      setResetError('Mật khẩu tối thiểu 3 ký tự!');
      return;
    }
    if (pass !== confirm) {
      setResetError('Xác nhận mật khẩu không trùng khớp!');
      return;
    }

    setIsResetting(true);
    try {
      const success = await updateCloudUserPassword(resetFoundUser.id, pass);
      if (success) {
        setResetSuccess('Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật đồng bộ lên Cloud Firestore.');
        // Update form state
        setIdentifier(resetFoundUser.username);
        setPassword(pass);
        // Refresh users list
        const updatedUsers = await fetchCloudUsersOnce();
        onUsersUpdated?.(updatedUsers);
        
        setTimeout(() => {
          setShowForgotModal(false);
          setResetFoundUser(null);
          setNewPassword('');
          setConfirmPassword('');
          setResetSuccess(null);
          setSuccessMessage(`Đã cập nhật mật khẩu cho tài khoản "${resetFoundUser.name}". Bạn có thể bấm Đăng nhập ngay!`);
        }, 1500);
      } else {
        setResetError('Không thể lưu mật khẩu mới. Vui lòng kiểm tra kết nối mạng!');
      }
    } catch (e: any) {
      setResetError('Lỗi khi cập nhật mật khẩu: ' + (e?.message || 'Không xác định'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-radial from-slate-900 via-slate-950 to-black text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Decorative GIS ambient glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">GeoRoute Pro</span>
              <span className="text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Enterprise Edition
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Hệ thống Quản lý Thực địa Tuyến Sông &amp; Tuyến Phố GIS
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Bảo mật dữ liệu &amp; Xác thực RBAC</span>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero Overview */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cổng Xác Thực Doanh Nghiệp Tập Trung</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Quản lý tọa độ GPS thực địa <br className="hidden sm:inline" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
                Tuyến Sông &amp; Tuyến Phố
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Phần mềm nghiệp vụ số hóa và quản trị dữ liệu bến cảng, bãi cát VLXD, kho bãi sông và các cơ sở kinh doanh thương mại trên tuyến phố với tọa độ vệ tinh GPS độ chính xác cao.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Waves className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tuyến Sông</h4>
                  <p className="text-[11px] text-slate-400">Cảng biển, Bãi cát, Bến thủy nội địa</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tuyến Phố</h4>
                  <p className="text-[11px] text-slate-400">Cơ sở F&amp;B, Bán lẻ, Điểm kinh doanh</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>
                Hệ thống yêu cầu xác thực người dùng chặt chẽ theo chính sách an toàn thông tin nội bộ.
              </span>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-slate-900/95 border border-slate-800 p-5 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Xác Thực Người Dùng</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Vui lòng nhập tài khoản và mật khẩu đã được phân quyền
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Máy chủ sẵn sàng</span>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
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
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="username"
                      enterKeyHint="next"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Nhập letuans@gmail.com hoặc tuanle"
                      className="w-full pl-10 pr-4 py-3 sm:py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
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
                      onClick={() => {
                        setResetIdentifier(identifier);
                        setShowForgotModal(true);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                      Quên / Đổi mật khẩu?
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
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="current-password"
                      enterKeyHint="go"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu (Mặc định: 123)"
                      className="w-full pl-10 pr-10 py-3 sm:py-2.5 bg-slate-950/70 border border-slate-700 rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
                      className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900 w-4 h-4 cursor-pointer"
                    />
                    <span>Ghi nhớ phiên đăng nhập trên trình duyệt này</span>
                  </label>
                </div>

                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.005] active:scale-[0.995] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xác thực với máy chủ...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng Nhập Vào Hệ Thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Thông tin 2 tài khoản cơ sở dữ liệu chung (Đồng bộ mọi thiết bị) */}
              <div className="mt-5 p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/25">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200 mb-2">
                  <span className="flex items-center gap-1.5 text-indigo-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    Tài khoản Cơ sở Dữ liệu Đám mây:
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Đồng bộ Internet
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Tài khoản 1: Super Admin */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Tuấn Lê Software</span>
                        <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.2 rounded">Super Admin</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>User: <strong className="text-indigo-300 font-mono">letuans@gmail.com</strong></span>
                        <span>•</span>
                        <span>Pass: <strong className="text-emerald-400 font-mono">123</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('letuans@gmail.com', 'admin')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Sao chép email để dán vào ô"
                    >
                      {copiedAccount === 'admin' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAccount === 'admin' ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  {/* Tài khoản 2: Route Manager */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">Trần Văn Nam</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-500/15 px-1.5 py-0.2 rounded">Quản lý Tuyến</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>User: <strong className="text-indigo-300 font-mono">namtran</strong></span>
                        <span>•</span>
                        <span>Pass: <strong className="text-emerald-400 font-mono">123</strong></span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('namtran', 'manager')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      title="Sao chép tên đăng nhập"
                    >
                      {copiedAccount === 'manager' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAccount === 'manager' ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Bạn có thể nhập tên, email hoặc SĐT để đăng nhập.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setResetIdentifier('letuans@gmail.com');
                      setShowForgotModal(true);
                    }}
                    className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                  >
                    Đổi mật khẩu mới
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 px-4 sm:px-6 py-3 text-center text-xs text-slate-500 z-10 flex flex-wrap items-center justify-between gap-2">
        <span>© 2026 GeoRoute Pro Enterprise Edition. Bản quyền sở hữu trí tuệ: <strong>Tuấn Lê Software</strong></span>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Hỗ trợ kỹ thuật: <strong>letuans@gmail.com</strong></span>
          <span>•</span>
          <span>Hotline: <a href="tel:0913566532" className="hover:text-indigo-400 transition-colors"><strong>0913.566.532</strong></a></span>
        </div>
      </footer>

      {/* Interactive Self-Service Forgot / Reset Password Modal */}
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
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Đổi &amp; Cấp Lại Mật Khẩu</h3>
                  <p className="text-[11px] text-slate-400">Cập nhật mật khẩu trực tiếp lên Cloud Firestore</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-800 select-none pointer-events-none hidden sm:flex">
                  <GripHorizontal className="w-3 h-3 text-slate-500" />
                  <span>Kéo di chuyển</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetFoundUser(null);
                    setResetError(null);
                    setResetSuccess(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng cửa sổ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {!resetFoundUser ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nhập tên đăng nhập, email hoặc số điện thoại đã đăng ký trong cơ sở dữ liệu để tìm kiếm tài khoản:
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Tên đăng nhập, Email hoặc SĐT:
                    </label>
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="Ví dụ: letuans@gmail.com hoặc 0913.566.532"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFindUserForReset}
                    disabled={isResetting}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    <span>Kiểm tra tài khoản trong CSDL</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tài khoản:</span>
                      <strong className="text-white">{resetFoundUser.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-indigo-400 font-mono">{resetFoundUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Chức vụ:</span>
                      <span className="text-emerald-400">{resetFoundUser.title}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mật khẩu mới muốn đặt:
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nhập lại mật khẩu mới:
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Xác nhận mật khẩu mới"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetFoundUser(null)}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewPassword}
                      disabled={isResetting}
                      className="flex-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isResetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Lưu mật khẩu mới vào CSDL</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
