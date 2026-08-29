import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RotateCw, AlertTriangle, Check } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
  title?: string;
}

export default function CameraModal({ isOpen, onClose, onCapture, title = 'Take Photo' }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Attach stream to video element whenever either becomes available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!isOpen) return;

    async function initCamera() {
      try {
        setPermissionError(null);

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: selectedDeviceId
            ? { deviceId: { exact: selectedDeviceId } }
            : { facingMode: 'environment' },
        });

        setStream(mediaStream);

        // Get video input devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);

        if (videoDevices.length > 0 && !selectedDeviceId) {
          const activeTrack = mediaStream.getVideoTracks()[0];
          if (activeTrack) {
            const settings = activeTrack.getSettings();
            if (settings.deviceId) setSelectedDeviceId(settings.deviceId);
          }
        }
      } catch (err: any) {
        console.warn('Camera access error:', err);
        setPermissionError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please allow camera access in your browser settings, then try again.'
            : err.name === 'NotFoundError'
            ? 'No camera device found on this device.'
            : err.message || 'Could not access the camera. Please use the file upload option instead.'
        );
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
        video: { deviceId: { exact: deviceId } },
      });
      setStream(mediaStream);
    } catch (err: any) {
      console.error('Failed to switch camera:', err);
      setPermissionError('Could not switch to selected camera.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      onCapture(dataUrl);
      stopCamera();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">

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

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Error / permission denied banner */}
          {permissionError && (
            <div className="bg-amber-950/40 border border-amber-900/50 p-3 rounded-xl flex items-start space-x-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold mb-1">Camera not available</p>
                <p>{permissionError}</p>
              </div>
            </div>
          )}

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
            {stream && (
              <div className="absolute inset-8 border border-white/20 pointer-events-none rounded flex items-center justify-center">
                <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400 absolute top-0 left-0" />
                <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400 absolute top-0 right-0" />
                <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400 absolute bottom-0 left-0" />
                <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400 absolute bottom-0 right-0" />
                <div className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full" />
              </div>
            )}

            {/* Loading spinner */}
            {!stream && !permissionError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-t-indigo-400 border-slate-700 animate-spin" />
                <span className="text-slate-400">Requesting camera access...</span>
              </div>
            )}

            {/* Error state overlay */}
            {permissionError && !stream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-xs space-y-2 bg-slate-950/80">
                <Camera className="w-10 h-10 text-slate-600" />
                <span className="text-slate-500">Camera unavailable</span>
              </div>
            )}
          </div>

          {/* Device switcher */}
          {devices.length > 1 && (
            <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
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

          {/* Capture button */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!stream}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center space-x-2 transition shadow-md disabled:cursor-not-allowed disabled:text-slate-500"
            >
              <Camera className="w-4 h-4" />
              <span>{stream ? 'Capture Shot' : 'Waiting for camera...'}</span>
            </button>
          </div>

        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

      </div>
    </div>
  );
}
