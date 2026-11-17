import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Hand,
  MessageSquareHeart,
  ScanFace,
  ShieldCheck,
  Sun,
  Video,
} from 'lucide-react';
import { Button } from './Button';
import { LoadingState } from './LoadingState';
import { StatusIndicator } from './StatusIndicator';
import { CameraHandTracker } from '../services/cameraHandTracker';

export function CameraView({
  onLandmarksDetected,
  onFrameCapture,
  onStatusChange,
  numHands = 2,
  minDetectionConfidence = 0.6,
  minPresenceConfidence = 0.6,
  minTrackingConfidence = 0.6,
  targetFps = 20,
  initialShowOverlay = true,
  initialMirrored = true,
}) {
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const trackerRef = useRef(null);

  const onLandmarksRef = useRef(onLandmarksDetected);
  const onFrameCaptureRef = useRef(onFrameCapture);
  const onStatusChangeRef = useRef(onStatusChange);

  const [status, setStatus] = useState('idle');
  const [errorInfo, setErrorInfo] = useState(null);
  const [showOverlay, setShowOverlay] = useState(initialShowOverlay);
  const [mirrored, setMirrored] = useState(initialMirrored);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [metrics, setMetrics] = useState({
    fps: 0,
    handsCount: 0,
    handedness: [],
    lightingQuality: 'good',
    noHandWarning: false,
  });

  useEffect(() => {
    onLandmarksRef.current = onLandmarksDetected;
  }, [onLandmarksDetected]);

  useEffect(() => {
    onFrameCaptureRef.current = onFrameCapture;
  }, [onFrameCapture]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    const tracker = new CameraHandTracker({
      numHands,
      minDetectionConfidence,
      minPresenceConfidence,
      minTrackingConfidence,
      targetFps,
      showOverlay: initialShowOverlay,
      onStatusChange: (nextStatus) => {
        setStatus(nextStatus);
        onStatusChangeRef.current?.(nextStatus);
      },
      onDetection: (payload) => {
        onLandmarksRef.current?.(payload);
      },
      onMetricsChange: (nextMetrics) => {
        setMetrics(nextMetrics);
      },
      onError: (nextError) => {
        setErrorInfo(nextError);
      },
      onDevicesChange: (nextDevices) => {
        setDevices(nextDevices);
      },
    });

    tracker.attachElements(videoRef.current, overlayCanvasRef.current);
    trackerRef.current = tracker;

    const handlePageHide = () => {
      tracker.stop();
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      tracker.dispose();
      trackerRef.current = null;
    };
  }, [
    initialShowOverlay,
    minDetectionConfidence,
    minPresenceConfidence,
    minTrackingConfidence,
    numHands,
    targetFps,
  ]);

  useEffect(() => {
    trackerRef.current?.setShowOverlay(showOverlay);
  }, [showOverlay]);

  const startCamera = useCallback(
    async (overrideDeviceId) => {
      const tracker = trackerRef.current;
      if (!tracker) return;
      tracker.attachElements(videoRef.current, overlayCanvasRef.current);
      const activeId = await tracker.start({
        deviceId: overrideDeviceId ?? (selectedDeviceId || undefined),
        facingMode: 'user',
      });
      if (activeId && !selectedDeviceId) {
        setSelectedDeviceId(activeId);
      }
    },
    [selectedDeviceId]
  );

  const stopCamera = useCallback(() => {
    trackerRef.current?.stop();
  }, []);

  const handleCaptureFrame = useCallback(() => {
    const frame = trackerRef.current?.captureFrame();
    if (frame) {
      onFrameCaptureRef.current?.(frame);
    }
  }, []);

  const handleDeviceChange = useCallback(
    async (event) => {
      const nextId = event.target.value;
      setSelectedDeviceId(nextId);
      if (status === 'streaming') {
        await startCamera(nextId);
      }
    },
    [startCamera, status]
  );

  const isBusy = status === 'loading-model' || status === 'requesting-camera';
  const isStreaming = status === 'streaming';
  const handDetected = isStreaming && metrics.handsCount > 0;
  const handednessLabels = metrics.handedness
    .map((entry) => entry.categoryName)
    .filter((label) => label && label !== 'Unknown')
    .join(', ');

  return (
    <div className="overflow-hidden rounded-3xl border border-[#EDE9FE] bg-white shadow-[0_14px_34px_-16px_rgba(41,37,68,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE9FE] px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-[#292544]">Camera Feed &amp; Hand Landmarks</h2>
          <p className="mt-0.5 text-xs text-[#292544]/70">
            MediaPipe Hand Landmarker ·{' '}
            <span className="font-mono tabular-nums">
              {isStreaming
                ? `${metrics.fps} FPS · Up to ${numHands} hands · 21 landmarks/hand`
                : 'Standby'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {status === 'streaming' && <StatusIndicator state="ok" label="Camera Active" />}
          {status === 'loading-model' && <StatusIndicator state="pending" label="Loading Hand Model" />}
          {status === 'requesting-camera' && <StatusIndicator state="pending" label="Requesting Permission" />}
          {status === 'error' && <StatusIndicator state="error" label={errorInfo?.title || 'Camera Unavailable'} />}
          {status === 'idle' && <StatusIndicator state="pending" label="Camera Standby" />}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs font-bold sm:px-6 ${
          handDetected
            ? 'border-[#6EE7B7]/60 bg-[#A7F3D0]/35 text-[#065F46]'
            : isStreaming
              ? 'border-[#DDD6FE] bg-[#EDE9FE]/45 text-[#4C1D95]'
              : 'border-[#EDE9FE] bg-[#FFFCF8] text-[#292544]/65'
        }`}
      >
        <span className="inline-flex items-center gap-2">
          <Hand className="h-4 w-4 shrink-0" aria-hidden="true" />
          {handDetected ? (
            <span>
              Hand Detected: {metrics.handsCount} of {numHands} hand
              {metrics.handsCount === 1 ? '' : 's'}
              {handednessLabels ? ` (${handednessLabels})` : ''} · {metrics.handsCount * 21} landmarks
            </span>
          ) : isStreaming ? (
            <span>No Hand Detected — Hold 1 or 2 hands inside the frame</span>
          ) : (
            <span>Hand Detection Standby — Click Start Camera below</span>
          )}
        </span>

        {isStreaming && (
          <span className="font-mono text-[11px] tabular-nums opacity-85">
            {showOverlay ? 'Overlay: Points + Connections' : 'Overlay: Hidden'}
          </span>
        )}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#292544] via-[#342E56] to-[#292544] sm:aspect-video">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-contain transition-transform duration-150 ${
            mirrored ? '-scale-x-100' : ''
          }`}
        />
        <canvas
          ref={overlayCanvasRef}
          className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
            mirrored ? '-scale-x-100' : ''
          }`}
        />

        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-br from-[#EDE9FE]/95 via-[#FFFCF8]/95 to-[#BFDBFE]/85 px-5 py-6 text-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7C3AED] shadow-sm">
              <Video className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-[#292544]">Camera Preview Ready</h3>
            <p className="mt-1.5 max-w-md text-sm text-[#292544]/80">
              Click <strong>Start Camera</strong> and choose <strong>Allow</strong> when your
              browser asks for webcam permission to track up to 2 hands (21 landmarks each) in real
              time.
            </p>
            <div className="mt-3 inline-flex max-w-md items-center gap-2 rounded-2xl border border-[#DDD6FE] bg-white/90 px-3.5 py-2 text-xs font-semibold text-[#292544]/75">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#047857]" aria-hidden="true" />
              <span>
                Video is processed locally in your browser. Nothing is recorded or uploaded without
                your action.
              </span>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => startCamera()} variant="primary" size="lg">
                <Camera className="h-5 w-5" aria-hidden="true" />
                <span>Start Camera</span>
              </Button>
              <Button to="/quick-messages" variant="outline" size="lg">
                <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
                <span>Use Quick Messages</span>
              </Button>
            </div>
          </div>
        )}

        {isBusy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFFCF8]/94 px-6 text-center">
            <LoadingState
              label={
                status === 'loading-model'
                  ? 'Initializing MediaPipe Hand Landmarker model...'
                  : 'Waiting for webcam permission — please select Allow in your browser prompt...'
              }
            />
          </div>
        )}

        {status === 'error' && errorInfo && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-[#FFFCF8]/96 px-5 py-6 text-center"
          >
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#FED7AA] text-[#9A3412]">
              <CameraOff className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-[#292544]">{errorInfo.title}</h3>
            <p className="mt-1 max-w-md text-sm font-semibold text-[#292544]/80">{errorInfo.message}</p>
            <ul className="mt-3 max-w-md space-y-1 text-left text-xs text-[#292544]/75">
              {errorInfo.steps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B45309]" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => startCamera()} variant="primary" size="md">
                <Camera className="h-4 w-4" aria-hidden="true" />
                <span>Retry Camera</span>
              </Button>
              <Button to="/quick-messages" variant="mint" size="md">
                <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
                <span>Switch to Quick Messages</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {isStreaming && (metrics.lightingQuality !== 'good' || metrics.noHandWarning) && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[#FDBA74] bg-[#FED7AA]/55 px-4 py-3 text-xs text-[#292544] sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-4 font-bold">
            {metrics.lightingQuality !== 'good' && (
              <span className="inline-flex items-center gap-1.5 text-[#9A3412]">
                <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {metrics.lightingQuality === 'too-dark'
                    ? 'Poor lighting (too dark): Move toward brighter front light so your hand is clearly visible.'
                    : 'Poor lighting (too bright): Reduce glare behind your hand for accurate tracking.'}
                </span>
              </span>
            )}
            {metrics.noHandWarning && (
              <span className="inline-flex items-center gap-1.5 text-[#292544]">
                <Hand className="h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />
                <span>
                  No hand detected: Center your palm 40–70 cm in front of the camera, or switch to
                  Quick Messages.
                </span>
              </span>
            )}
          </div>
          <Button to="/quick-messages" variant="outline" size="sm">
            <span>Switch to Quick Messages</span>
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE9FE] bg-[#FFFCF8] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => startCamera()}
            disabled={isStreaming || isBusy}
            variant="primary"
            size="md"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>Start Camera</span>
          </Button>
          <Button onClick={stopCamera} disabled={!isStreaming && !isBusy} variant="peach" size="md">
            <CameraOff className="h-4 w-4" aria-hidden="true" />
            <span>Stop Camera</span>
          </Button>
          <Button onClick={handleCaptureFrame} disabled={!isStreaming} variant="outline" size="md">
            <ScanFace className="h-4 w-4" aria-hidden="true" />
            <span>Capture Frame</span>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {devices.length > 1 && (
            <select
              aria-label="Select camera device"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="min-h-[44px] max-w-[190px] truncate rounded-xl border border-[#EDE9FE] bg-white px-3 py-2 text-xs font-bold text-[#292544] focus:border-[#A78BFA] focus:outline-none"
            >
              {devices.map((device, index) => (
                <option key={device.deviceId || index} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          )}
          <Button onClick={() => setShowOverlay((prev) => !prev)} variant={showOverlay ? 'secondary' : 'outline'} size="sm">
            {showOverlay ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            <span>{showOverlay ? 'Landmarks On' : 'Landmarks Off'}</span>
          </Button>
          <Button onClick={() => setMirrored((prev) => !prev)} variant={mirrored ? 'blue' : 'outline'} size="sm">
            <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
            <span>{mirrored ? 'Mirrored' : 'Original'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
