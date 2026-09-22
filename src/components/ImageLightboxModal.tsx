import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  FileText,
  Building2,
  ExternalLink
} from 'lucide-react';

export interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  subtitle?: string;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  images = [],
  initialIndex = 0,
  title = 'Giấy chứng nhận đăng ký kinh doanh',
  subtitle,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Sync index when initialIndex changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)));
      setZoom(1);
      setRotation(0);
    }
  }, [isOpen, initialIndex, images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex] || images[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setRotation(0);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentImg;
    a.download = `giay-dkkd-${currentIndex + 1}.jpg`;
    a.click();
  };

  return (
    <div 
      id="image-lightbox-backdrop"
      className="fixed inset-0 z-[999999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-2 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div 
        className="w-full max-w-5xl flex items-center justify-between py-2 px-3 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md z-10 shrink-0 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold truncate text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Counter and Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {images.length > 1 && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
              {currentIndex + 1} / {images.length}
            </span>
          )}

          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              title="Xoay 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
              title="Tải ảnh về máy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer ml-1"
            title="Đóng (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div 
        className="flex-1 w-full flex items-center justify-center relative overflow-hidden my-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 z-20 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl border border-slate-700 transition-all cursor-pointer"
              title="Ảnh trước"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:right-4 z-20 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-indigo-600 text-white shadow-xl border border-slate-700 transition-all cursor-pointer"
              title="Ảnh tiếp theo"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Displayed Image */}
        <div 
          className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-150"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
          }}
        >
          <img
            src={currentImg}
            alt={`Giấy đăng ký kinh doanh ${currentIndex + 1}`}
            className="max-h-[80vh] max-w-[92vw] sm:max-w-[85vw] object-contain rounded-lg shadow-2xl border border-slate-700"
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) */}
      {images.length > 1 && (
        <div 
          className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-md max-w-3xl overflow-x-auto shrink-0 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setZoom(1);
                setRotation(0);
              }}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                idx === currentIndex
                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 opacity-100 scale-105'
                  : 'border-slate-700 opacity-60 hover:opacity-90'
              }`}
            >
              <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold bg-slate-900/80 text-white px-1 rounded">
                #{idx + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
