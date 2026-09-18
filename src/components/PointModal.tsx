import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Crosshair, 
  Phone, 
  User, 
  Building2, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  GripHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Edit3,
  Waves,
  Navigation,
  Check,
  Map
} from 'lucide-react';
import { LocationPoint, RouteItem } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { PointPickerMap } from './PointPickerMap';

export interface PointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePoint: (point: Partial<LocationPoint>) => void;
  currentRoute: RouteItem;
  initialPoint?: LocationPoint | null;
  onStartPickOnMap?: () => void;
  pickedCoords?: { lat: number; lng: number } | null;
  existingPoints?: LocationPoint[];
  allRoutes?: RouteItem[];
}

export const PointModal: React.FC<PointModalProps> = ({
  isOpen,
  onClose,
  onSavePoint,
  currentRoute,
  initialPoint,
  onStartPickOnMap,
  pickedCoords,
  existingPoints = [],
  allRoutes = [],
}) => {
  const isEditing = Boolean(initialPoint);

  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<LocationPoint['status']>('Đang hoạt động');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState<number>(0);
  const [lng, setLng] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number | undefined>(undefined);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Panel collapse toggle for GIS layout (identical to RouteModal)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'map'>('form');

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  // Initialize or reset form values
  useEffect(() => {
    if (initialPoint) {
      setName(initialPoint.name);
      setOwner(initialPoint.owner);
      setStatus(initialPoint.status);
      setPhone(initialPoint.phone);
      setCategory(initialPoint.category);
      setAddress(initialPoint.address || '');
      setNotes(initialPoint.notes || '');
      setLat(initialPoint.lat);
      setLng(initialPoint.lng);
      setAccuracy(initialPoint.accuracy);
      setGpsError(null);
    } else {
      setName('');
      setOwner('');
      setStatus('Đang hoạt động');
      setPhone('');
      setCategory(currentRoute.type === 'river' ? 'Bến cảng' : 'Cơ sở kinh doanh');
      setAddress('');
      setNotes('');
      // Default coordinates to picked coords or route center
      const defaultLat = pickedCoords ? pickedCoords.lat : currentRoute.center[0];
      const defaultLng = pickedCoords ? pickedCoords.lng : currentRoute.center[1];
      setLat(defaultLat);
      setLng(defaultLng);
      setAccuracy(undefined);
      setGpsError(null);
    }
  }, [initialPoint, isOpen, currentRoute]);

  // Update coords if user picked on map
  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords.lat);
      setLng(pickedCoords.lng);
      setAccuracy(3.0);
    }
  }, [pickedCoords]);

  if (!isOpen) return null;

  // Real GPS acquisition via Navigator Geolocation
  const handleGetCurrentGps = () => {
    setIsGettingGps(true);
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Thiết bị của bạn không hỗ trợ định vị GPS trực tiếp.');
      setIsGettingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setAccuracy(Math.round(position.coords.accuracy));
        setIsGettingGps(false);
      },
      (error) => {
        setIsGettingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Vui lòng cấp quyền truy cập vị trí trên trình duyệt (Location Permission).');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsError('Không thể bắt được tín hiệu vệ tinh GPS. Hãy kiểm tra kết nối mạng/GPS.');
        } else {
          setGpsError('Hết thời gian chờ phản hồi GPS. Vui lòng thử lại.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleCoordsChange = (newLat: number, newLng: number, acc?: number) => {
    setLat(newLat);
    setLng(newLng);
    if (acc) setAccuracy(acc);
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Vui lòng nhập Tên vị trí!');
      return;
    }
    if (!owner.trim()) {
      setValidationError('Vui lòng nhập Chủ sở hữu / Người đại diện!');
      return;
    }
    if (!phone.trim()) {
      setValidationError('Vui lòng nhập Số điện thoại!');
      return;
    }
    if (lat === 0 || lng === 0) {
      setValidationError('Vui lòng chọn Tọa độ GPS bằng cách nhấp trên bản đồ hoặc bấm Lấy GPS!');
      return;
    }

    onSavePoint({
      id: initialPoint ? initialPoint.id : undefined,
      routeId: currentRoute.id,
      name: name.trim(),
      owner: owner.trim(),
      status,
      phone: phone.trim(),
      category: category.trim() || (currentRoute.type === 'river' ? 'Bến cảng' : 'Cơ sở kinh doanh'),
      address: address.trim(),
      notes: notes.trim(),
      lat,
      lng,
      accuracy,
    });

    onClose();
  };

  const riverCategories = ['Bến cảng', 'Bãi vật liệu xây dựng', 'Bến thủy nội địa', 'Bãi tập kết cát đá', 'Bến đò / phà', 'Trạm neo đậu', 'Khác'];
  const streetCategories = ['Cơ sở kinh doanh', 'Nhà hàng', 'Quán cà phê / F&B', 'Khách sạn / Lưu trú', 'Cửa hàng bán lẻ', 'Showroom / Dịch vụ', 'Khác'];
  const categoriesToUse = currentRoute.type === 'river' ? riverCategories : streetCategories;

  return (
    <div 
      id="point-modal-backdrop"
      className="fixed inset-0 z-[999990] w-screen h-screen bg-slate-900 overflow-hidden flex flex-col p-0 m-0"
    >
      <div 
        id="point-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full bg-slate-900 overflow-hidden relative flex flex-col rounded-none border-0 shadow-none animate-in fade-in duration-150 z-[999995]"
      >
        {/* Nút Close form cố định góc trên bên phải */}
        <button
          id="btn-close-point-modal-top"
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-[1001] flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-950/90 hover:bg-rose-600 text-white rounded-lg shadow-xl border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all cursor-pointer group"
          title="Đóng (Close) form"
        >
          <X className="w-4 h-4 text-slate-300 group-hover:text-white" />
          <span>Đóng</span>
        </button>

        {/* Mobile View Switcher (Chỉ hiển thị trên Mobile & Tablet màn hình nhỏ < md) */}
        <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-2.5 py-2 border-b border-slate-800 shrink-0 z-20 pr-24">
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMobileTab('form')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileTab === 'form'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="relative flex items-center justify-center w-3.5 h-3.5 min-w-[14px] min-h-[14px] aspect-square rounded-full bg-white border-2 border-[#22c55e] shadow-xs shrink-0">
                <span className="w-1 h-1 rounded-full bg-[#22c55e]"></span>
              </span>
              <span>Thông Tin</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('map')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mobileTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Bản Đồ Vị Trí</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Split Layout (Left Form + Right Map Studio - Full Screen) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-900 relative h-full">
          {/* Collapsible Left Rail when panel is collapsed on desktop */}
          {isPanelCollapsed && (
            <div className="w-10 bg-white border-r border-slate-200 flex flex-col items-center py-2.5 gap-2 shrink-0 z-10 shadow-sm hidden md:flex justify-between h-full">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(false)}
                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors cursor-pointer"
                  title="Mở rộng bảng thông tin địa điểm"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <div className="writing-vertical-lr rotate-180 text-[10px] font-bold text-slate-500 tracking-wider select-none uppercase mt-2">
                  Thông tin địa điểm
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Đóng form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Left Panel: Location Info Form (Ultra Compact) */}
          <form 
            onSubmit={handleSubmit}
            className={`${
              mobileTab === 'map' ? 'hidden md:flex' : 'flex'
            } ${
              isPanelCollapsed ? 'md:hidden' : 'md:flex'
            } w-full md:w-[260px] lg:w-[275px] xl:w-[285px] bg-white border-r border-slate-200 flex-col shrink-0 h-full min-h-0 z-10 shadow-sm transition-all duration-200 overflow-y-auto`}
          >
            {/* Panel sub-header with Title, Collapse button & Close button */}
            <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className={`relative flex items-center justify-center w-3.5 h-3.5 min-w-[14px] min-h-[14px] aspect-square rounded-full shadow-xs shrink-0 ${
                  isEditing 
                    ? 'bg-[#ef4444] border-2 border-white ring-2 ring-amber-400' 
                    : 'bg-white border-2 border-[#22c55e] ring-1 ring-slate-300'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${isEditing ? 'bg-white' : 'bg-[#22c55e]'}`}></span>
                </span>
                {isEditing ? 'Sửa Địa Điểm' : 'Nhập Địa Điểm'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="md:hidden px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Xem bản đồ vị trí"
                >
                  <Map className="w-3 h-3" />
                  <span>Bản Đồ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPanelCollapsed(true)}
                  className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Thu gọn để dành toàn bộ màn hình cho bản đồ"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Đóng form"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Scrollable Form Content (Tight & Compact) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
              {validationError && (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* 1. TỌA ĐỘ GPS & ĐỊNH VỊ THỰC ĐỊA */}
              <div className="p-2 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-950 flex items-center gap-1.5">
                    <span className={`relative flex items-center justify-center w-3.5 h-3.5 min-w-[14px] min-h-[14px] aspect-square rounded-full shadow-xs shrink-0 ${
                      (isEditing || (lat !== 0 && lng !== 0))
                        ? 'bg-[#ef4444] border-2 border-white ring-2 ring-amber-400' 
                        : 'bg-white border-2 border-[#22c55e]'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${(isEditing || (lat !== 0 && lng !== 0)) ? 'bg-white' : 'bg-[#22c55e]'}`}></span>
                    </span>
                    <span>Tọa Độ GPS</span> <span className="text-rose-500">*</span>
                  </span>
                  {accuracy && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full border border-emerald-200">
                      ±{accuracy}m
                    </span>
                  )}
                </div>

                {/* Direct GPS Button */}
                <button
                  type="button"
                  id="btn-point-form-get-gps"
                  onClick={handleGetCurrentGps}
                  disabled={isGettingGps}
                  className="w-full py-1.5 px-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Crosshair className={`w-3.5 h-3.5 ${isGettingGps ? 'animate-spin' : ''}`} />
                  <span>{isGettingGps ? 'Đang dò GPS...' : '📍 Lấy GPS tại chỗ'}</span>
                </button>

                {gpsError && (
                  <p className="text-[10px] text-rose-600 font-semibold leading-tight">
                    ⚠️ {gpsError}
                  </p>
                )}

                {/* 2 Coordinates input */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Vĩ độ (Lat):</span>
                    <input
                      type="number"
                      step="any"
                      value={lat || ''}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      placeholder="10.7725"
                      className="w-full mt-0.5 px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Kinh độ (Lng):</span>
                    <input
                      type="number"
                      step="any"
                      value={lng || ''}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      placeholder="106.7455"
                      className="w-full mt-0.5 px-2 py-1 text-xs font-mono bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 2. THÔNG TIN CƠ BẢN */}
              <div className="space-y-1.5">
                {/* Tên vị trí */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Tên Vị Trí / Cơ Sở <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-point-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={currentRoute.type === 'river' ? 'Vd: Bến Cát Lái...' : 'Vd: Nhà hàng Phố Biển...'}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Phân loại ngành nghề */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Phân Loại Ngành Nghề
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {categoriesToUse.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Tình trạng hoạt động */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Tình Trạng Hoạt Động <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="select-point-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LocationPoint['status'])}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  >
                    <option value="Đang hoạt động">🟢 Đang hoạt động</option>
                    <option value="Tạm ngừng">🟡 Tạm ngừng</option>
                    <option value="Đang cải tạo / xây dựng">🔵 Đang cải tạo / xây dựng</option>
                    <option value="Cần kiểm tra định kỳ">🟠 Cần kiểm tra định kỳ</option>
                    <option value="Chưa có giấy phép">🔴 Chưa có giấy phép</option>
                  </select>
                </div>
              </div>

              {/* 3. ĐẠI DIỆN & LIÊN HỆ */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                {/* Chủ sở hữu */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Chủ Sở Hữu / Đại Diện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-point-owner"
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Vd: Ông Nguyễn Văn A"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Số Điện Thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-point-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Vd: 0903 881 294"
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Địa chỉ thực tế */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Địa Chỉ Thực Tế
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Vd: Số 12 Lê Thánh Tông..."
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* 4. GHI CHÚ KIỂM TRA THỰC ĐỊA */}
              <div className="pt-1 border-t border-slate-100">
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                  Ghi Chú Kiểm Tra
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Quy mô bến bãi, tải trọng, giấy phép..."
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>
              {/* Mobile Quick Switch Button to PointPickerMap */}
              <div className="pt-1 md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="w-full py-1.5 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Map className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mở Bản Đồ Chọn Tọa Độ GPS</span>
                </button>
              </div>
            </div>

            {/* Sticky Action Footer (Compact) */}
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="submit"
                id="btn-save-point-submit"
                className="px-3.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Lưu Thay Đổi' : 'Lưu Vị Trí'}</span>
              </button>
            </div>
          </form>

          {/* Right Panel: Interactive Point Map Studio */}
          <div className={`${mobileTab === 'form' ? 'hidden md:block' : 'block'} flex-1 relative h-full w-full overflow-hidden bg-slate-950`}>
            {/* Mobile return to form button */}
            <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001]">
              <button
                type="button"
                onClick={() => setMobileTab('form')}
                className="px-4 py-2 bg-slate-900/95 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-xl flex items-center gap-1.5 cursor-pointer border border-indigo-400/50 backdrop-blur-md"
              >
                <span className={`relative flex items-center justify-center w-3.5 h-3.5 min-w-[14px] min-h-[14px] aspect-square rounded-full shadow-xs shrink-0 ${
                  (isEditing || (lat !== 0 && lng !== 0))
                    ? 'bg-[#ef4444] border-2 border-white ring-2 ring-amber-400' 
                    : 'bg-white border-2 border-[#22c55e]'
                }`}>
                  <span className={`w-1 h-1 rounded-full ${(isEditing || (lat !== 0 && lng !== 0)) ? 'bg-white' : 'bg-[#22c55e]'}`}></span>
                </span>
                <span>Quay Lại Nhập &amp; Lưu</span>
              </button>
            </div>

            <PointPickerMap
              currentRoute={currentRoute}
              existingPoints={existingPoints}
              pointLat={lat}
              pointLng={lng}
              accuracy={accuracy}
              onCoordsChange={handleCoordsChange}
              pointName={name}
              pointCategory={category}
              pointStatus={status}
              isGettingGps={isGettingGps}
              onGetCurrentGps={handleGetCurrentGps}
              gpsError={gpsError}
              editingPointId={initialPoint?.id}
              isEditing={isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
