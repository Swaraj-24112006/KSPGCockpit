import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Download, Maximize2 } from 'lucide-react';

interface PhotoZoomModalProps {
  photoUrl: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export default function PhotoZoomModal({
  photoUrl,
  title,
  subtitle,
  onClose
}: PhotoZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Keyboard navigation & Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      } else if (e.key === '0') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.5, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[10000] flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in font-sans select-none">
      
      {/* Top Controls Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl z-10 text-white">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase font-mono px-2 py-0.5 rounded">
              High-Res Photo Inspector
            </span>
            {subtitle && <span className="text-xs text-slate-400 font-mono hidden sm:inline">{subtitle}</span>}
          </div>
          <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100 mt-0.5">
            {title}
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* Zoom Level Indicator */}
          <span className="px-2.5 py-1 bg-slate-800 text-amber-400 font-mono text-xs font-bold rounded-xl border border-slate-700 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-xl transition cursor-pointer border border-slate-700"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-xl transition cursor-pointer border border-slate-700"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Rotate Button */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer border border-slate-700"
            title="Rotate 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer border border-slate-700"
            title="Reset Zoom & Rotation (0)"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Close Modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition cursor-pointer shadow-md ml-2"
            title="Close Inspector (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Center Image Container */}
      <div className="flex-1 w-full max-w-6xl my-4 overflow-auto flex items-center justify-center p-2 sm:p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 shadow-2xl relative">
        <div className="transition-transform duration-200 ease-out flex items-center justify-center">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Bottom Keyboard Guide */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-center text-[11px] font-mono text-slate-400 flex items-center justify-around">
        <span><strong className="text-white">+ / -</strong> Zoom</span>
        <span><strong className="text-white">R</strong> Rotate</span>
        <span><strong className="text-white">0</strong> Reset</span>
        <span><strong className="text-white">ESC</strong> Close</span>
      </div>

    </div>
  );
}
