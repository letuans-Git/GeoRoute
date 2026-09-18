import React from 'react';
import { LogOut, X, AlertTriangle, Shield } from 'lucide-react';
import { UserAccount, getRolePermissions } from '../types';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentUser: UserAccount;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currentUser,
}) => {
  if (!isOpen) return null;

  const permissions = getRolePermissions(currentUser.role);

  return (
    <div 
      id="logout-modal-backdrop"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="logout-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 z-[1000005] relative flex flex-col"
      >
        {/* Header bar */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center shrink-0">
              <LogOut className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xs sm:text-sm block">Xác Nhận Đăng Xuất</span>
              <span className="text-[10px] text-slate-400">GeoRoute GIS Pro</span>
            </div>
          </div>
          <button
            id="btn-close-logout"
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            title="Đóng cửa sổ"
          >
            <X className="w-3.5 h-3.5" />
            <span>Đóng</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col items-center text-center overflow-y-auto">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-xs">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            Đăng xuất phiên làm việc?
          </h3>
          <p className="text-xs text-slate-600 mb-4 max-w-sm leading-relaxed">
            Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại trên hệ thống quản lý tuyến GeoRoute?
          </p>
          
          {/* User badge preview */}
          <div className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-5 flex items-center gap-3 text-left">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-400 shrink-0"
            />
            <div className="overflow-hidden min-w-0 flex-1">
              <div className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3" />
                <span>{permissions.roleName}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 w-full">
            <button
              id="btn-cancel-logout"
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy / Ở Lại
            </button>
            <button
              id="btn-confirm-logout"
              type="button"
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500 shrink-0">
          Mọi dữ liệu khảo sát chưa lưu có thể bị mất khi đăng xuất.
        </div>
      </div>
    </div>
  );
};
