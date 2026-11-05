import React, { useState, useEffect } from 'react';
import { 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize, 
  Minimize, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Clock
} from 'lucide-react';

export interface SlideItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  content: React.ReactNode;
}

interface PresentationModeViewProps {
  moduleName: string;
  moduleIcon?: React.ReactNode;
  slides: SlideItem[];
  onExit: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
}

export default function PresentationModeView({
  moduleName,
  moduleIcon,
  slides,
  onExit,
  isSidebarHidden = false,
  onToggleSidebar
}: PresentationModeViewProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-play timer
  useEffect(() => {
    let interval: any;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        setCurrentSlideIndex(prev => (prev + 1) % slides.length);
      }, 10000); // 10 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const nextSlide = () => {
    setCurrentSlideIndex(prev => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex(prev => (prev - 1 + slides.length) % slides.length);
  };

  const currentSlide = slides[currentSlideIndex] || slides[0];

  return (
    <div className="flex flex-col h-full min-h-[85vh] bg-slate-950 text-white rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* Top Presentation Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-800 gap-3 shrink-0">
        
        {/* Module Title & Slide Title */}
        <div className="flex items-center space-x-3">
          {moduleIcon || <Tv className="w-5 h-5 text-indigo-400" />}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-widest">
                {moduleName} • Gemba Presentation Mode
              </span>
              {currentSlide?.badge && (
                <span className="text-[9px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">
                  {currentSlide.badge}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
              <span>{currentSlide?.title}</span>
            </h2>
          </div>
        </div>

        {/* Presentation Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          
          {/* Hide/Show Left Window (Sidebar) Provision */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition border cursor-pointer ${
                isSidebarHidden 
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isSidebarHidden ? "Show Left Navigation Window" : "Hide Left Navigation Window for Fullscreen"}
            >
              {isSidebarHidden ? (
                <>
                  <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Show Left Window</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-4 h-4 text-slate-400" />
                  <span className="hidden sm:inline">Hide Left Window</span>
                </>
              )}
            </button>
          )}

          {/* Auto-Play Toggle */}
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono transition border cursor-pointer ${
              isAutoPlaying 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Auto-play slides (10s cycle)"
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">{isAutoPlaying ? 'Playing' : 'Auto-Cycle'}</span>
          </button>

          {/* Slide Navigation */}
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={prevSlide}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Previous Slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold px-2 text-slate-200">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <button
              onClick={nextSlide}
              className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
              title="Next Slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition cursor-pointer"
            title="Toggle Browser Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Exit Presentation Mode */}
          <button
            onClick={onExit}
            className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition cursor-pointer"
            title="Exit Presentation Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Slide Content Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
        <div className="animate-fade-in max-w-7xl mx-auto">
          {currentSlide?.content}
        </div>
      </div>

      {/* Bottom Slide Dots & Progress Bar */}
      <div className="bg-slate-900/60 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlideIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentSlideIndex 
                  ? 'w-8 bg-indigo-500' 
                  : 'w-2 bg-slate-700 hover:bg-slate-600'
              }`}
              title={s.title}
            />
          ))}
        </div>
        <div className="flex items-center space-x-4 text-[11px] font-mono text-slate-500">
          <span>TV Gemba Mode</span>
          {isSidebarHidden && (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
              Left Window Hidden
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
