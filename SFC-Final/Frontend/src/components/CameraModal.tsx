import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCw, AlertTriangle, Sparkles, Check } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

// Beautiful simulated shopfloor photo presets so users can test even if cameras are blocked or not present
const SIMULATED_PHOTOS = [
  {
    name: 'Vacuum Pump Line',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><circle cx="300" cy="200" r="120" fill="none" stroke="%2338bdf8" stroke-width="8" stroke-dasharray="8 8"/><circle cx="300" cy="200" r="80" fill="%230f172a" stroke="%23f43f5e" stroke-width="6"/><path d="M220,200 L380,200 M300,120 L300,280" stroke="%2338bdf8" stroke-width="4"/><rect x="50" y="50" width="120" height="40" rx="6" fill="%230284c7"/><text x="110" y="75" font-family="sans-serif" font-weight="bold" font-size="12" fill="white" text-anchor="middle">MF1 CAMERA 1</text><text x="300" y="360" font-family="sans-serif" font-weight="bold" font-size="16" fill="%2338bdf8" text-anchor="middle">VACUUM PUMP TEST RIG - SIMULATED CAPTURE</text></svg>`,
  },
  {
    name: 'EGR Valve Calibrator',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><rect x="150" y="100" width="300" height="200" rx="10" fill="%23334155" stroke="%2310b981" stroke-width="4"/><path d="M200,200 Q300,100 400,200 T600,200" fill="none" stroke="%2310b981" stroke-width="3"/><circle cx="300" cy="200" r="30" fill="%230f172a" stroke="%23f59e0b" stroke-width="4"/><rect x="50" y="50" width="120" height="40" rx="6" fill="%23059669"/><text x="110" y="75" font-family="sans-serif" font-weight="bold" font-size="12" fill="white" text-anchor="middle">MF2 CAMERA 3</text><text x="300" y="360" font-family="sans-serif" font-weight="bold" font-size="16" fill="%2310b981" text-anchor="middle">EGR FLOW VALVE ASSEMBLY - SIMULATED CAPTURE</text></svg>`,
  },
  {
    name: 'BPV Packaging Zone',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%230f172a"/><rect x="100" y="80" width="400" height="240" rx="8" fill="none" stroke="%2364748b" stroke-dasharray="10 5" stroke-width="4"/><line x1="100" y1="200" x2="500" y2="200" stroke="%2338bdf8" stroke-width="8"/><circle cx="200" cy="200" r="20" fill="%23f59e0b"/><circle cx="300" cy="200" r="20" fill="%23f59e0b"/><circle cx="400" cy="200" r="20" fill="%23f59e0b"/><rect x="50" y="50" width="120" height="40" rx="6" fill="%23475569"/><text x="110" y="75" font-family="sans-serif" font-weight="bold" font-size="12" fill="white" text-anchor="middle">MF3 CAMERA 5</text><text x="300" y="360" font-family="sans-serif" font-weight="bold" font-size="16" fill="%2394a3b8" text-anchor="middle">BPV PACKAGING CONVEYOR - SIMULATED CAPTURE</text></svg>`,
  },
  {
    name: 'Machining Center Area',
    url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%2318181b"/><path d="M100,300 L250,100 L400,300 Z" fill="none" stroke="%23f59e0b" stroke-width="6"/><circle cx="250" cy="180" r="40" fill="%2327272a" stroke="%23ef4444" stroke-width="4"/><rect x="50" y="50" width="120" height="40" rx="6" fill="%23d97706"/><text x="110" y="75" font-family="sans-serif" font-weight="bold" font-size="12" fill="white" text-anchor="middle">MC CAMERA 2</text><text x="300" y="360" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23f59e0b" text-anchor="middle">PUMP CASTING ROTARY GRINDER - SIMULATED CAPTURE</text></svg>`,
  }
];

export default function CameraModal({ isOpen, onClose, onCapture, title = 'Take Photo' }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'live' | 'presets'>('live');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Detect camera devices
    async function initCamera() {
      try {
        setPermissionError(null);
        setFallbackMode(false);
        setActiveTab('live');

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Get video input devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0) {
          const activeTrack = mediaStream.getVideoTracks()[0];
          if (activeTrack) {
            const settings = activeTrack.getSettings();
            if (settings.deviceId) {
              setSelectedDeviceId(settings.deviceId);
            }
          }
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setPermissionError(
          err.message || 
          'Camera access not allowed or blocked by iframe sandbox configuration. Please use simulated presets instead.'
        );
        setFallbackMode(true);
        setActiveTab('presets');
      }
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    stopCamera();
    setSelectedDeviceId(deviceId);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Failed to switch camera:', err);
      setPermissionError('Could not switch to selected camera. Reverting...');
    }
  };

  const capturePhoto = () => {
    if (activeTab === 'presets') return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      // Draw frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onCapture(dataUrl);
      stopCamera();
      onClose();
    }
  };

  const selectPreset = (url: string) => {
    onCapture(url);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase font-sans text-slate-100">
              {title}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={() => { stopCamera(); onClose(); }} 
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs (Live vs Presets) */}
        <div className="flex bg-slate-950/40 p-1 border-b border-slate-800 text-xs">
          <button
            type="button"
            disabled={fallbackMode}
            onClick={() => setActiveTab('live')}
            className={`flex-1 py-2 text-center rounded-lg font-bold transition ${
              activeTab === 'live' 
                ? 'bg-slate-800 text-indigo-400 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            🎥 Live Camera Feed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 text-center rounded-lg font-bold transition ${
              activeTab === 'presets' 
                ? 'bg-slate-800 text-indigo-400 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🖼️ Industrial Preset Photos (Fallback)
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5">
          {activeTab === 'live' ? (
            <div className="space-y-4">
              {/* Camera view screen */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                
                {/* Visual target reticle overlay */}
                <div className="absolute inset-8 border border-white/20 pointer-events-none rounded flex items-center justify-center">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400 absolute top-0 left-0" />
                  <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400 absolute top-0 right-0" />
                  <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400 absolute bottom-0 left-0" />
                  <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400 absolute bottom-0 right-0" />
                  <div className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full" />
                </div>

                {!stream && !permissionError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-xs space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-t-indigo-400 border-slate-700 animate-spin" />
                    <span className="text-slate-400">Requesting media streams...</span>
                  </div>
                )}
              </div>

              {/* Devices selector */}
              {devices.length > 1 && (
                <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    Switch Camera:
                  </span>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none"
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Take snapshot CTA */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!stream}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center space-x-2 transition shadow-md disabled:cursor-not-allowed"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Shot</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {permissionError && (
                <div className="bg-amber-950/40 border border-amber-900/50 p-3 rounded-xl flex items-start space-x-2 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p>{permissionError}</p>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                Select a beautiful high-fidelity mock shopfloor photo capture to skip camera permissions:
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {SIMULATED_PHOTOS.map((sim, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectPreset(sim.url)}
                    className="flex flex-col text-left border border-slate-800 hover:border-indigo-500 bg-slate-950/50 rounded-xl overflow-hidden group transition p-2"
                  >
                    <div className="aspect-video w-full rounded-lg bg-slate-900 overflow-hidden relative border border-slate-800">
                      <img src={sim.url} alt={sim.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-300" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] bg-slate-950/90 text-indigo-400 font-bold px-2 py-1 rounded border border-indigo-500/30">
                          Select Photo
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-300 mt-1.5 px-0.5 group-hover:text-indigo-400 transition">
                      {sim.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hidden capture canvas helper */}
        <canvas ref={canvasRef} className="hidden" />

      </div>
    </div>
  );
}
