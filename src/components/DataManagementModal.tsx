import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  RotateCcw, 
  Database, 
  CheckCircle, 
  AlertCircle,
  ShieldAlert,
  Lock,
  GripHorizontal
} from 'lucide-react';
import { RouteItem, LocationPoint, EffectivePermissions } from '../types';
import { useDraggableModal } from '../hooks/useDraggableModal';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: RouteItem[];
  points: LocationPoint[];
  currentRoute: RouteItem;
  onImportData: (importedRoutes: RouteItem[], importedPoints: LocationPoint[]) => void;
  onResetDefaultData: () => void;
  permissions?: EffectivePermissions;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  isOpen,
  onClose,
  routes,
  points,
  currentRoute,
  onImportData,
  onResetDefaultData,
  permissions,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const { dragStyle, headerProps } = useDraggableModal({ isOpen });

  if (!isOpen) return null;

  const canExport = permissions ? permissions.canExportData : true;
  const canImport = permissions ? permissions.canImportBackup : true;

  // Export full system JSON backup
  const handleExportJSON = () => {
    const backupData = {
      version: '2.6',
      author: 'Tuấn Lê Software (letuans@gmail.com)',
      exportedAt: new Date().toISOString(),
      routes,
      points,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `georoute-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current route points to CSV for Excel
  const handleExportCSV = () => {
    const routePoints = points.filter(p => p.routeId === currentRoute.id);
    
    // Header
    const headers = ['Mã điểm', 'Tên vị trí', 'Chủ sở hữu', 'Tình trạng', 'Số điện thoại', 'Vĩ độ (Lat)', 'Kinh độ (Lng)', 'Phân loại', 'Địa chỉ', 'Ghi chú'];
    
    // Rows
    const rows = routePoints.map(p => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.owner.replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.phone}"`,
      p.lat,
      p.lng,
      `"${p.category}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh-sach-dia-diem-${currentRoute.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.routes && parsed.points) {
          onImportData(parsed.routes, parsed.points);
          setImportStatus(`Đã khôi phục thành công ${parsed.routes.length} tuyến và ${parsed.points.length} điểm vị trí!`);
        } else {
          setErrorMsg('Tệp JSON không đúng định dạng sao lưu của GeoRoute Pro.');
        }
      } catch (err) {
        setErrorMsg('Không thể đọc tệp JSON. Vui lòng kiểm tra lại cấu trúc tệp.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div 
      id="data-modal-backdrop"
      className="fixed inset-0 z-[999990] flex items-center justify-center p-0 bg-slate-950/80 backdrop-blur-[2px] overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="data-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-screen h-screen max-w-none max-h-none rounded-none border-0 shadow-2xl overflow-hidden animate-in fade-in duration-150 z-[999995] relative flex flex-col"
      >
        <div 
          className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800 select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Sao Lưu &amp; Xuất Nhập Dữ Liệu</h3>
              <p className="text-[11px] text-slate-300">
                Phục vụ bàn giao khách hàng &amp; Quản trị kinh doanh
              </p>
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

        <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 flex flex-col min-h-0">
          {importStatus && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2 shrink-0">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* In-UI Reset Confirmation */}
          {showResetConfirm && (
            <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-950">Xác Nhận Khôi Phục Dữ Liệu Mẫu</h4>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Hệ thống sẽ nạp lại danh sách các tuyến và điểm GPS mẫu mặc định ban đầu. Bạn có chắc chắn?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-white border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(false);
                    onResetDefaultData();
                    onClose();
                  }}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  Đồng Ý Khôi Phục
                </button>
              </div>
            </div>
          )}

          {/* 2-Column Section for Export and Import */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 flex-1">
            {/* Left Column: Export Options */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Download className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    1. Xuất Dữ Liệu Báo Cáo &amp; Sao Lưu
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Xuất dữ liệu khảo sát và thông tin chi tiết các cơ sở quản lý dưới dạng bảng tính Excel/CSV hoặc tệp tin JSON cấu trúc đầy đủ.
                </p>

                <div className="space-y-3 pt-2">
                  {!canExport && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Tài khoản của bạn chưa được cấp quyền Xuất Báo Cáo &amp; Sao Lưu (canExportData).</span>
                    </div>
                  )}

                  <button
                    id="btn-export-csv"
                    onClick={canExport ? handleExportCSV : undefined}
                    disabled={!canExport}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all group shadow-xs ${
                      canExport 
                        ? 'border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer' 
                        : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                        Xuất file Excel / CSV (Tuyến Hiện Tại)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Danh sách đầy đủ Tên cơ sở, Chủ sở hữu, Tình trạng, Điện thoại, Tọa độ GPS.
                      </p>
                    </div>
                  </button>

                  <button
                    id="btn-export-json"
                    onClick={canExport ? handleExportJSON : undefined}
                    disabled={!canExport}
                    className={`w-full p-4 rounded-xl border text-left flex items-center gap-3.5 transition-all group shadow-xs ${
                      canExport 
                        ? 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer' 
                        : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-900">
                        Sao Lưu Toàn Bộ Hệ Thống (JSON)
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Bao gồm toàn bộ các tuyến sông, tuyến phố và tất cả tọa độ điểm GPS thực địa.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 p-2.5 bg-white/70 border border-slate-200/80 rounded-xl">
                💡 Định dạng file CSV tương thích hoàn toàn với Microsoft Excel, Google Sheets, LibreOffice và Apple Numbers.
              </div>
            </div>

            {/* Right Column: Import Options & Reset */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    2. Phục Hồi / Nhập Dữ Liệu Từ Tệp
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tải lên tệp sao lưu dữ liệu (.json) đã xuất từ trước để cập nhật hoặc khôi phục đồng bộ lên hệ thống.
                </p>

                {!canImport && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Tài khoản của bạn chưa được cấp quyền Phục Hồi &amp; Nhập Dữ Liệu (canImportBackup).</span>
                  </div>
                )}

                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all shadow-xs ${
                  canImport 
                    ? 'border-indigo-200 hover:border-indigo-500 bg-white cursor-pointer' 
                    : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                }`}>
                  <input
                    id="input-file-import-json"
                    type="file"
                    accept=".json"
                    disabled={!canImport}
                    onChange={canImport ? handleFileUpload : undefined}
                    className="hidden"
                  />
                  <label htmlFor={canImport ? "input-file-import-json" : undefined} className={canImport ? "cursor-pointer block space-y-2" : "block space-y-2 cursor-not-allowed"}>
                    <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 block">
                      {canImport ? 'Bấm vào đây để chọn tệp JSON phục hồi' : 'Chức năng phục hồi bị khóa'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Hỗ trợ tệp cấu trúc chuẩn của GeoRoute Pro
                    </span>
                  </label>
                </div>
              </div>

              {/* Reset Factory Option */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  Cài đặt lại dữ liệu chuẩn mẫu ban đầu?
                </div>
                {canImport ? (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mẫu mặc định</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>Không có quyền khôi phục</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
