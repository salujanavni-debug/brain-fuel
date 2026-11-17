import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const DEFAULT_LOCAL_WASM_PATH =
  import.meta.env?.VITE_MEDIAPIPE_WASM_PATH || '/mediapipe/wasm';
const FALLBACK_CDN_WASM_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';

const DEFAULT_LOCAL_MODEL_PATH =
  import.meta.env?.VITE_MEDIAPIPE_MODEL_URL || '/mediapipe/models/hand_landmarker.task';
const FALLBACK_CDN_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function resolveVisionFileset() {
  try {
    return await FilesetResolver.forVisionTasks(DEFAULT_LOCAL_WASM_PATH);
  } catch {
    return await FilesetResolver.forVisionTasks(FALLBACK_CDN_WASM_PATH);
  }
}

async function createWithModelPath(
  vision,
  modelAssetPath,
  { numHands, minHandDetectionConfidence, minHandPresenceConfidence, minTrackingConfidence }
) {
  const buildOptions = (delegate) => ({
    baseOptions: {
      modelAssetPath,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands,
    minHandDetectionConfidence,
    minHandPresenceConfidence,
    minTrackingConfidence,
  });

  try {
    return await HandLandmarker.createFromOptions(vision, buildOptions('GPU'));
  } catch {
    return await HandLandmarker.createFromOptions(vision, buildOptions('CPU'));
  }
}

export async function createHandLandmarker({
  numHands = 2,
  minHandDetectionConfidence = 0.6,
  minHandPresenceConfidence = 0.6,
  minTrackingConfidence = 0.6,
} = {}) {
  const vision = await resolveVisionFileset();
  const resolvedConfig = {
    numHands,
    minHandDetectionConfidence,
    minHandPresenceConfidence,
    minTrackingConfidence,
  };

  try {
    return await createWithModelPath(vision, DEFAULT_LOCAL_MODEL_PATH, resolvedConfig);
  } catch (localErr) {
    if (DEFAULT_LOCAL_MODEL_PATH === FALLBACK_CDN_MODEL_PATH) {
      throw localErr;
    }
    return await createWithModelPath(vision, FALLBACK_CDN_MODEL_PATH, resolvedConfig);
  }
}

export function classifyCameraError(err, context = 'camera') {
  if (context === 'browser') {
    return {
      kind: 'unsupported-browser',
      title: 'Camera Unsupported in This Browser',
      message:
        'Your current browser or security context does not support webcam capture (MediaDevices API).',
      steps: [
        'Use a modern browser such as Chrome, Edge, Firefox, or Safari over HTTPS.',
        'Or switch immediately to Quick Messages or Two-Way Communication without needing a camera.',
      ],
    };
  }

  if (context === 'disconnected') {
    return {
      kind: 'disconnected',
      title: 'Camera Disconnected During Translation',
      message: 'Your webcam stream stopped unexpectedly while translating.',
      steps: [
        'Check that your external USB camera or laptop camera cover is connected.',
        'Click Retry Camera below, or switch to Quick Messages to continue communicating.',
      ],
    };
  }

  if (context === 'model') {
    const offlineHint =
      typeof navigator !== 'undefined' && !navigator.onLine
        ? 'You appear to be offline and the hand-tracking model weights are not cached locally yet.'
        : 'The MediaPipe hand-tracking model could not finish downloading or initializing.';
    return {
      kind: 'model-load',
      title: 'Hand-Tracking Model Unavailable',
      message: offlineHint,
      steps: [
        'Check your internet connection and click Retry Camera.',
        'If you are offline, use Quick Messages or Two-Way Communication — both work without a camera or internet.',
      ],
    };
  }

  if (!err || typeof err !== 'object') {
    return {
      kind: 'initialization-failed',
      title: 'Webcam Initialization Failed',
      message: 'We could not start your webcam feed.',
      steps: [
        'Close unused browser tabs or apps and click Retry Camera.',
        'Switch to Quick Messages anytime to communicate right away.',
      ],
    };
  }

  const name = err.name || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return {
      kind: 'permission-denied',
      title: 'Camera Permission Denied',
      message: 'SignSpeak needs camera access to see hand signs, and permission was blocked.',
      steps: [
        'Click the camera or lock icon next to your browser address bar and choose "Allow" for Camera.',
        'Reload or click Retry Camera once enabled, or switch to Quick Messages right now.',
      ],
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      kind: 'not-found',
      title: 'No Camera Found',
      message: 'No webcam device was detected on this computer or phone.',
      steps: [
        'Plug in a webcam or verify your device camera is enabled in system settings.',
        'No camera available? Switch to Quick Messages or Two-Way Communication.',
      ],
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return {
      kind: 'in-use',
      title: 'Camera Busy in Another App',
      message:
        'Your webcam appears to be open in another application (such as Zoom, Teams, Meet, or another browser tab).',
      steps: [
        'Close other video apps or tabs using your camera.',
        'Click Retry Camera, or switch to Quick Messages while on your call.',
      ],
    };
  }

  if (name === 'OverconstrainedError') {
    return {
      kind: 'overconstrained',
      title: 'Camera Resolution Unsupported',
      message: 'The selected camera does not support the requested video settings.',
      steps: [
        'Try choosing another camera if available or click Retry Camera.',
        'You can also use Quick Messages without any camera.',
      ],
    };
  }

  return {
    kind: 'initialization-failed',
    title: 'Webcam Initialization Failed',
    message: err.message || 'Failed to start your webcam or hand-tracking detector.',
    steps: [
      'Ensure no privacy shutter is blocking the camera and click Retry Camera.',
      'Use Quick Messages to communicate immediately without a camera.',
    ],
  };
}

export function getCameraErrorMessage(err) {
  return classifyCameraError(err, 'camera').message;
}
