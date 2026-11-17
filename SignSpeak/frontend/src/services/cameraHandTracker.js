import { DrawingUtils, HandLandmarker } from '@mediapipe/tasks-vision';
import { classifyCameraError, createHandLandmarker } from '../utils/mediapipe';

const HAND_STYLES = [
  { connector: '#A78BFA', border: '#292544', fill: '#A7F3D0' },
  { connector: '#60A5FA', border: '#292544', fill: '#FED7AA' },
];

export class CameraHandTracker {
  constructor(options = {}) {
    this.videoEl = null;
    this.overlayCanvasEl = null;
    this.captureCanvasEl = null;
    this.lightCanvasEl = null;

    this.stream = null;
    this.handLandmarker = null;
    this.drawingUtilsCtx = null;
    this.drawingUtils = null;

    this.animationFrameId = null;
    this.startRunId = 0;
    this.disposed = false;

    this.status = 'idle';
    this.numHands = options.numHands ?? 2;
    this.minDetectionConfidence = options.minDetectionConfidence ?? 0.6;
    this.minPresenceConfidence = options.minPresenceConfidence ?? 0.6;
    this.minTrackingConfidence = options.minTrackingConfidence ?? 0.6;
    this.targetFps = Math.max(5, Math.min(30, options.targetFps ?? 20));
    this.showOverlay = options.showOverlay ?? true;

    this.lastVideoTime = -1;
    this.lastInferenceTime = 0;
    this.lastDetectTimestamp = 0;
    this.lastLightingCheckTime = 0;
    this.lastHandSeenTime = 0;
    this.frameCounter = { frames: 0, lastSampleTime: 0, fps: 0 };

    this.latestDetection = null;
    this.currentMetrics = {
      fps: 0,
      handsCount: 0,
      handedness: [],
      lightingQuality: 'good',
      noHandWarning: false,
    };

    this.callbacks = {
      onStatusChange: options.onStatusChange,
      onDetection: options.onDetection,
      onMetricsChange: options.onMetricsChange,
      onError: options.onError,
      onDevicesChange: options.onDevicesChange,
    };

    this.runDetectionFrame = this.runDetectionFrame.bind(this);
  }

  attachElements(videoEl, overlayCanvasEl) {
    this.videoEl = videoEl;
    this.overlayCanvasEl = overlayCanvasEl;
    this.drawingUtils = null;
    this.drawingUtilsCtx = null;
  }

  setShowOverlay(enabled) {
    this.showOverlay = enabled;
    if (!enabled) {
      this.clearOverlayCanvas();
    }
  }

  setStatus(nextStatus) {
    this.status = nextStatus;
    if (!this.disposed) {
      this.callbacks.onStatusChange?.(nextStatus);
    }
  }

  emitMetrics(partial) {
    this.currentMetrics = { ...this.currentMetrics, ...partial };
    if (!this.disposed) {
      this.callbacks.onMetricsChange?.(this.currentMetrics);
    }
  }

  clearOverlayCanvas() {
    if (!this.overlayCanvasEl) return;
    const ctx = this.overlayCanvasEl.getContext('2d');
    ctx?.clearRect(0, 0, this.overlayCanvasEl.width, this.overlayCanvasEl.height);
  }

  releaseStreamAndLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }

    this.clearOverlayCanvas();
    this.lastVideoTime = -1;
    this.lastInferenceTime = 0;
    this.latestDetection = null;
    this.emitMetrics({
      fps: 0,
      handsCount: 0,
      handedness: [],
      lightingQuality: 'good',
      noHandWarning: false,
    });
  }

  async refreshVideoDevices() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = allDevices.filter((d) => d.kind === 'videoinput');
      if (!this.disposed) {
        this.callbacks.onDevicesChange?.(cameras);
      }
    } catch {
      // Optional enumeration
    }
  }

  evaluateLighting(video, nowMs) {
    if (nowMs - this.lastLightingCheckTime < 1200) return;
    this.lastLightingCheckTime = nowMs;

    if (!this.lightCanvasEl) {
      this.lightCanvasEl = document.createElement('canvas');
      this.lightCanvasEl.width = 32;
      this.lightCanvasEl.height = 24;
    }

    const lCtx = this.lightCanvasEl.getContext('2d', { willReadFrequently: true });
    if (!lCtx) return;

    try {
      lCtx.drawImage(video, 0, 0, 32, 24);
      const { data } = lCtx.getImageData(0, 0, 32, 24);
      let sum = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const avgLuminance = sum / (pixels || 1);
      const nextQuality = avgLuminance < 42 ? 'too-dark' : avgLuminance > 238 ? 'too-bright' : 'good';
      if (nextQuality !== this.currentMetrics.lightingQuality) {
        this.emitMetrics({ lightingQuality: nextQuality });
      }
    } catch {
      // Ignore pixel sampling edge cases
    }
  }

  drawHandOverlay(canvas, landmarksList) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.showOverlay || landmarksList.length === 0) return;

    if (!this.drawingUtils || this.drawingUtilsCtx !== ctx) {
      this.drawingUtilsCtx = ctx;
      this.drawingUtils = new DrawingUtils(ctx);
    }

    landmarksList.forEach((landmarks, index) => {
      const style = HAND_STYLES[index % HAND_STYLES.length];
      this.drawingUtils.drawConnectors(landmarks, HandLandmarker.HAND_CONNECTIONS, {
        color: style.connector,
        lineWidth: 2.8,
      });
      this.drawingUtils.drawLandmarks(landmarks, {
        color: style.border,
        fillColor: style.fill,
        lineWidth: 1.5,
        radius: 3.8,
      });
    });
  }

  runDetectionFrame() {
    if (this.disposed || this.status !== 'streaming') return;

    const video = this.videoEl;
    const canvas = this.overlayCanvasEl;
    const landmarker = this.handLandmarker;
    const activeStream = this.stream;

    if (!video || !canvas || !landmarker || !activeStream) return;

    const activeTrack = activeStream.getVideoTracks()[0];
    if (!activeStream.active || !activeTrack || activeTrack.readyState === 'ended') {
      this.releaseStreamAndLoop();
      this.setStatus('error');
      this.callbacks.onError?.(classifyCameraError(null, 'disconnected'));
      return;
    }

    if (typeof document !== 'undefined' && document.hidden) {
      this.animationFrameId = requestAnimationFrame(this.runDetectionFrame);
      return;
    }

    const nowMs = performance.now();
    const minIntervalMs = 1000 / this.targetFps;

    if (
      video.readyState >= 2 &&
      video.videoWidth > 0 &&
      video.videoHeight > 0 &&
      video.currentTime !== this.lastVideoTime &&
      nowMs - this.lastInferenceTime >= minIntervalMs
    ) {
      this.lastVideoTime = video.currentTime;
      this.lastInferenceTime = nowMs;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      this.evaluateLighting(video, nowMs);

      const detectTimestamp = Math.max(nowMs, this.lastDetectTimestamp + 1);
      this.lastDetectTimestamp = detectTimestamp;

      const result = landmarker.detectForVideo(video, detectTimestamp);

      this.frameCounter.frames += 1;
      const elapsed = nowMs - this.frameCounter.lastSampleTime;
      if (elapsed >= 500) {
        this.frameCounter.fps = Math.round((this.frameCounter.frames * 1000) / elapsed);
        this.frameCounter.frames = 0;
        this.frameCounter.lastSampleTime = nowMs;
      }

      const detectedLandmarks = result.landmarks || [];
      this.drawHandOverlay(canvas, detectedLandmarks);

      const detectedHands = detectedLandmarks.length;
      const handedness = (result.handedness || []).map((entries) => ({
        categoryName: entries[0]?.categoryName ?? 'Unknown',
        score: entries[0]?.score ?? 0,
      }));

      let noHandWarning = this.currentMetrics.noHandWarning;
      if (detectedHands > 0) {
        this.lastHandSeenTime = nowMs;
        noHandWarning = false;
      } else if (nowMs - this.lastHandSeenTime > 2800) {
        noHandWarning = true;
      }

      this.emitMetrics({
        fps: this.frameCounter.fps,
        handsCount: detectedHands,
        handedness,
        noHandWarning,
      });

      const payload = {
        handsCount: detectedHands,
        landmarksPerHand: detectedLandmarks[0]?.length ?? 21,
        handedness,
        landmarks: detectedLandmarks,
        worldLandmarks: result.worldLandmarks || [],
        timestamp: detectTimestamp,
        fps: this.frameCounter.fps,
        frameWidth: video.videoWidth,
        frameHeight: video.videoHeight,
      };

      this.latestDetection = payload;
      this.callbacks.onDetection?.(payload);
    }

    this.animationFrameId = requestAnimationFrame(this.runDetectionFrame);
  }

  async start(options = {}) {
    if (this.disposed) return undefined;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.setStatus('error');
      this.callbacks.onError?.(classifyCameraError(null, 'browser'));
      return undefined;
    }

    const runId = ++this.startRunId;
    this.releaseStreamAndLoop();
    this.callbacks.onError?.(null);

    try {
      if (!this.handLandmarker) {
        this.setStatus('loading-model');
        try {
          this.handLandmarker = await createHandLandmarker({
            numHands: this.numHands,
            minHandDetectionConfidence: this.minDetectionConfidence,
            minHandPresenceConfidence: this.minPresenceConfidence,
            minTrackingConfidence: this.minTrackingConfidence,
          });
        } catch (modelErr) {
          if (this.disposed || runId !== this.startRunId) return undefined;
          this.releaseStreamAndLoop();
          this.setStatus('error');
          this.callbacks.onError?.(classifyCameraError(modelErr, 'model'));
          return undefined;
        }
      }

      if (this.disposed || runId !== this.startRunId) return undefined;
      this.setStatus('requesting-camera');

      const videoConstraints = options.deviceId
        ? {
            deviceId: { exact: options.deviceId },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          }
        : {
            facingMode: options.facingMode ?? 'user',
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      if (this.disposed || runId !== this.startRunId) {
        stream.getTracks().forEach((track) => track.stop());
        return undefined;
      }

      this.stream = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (this.disposed || runId !== this.startRunId) return;
          this.releaseStreamAndLoop();
          this.setStatus('error');
          this.callbacks.onError?.(classifyCameraError(null, 'disconnected'));
        };
      }

      const activeDeviceId = videoTrack?.getSettings()?.deviceId;
      const video = this.videoEl;
      if (!video) {
        this.releaseStreamAndLoop();
        return undefined;
      }

      video.srcObject = stream;
      await video.play();

      await this.refreshVideoDevices();
      if (this.disposed || runId !== this.startRunId) {
        this.releaseStreamAndLoop();
        return undefined;
      }

      const now = performance.now();
      this.frameCounter = { frames: 0, lastSampleTime: now, fps: 0 };
      this.lastHandSeenTime = now;
      this.lastInferenceTime = 0;

      this.setStatus('streaming');
      this.animationFrameId = requestAnimationFrame(this.runDetectionFrame);

      return activeDeviceId;
    } catch (err) {
      if (this.disposed || runId !== this.startRunId) return undefined;
      this.releaseStreamAndLoop();
      this.setStatus('error');
      this.callbacks.onError?.(classifyCameraError(err, 'camera'));
      return undefined;
    }
  }

  stop() {
    this.startRunId += 1;
    this.releaseStreamAndLoop();
    this.callbacks.onError?.(null);
    this.setStatus('idle');
  }

  captureFrame() {
    const video = this.videoEl;
    if (!video || this.status !== 'streaming' || video.videoWidth === 0) return null;

    if (!this.captureCanvasEl) {
      this.captureCanvasEl = document.createElement('canvas');
    }

    const canvas = this.captureCanvasEl;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const detection = this.latestDetection;

    return {
      imageDataUrl,
      capturedAt: new Date().toISOString(),
      frameWidth: canvas.width,
      frameHeight: canvas.height,
      handsCount: detection?.handsCount ?? 0,
      handedness: detection?.handedness ?? [],
      landmarks: detection?.landmarks ?? [],
    };
  }

  dispose() {
    this.disposed = true;
    this.startRunId += 1;
    this.releaseStreamAndLoop();
    if (this.handLandmarker) {
      this.handLandmarker.close();
      this.handLandmarker = null;
    }
    this.drawingUtils = null;
    this.drawingUtilsCtx = null;
    this.videoEl = null;
    this.overlayCanvasEl = null;
  }
}
