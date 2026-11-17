import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  Check,
  Copy,
  Database,
  HelpCircle,
  MessageCircle,
  MessageSquareHeart,
  Pause,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
  Trash2,
  Volume2,
  WifiOff,
} from 'lucide-react';
import { Button } from '../components/Button';
import { CameraView } from '../components/CameraView';
import { Card } from '../components/Card';
import { DatasetCollectorCard } from '../components/DatasetCollectorCard';
import { StatusIndicator } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { saveTranslationHistoryText } from '../services/supabaseDataService';
import { getRecognitionStatus, recognizeLandmarks } from '../services/translationService';
import {
  ISL_PROTOTYPE_DISCLAIMER,
  PredictionPostProcessor,
  PROTOTYPE_VOCABULARY,
  SequenceRingBuffer,
} from '../utils/landmarkPostProcessor';
import {
  copyToClipboard,
  getAllVoices,
  isSpeechSupported,
  pauseSpeech,
  resumeSpeech,
  speakTextDetailed,
  stopSpeech,
} from '../utils/speech';

const HISTORY_STORAGE_KEY = 'signspeak_translation_history_v1';
const MAX_LOCAL_HISTORY = 50;

function loadLocalHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_LOCAL_HISTORY) : [];
  } catch {
    return [];
  }
}

export function TranslatorPage() {
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [modelStatus, setModelStatus] = useState(null);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.7);
  const [autoRecognize, setAutoRecognize] = useState(true);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showCollector, setShowCollector] = useState(false);

  const [translationText, setTranslationText] = useState('');
  const [sentenceText, setSentenceText] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [postDecision, setPostDecision] = useState(null);
  const [history, setHistory] = useState(() => loadLocalHistory());
  const [copiedTarget, setCopiedTarget] = useState(null);

  const [voices, setVoices] = useState(() => getAllVoices());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [playbackState, setPlaybackState] = useState('idle');
  const [activeSpokenText, setActiveSpokenText] = useState('');
  const [ttsNotice, setTtsNotice] = useState(null);

  const [backendPendingNotice, setBackendPendingNotice] = useState('');
  const [sendingToBackend, setSendingToBackend] = useState(false);
  const [recognitionUncertain, setRecognitionUncertain] = useState(false);

  const sequenceBufferRef = useRef(new SequenceRingBuffer(24));
  const postProcessorRef = useRef(
    new PredictionPostProcessor({
      windowSize: 5,
      minConsensus: 3,
      duplicateCooldownMs: 2500,
      confidenceThreshold: 0.7,
    })
  );
  const lastAutoInferRef = useRef(0);
  // Tracks the gesture currently held in front of the camera to prevent repetitive speech
  const activeSpokenGestureRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(history.slice(0, MAX_LOCAL_HISTORY))
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [history]);

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const syncVoices = () => {
      const list = getAllVoices();
      setVoices(list);
    };
    syncVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', syncVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', syncVoices);
      stopSpeech();
    };
  }, []);

  useEffect(() => {
    let active = true;
    getRecognitionStatus()
      .then((info) => {
        if (active) {
          setModelStatus(info);
          if (typeof info.confidence_threshold === 'number') {
            setConfidenceThreshold(info.confidence_threshold);
            postProcessorRef.current.setConfidenceThreshold(info.confidence_threshold);
          }
        }
      })
      .catch(() => {
        // Offline or server unreachable; UI handles gracefully
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    postProcessorRef.current.setConfidenceThreshold(confidenceThreshold);
  }, [confidenceThreshold]);

  const startSpeechPlayback = useCallback(
    (textToSpeak) => {
      const trimmed = textToSpeak.trim();
      if (!trimmed) return;
      setTtsNotice(null);
      setActiveSpokenText(trimmed);

      const res = speakTextDetailed(trimmed, {
        voiceURI: selectedVoiceURI || undefined,
        onStart: () => setPlaybackState('speaking'),
        onPause: () => setPlaybackState('paused'),
        onResume: () => setPlaybackState('speaking'),
        onEnd: () => {
          setPlaybackState('idle');
          setActiveSpokenText('');
        },
        onError: (msg) => {
          setPlaybackState('idle');
          setActiveSpokenText('');
          setTtsNotice(msg);
        },
      });
      if (!res.started && res.error) {
        setPlaybackState('idle');
        setTtsNotice(res.error);
      }
    },
    [selectedVoiceURI]
  );

  const handlePauseSpeech = useCallback(() => {
    if (pauseSpeech()) {
      setPlaybackState('paused');
    }
  }, []);

  const handleResumeSpeech = useCallback(() => {
    if (resumeSpeech()) {
      setPlaybackState('speaking');
    }
  }, []);

  const handleStopSpeech = useCallback(() => {
    stopSpeech();
    setPlaybackState('idle');
    setActiveSpokenText('');
  }, []);

  const runRecognitionRequest = useCallback(
    async (payload, isManualTrigger) => {
      if (!isOnline) {
        if (isManualTrigger) {
          setRecognitionUncertain(true);
          setBackendPendingNotice(
            'Internet connection is offline. Backend AI sign recognition cannot run offline — please use Quick Messages or Two-Way Communication instead.'
          );
        }
        return;
      }

      if (!payload || payload.handsCount === 0) {
        if (isManualTrigger) {
          setRecognitionUncertain(true);
          setBackendPendingNotice(
            'No hand detected yet. Hold one or both hands in front of the camera, or select a phrase manually in Quick Messages.'
          );
        }
        return;
      }

      setSendingToBackend(true);
      if (isManualTrigger) {
        setBackendPendingNotice('');
      }

      try {
        const recentSequence = sequenceBufferRef.current.getFrames();
        const result = await recognizeLandmarks(payload, {
          sequence: recentSequence,
          confidenceThreshold,
        });

        const decision = postProcessorRef.current.process(
          result,
          Date.now(),
          !isManualTrigger
        );
        setPostDecision(decision);

        if (result.recognition_status === 'model_unavailable') {
          setConfidence(0);
          setRecognitionUncertain(true);
          setBackendPendingNotice(result.detail);
          return;
        }

        setConfidence(decision.confidence);

        if (decision.kind === 'accepted' && decision.label) {
          setTranslationText(decision.label);
          setRecognitionUncertain(false);
          setBackendPendingNotice('');

          if (decision.emitToHistory) {
            setSentenceText((prev) => (prev ? `${prev} ${decision.label}` : decision.label));
            setHistory((prev) =>
              [
                {
                  id: `${Date.now()}`,
                  text: decision.label,
                  confidence: decision.confidence,
                  gestureType: decision.gestureType,
                  timestamp: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                },
                ...prev,
              ].slice(0, MAX_LOCAL_HISTORY)
            );
            void saveTranslationHistoryText(user?.id, decision.label);

            // Prevent repetitive speech while the same gesture remains held in front of the camera
            const sameGestureHeld =
              activeSpokenGestureRef.current?.gestureId === decision.gestureId;
            if (autoSpeak && !sameGestureHeld) {
              activeSpokenGestureRef.current = {
                gestureId: decision.gestureId || decision.label,
                handPresentSinceLoss: null,
              };
              startSpeechPlayback(decision.label);
            }
          }
        } else if (
          decision.kind === 'low-confidence' ||
          decision.kind === 'unknown'
        ) {
          setRecognitionUncertain(true);
          setBackendPendingNotice(decision.message);
        } else {
          setRecognitionUncertain(false);
          setBackendPendingNotice(decision.message);
        }
      } catch (err) {
        setRecognitionUncertain(true);
        setBackendPendingNotice(
          err?.status === 404
            ? 'Recognition endpoint (POST /api/recognition/predict) is not reachable. Switch to Quick Messages anytime.'
            : err?.message ||
                'Unable to reach backend recognition endpoint. Repeat your sign or switch to Quick Messages.'
        );
      } finally {
        setSendingToBackend(false);
      }
    },
    [autoSpeak, confidenceThreshold, isOnline, startSpeechPlayback, user?.id]
  );

  const handleLandmarksDetected = useCallback(
    (payload) => {
      setLiveTelemetry(payload);

      // Reset repetitive-speech lock only after hands actually leave the frame for >1.2s
      if (payload.handsCount === 0) {
        if (activeSpokenGestureRef.current) {
          const lossStarted = activeSpokenGestureRef.current.handPresentSinceLoss ?? Date.now();
          activeSpokenGestureRef.current.handPresentSinceLoss = lossStarted;
          if (Date.now() - lossStarted > 1200) {
            activeSpokenGestureRef.current = null;
          }
        }
      } else {
        if (activeSpokenGestureRef.current) {
          activeSpokenGestureRef.current.handPresentSinceLoss = null;
        }
        sequenceBufferRef.current.push({
          landmarks: payload.landmarks,
          handedness: payload.handedness,
          timestamp: payload.timestamp,
        });
      }

      // Only run continuous remote classification when a trained model is actually loaded
      const now = Date.now();
      if (
        autoRecognize &&
        modelStatus?.model_trained &&
        isOnline &&
        payload.handsCount > 0 &&
        !sendingToBackend &&
        now - lastAutoInferRef.current >= 450
      ) {
        lastAutoInferRef.current = now;
        void runRecognitionRequest(payload, false);
      }
    },
    [autoRecognize, isOnline, modelStatus?.model_trained, runRecognitionRequest, sendingToBackend]
  );

  const handleCameraStatusChange = useCallback((nextStatus) => {
    setCameraStatus(nextStatus);
    if (nextStatus !== 'streaming') {
      setLiveTelemetry(null);
      sequenceBufferRef.current.clear();
      postProcessorRef.current.reset();
      activeSpokenGestureRef.current = null;
      setPostDecision(null);
    }
  }, []);

  const handleSendSnapshotToBackend = useCallback(async () => {
    if (!liveTelemetry || liveTelemetry.handsCount === 0) {
      setRecognitionUncertain(true);
      setBackendPendingNotice(
        'No hand detected yet. Hold one or both hands in front of the camera, or select a phrase manually in Quick Messages.'
      );
      return;
    }
    await runRecognitionRequest(liveTelemetry, true);
  }, [liveTelemetry, runRecognitionRequest]);

  const handleCopy = useCallback(async (text, target) => {
    if (!text.trim()) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedTarget(target);
      setTimeout(() => setCopiedTarget(null), 1800);
    }
  }, []);

  const handleClearActiveText = useCallback(() => {
    stopSpeech();
    setPlaybackState('idle');
    setActiveSpokenText('');
    setTranslationText('');
    setSentenceText('');
    setConfidence(null);
    setBackendPendingNotice('');
    setRecognitionUncertain(false);
    setPostDecision(null);
    postProcessorRef.current.reset();
    activeSpokenGestureRef.current = null;
    setTtsNotice(null);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const getWorkspaceStatusBadge = () => {
    if (sendingToBackend) {
      return { state: 'pending', label: 'Running Inference Pipeline' };
    }
    if (cameraStatus === 'error') {
      return { state: 'error', label: 'Camera Error · Use Quick Messages' };
    }
    if (cameraStatus === 'loading-model') {
      return { state: 'pending', label: 'Loading Hand Landmarker' };
    }
    if (cameraStatus === 'requesting-camera') {
      return { state: 'pending', label: 'Awaiting Webcam Permission' };
    }
    if (cameraStatus !== 'streaming') {
      return { state: 'pending', label: 'Awaiting Camera Start' };
    }
    if (!liveTelemetry || liveTelemetry.handsCount === 0) {
      return { state: 'pending', label: 'Camera Active · Show Hand to Detect' };
    }
    if (postDecision?.kind === 'unknown') {
      return { state: 'pending', label: 'Unknown Gesture Detected' };
    }
    if (postDecision?.kind === 'low-confidence') {
      return { state: 'pending', label: 'Low-Confidence Warning' };
    }
    return {
      state: 'ok',
      label: `Hand Detected (${liveTelemetry.handsCount} hand${liveTelemetry.handsCount === 1 ? '' : 's'} · ${liveTelemetry.handsCount * (liveTelemetry.landmarksPerHand || 21)} landmarks)`,
    };
  };

  const recognitionStatus = getWorkspaceStatusBadge();
  const confidencePercent =
    typeof confidence === 'number' ? Math.round(confidence * 100) : null;
  const isModelTrained = Boolean(modelStatus?.model_trained);
  const bufferedSequenceCount = sequenceBufferRef.current.size();
  const speechAvailable = isSpeechSupported();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[#6D28D9]">Live Sign-to-Speech Workspace</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#292544]">
            Sign Language Translator
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#292544]/75">
            Captures 21-point MediaPipe hand landmarks, runs temporal gesture classification via{' '}
            <code className="font-mono font-semibold">POST /api/recognition/predict</code>, and
            speaks recognized meanings or complete sentences with browser SpeechSynthesis.
          </p>
        </div>
        <StatusIndicator state={recognitionStatus.state} label={recognitionStatus.label} />
      </div>

      {/* Honest Model Readiness & Prototype ISL Disclaimer Banner */}
      <div
        role="status"
        className={`flex flex-wrap items-start justify-between gap-4 rounded-3xl border px-5 py-4 text-sm ${
          isModelTrained
            ? 'border-[#6EE7B7] bg-[#A7F3D0]/30 text-[#292544]'
            : 'border-[#FDBA74] bg-[#FED7AA]/45 text-[#292544]'
        }`}
      >
        <div className="flex max-w-3xl items-start gap-3">
          {isModelTrained ? (
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden="true" />
          )}
          <div className="space-y-1">
            <p className="font-extrabold">
              {isModelTrained
                ? `Trained Gesture Model Loaded (${modelStatus?.classifier_mode})`
                : 'Gesture Classifier Not Trained Yet — Dataset Required'}
            </p>
            <p className="text-xs font-semibold leading-relaxed text-[#292544]/85">
              {modelStatus?.message ||
                'Suitable authentic labeled ISL training data is not loaded yet, so SignSpeak honestly reports model unavailability instead of fabricating predictions.'}
            </p>
            <p className="text-[11px] font-semibold text-[#292544]/75">
              {modelStatus?.isl_disclaimer || ISL_PROTOTYPE_DISCLAIMER}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setShowCollector((prev) => !prev)}
          variant={showCollector ? 'primary' : 'outline'}
          size="sm"
        >
          <Database className="h-4 w-4" aria-hidden="true" />
          <span>{showCollector ? 'Hide Dataset Collector' : 'Collect & Annotate Samples'}</span>
        </Button>
      </div>

      {!isOnline && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#FB923C]/60 bg-[#FED7AA]/55 px-5 py-4 text-sm text-[#292544]"
        >
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-[#9A3412]" aria-hidden="true" />
            <div>
              <p className="font-extrabold">Offline Notice: Remote AI Recognition Unavailable</p>
              <p className="text-xs font-semibold text-[#292544]/85">
                Cloud sign-recognition requires an active internet connection. Saved local history,
                voice replay, Quick Messages, and Two-Way Communication remain available offline.
              </p>
            </div>
          </div>
          <Button to="/quick-messages" variant="outline" size="sm">
            <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
            <span>Open Quick Messages</span>
          </Button>
        </div>
      )}

      {showCollector && (
        <DatasetCollectorCard cameraStatus={cameraStatus} liveTelemetry={liveTelemetry} />
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <CameraView
            onLandmarksDetected={handleLandmarksDetected}
            onStatusChange={handleCameraStatusChange}
          />

          <Card tone="lavender" padding="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#292544]">
                  AI Inference &amp; Temporal Pipeline
                </h2>
                <p className="mt-0.5 text-xs text-[#292544]/75">
                  Rolling buffer:{' '}
                  <span className="font-mono font-bold tabular-nums">
                    {bufferedSequenceCount}/24 frames
                  </span>{' '}
                  · Endpoint:{' '}
                  <code className="font-mono font-semibold">POST /api/recognition/predict</code>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isModelTrained && (
                  <Button
                    onClick={() => setAutoRecognize((prev) => !prev)}
                    variant={autoRecognize ? 'mint' : 'outline'}
                    size="sm"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{autoRecognize ? 'Auto-Classify On' : 'Auto-Classify Off'}</span>
                  </Button>
                )}
                <Button
                  onClick={handleSendSnapshotToBackend}
                  disabled={cameraStatus !== 'streaming' || sendingToBackend}
                  variant="primary"
                  size="sm"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  <span>{sendingToBackend ? 'Sending...' : 'Classify Current Sign'}</span>
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-2.5 text-xs">
              <label
                htmlFor="confidence-threshold-select"
                className="font-bold text-[#292544]"
              >
                Confidence Threshold:
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 font-bold text-[#292544]">
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(e) => setAutoSpeak(e.target.checked)}
                    className="h-4 w-4 accent-[#7C3AED]"
                  />
                  <span>Auto-speak new signs (no repeats while held)</span>
                </label>
                <select
                  id="confidence-threshold-select"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                  className="min-h-[38px] rounded-xl border border-[#DDD6FE] bg-white px-3 py-1 font-mono text-xs font-bold text-[#292544]"
                >
                  <option value={0.55}>55%</option>
                  <option value={0.7}>70% (Recommended)</option>
                  <option value={0.8}>80% (Strict)</option>
                  <option value={0.9}>90% (High Precision)</option>
                </select>
              </div>
            </div>

            {postDecision && postDecision.kind === 'low-confidence' && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-[#FDBA74] bg-[#FED7AA]/65 px-4 py-3 text-xs font-bold text-[#9A3412]"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{postDecision.message}</span>
              </div>
            )}

            {postDecision && postDecision.kind === 'unknown' && (
              <div
                role="status"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-[#BFDBFE] bg-[#BFDBFE]/55 px-4 py-3 text-xs font-bold text-[#1E3A8A]"
              >
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{postDecision.message}</span>
              </div>
            )}

            {backendPendingNotice && (
              <div className="mt-3 space-y-2.5 rounded-2xl bg-white/95 px-4 py-3 text-xs font-semibold text-[#292544]/90">
                <p>{backendPendingNotice}</p>
                {recognitionUncertain && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!isModelTrained && (
                      <Button
                        onClick={() => setShowCollector(true)}
                        variant="primary"
                        size="sm"
                      >
                        <Database className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Open Dataset Collector</span>
                      </Button>
                    )}
                    <Button to="/quick-messages" variant="mint" size="sm">
                      <MessageSquareHeart className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Select Message Manually</span>
                    </Button>
                    <Button to="/communicate" variant="blue" size="sm">
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Open Two-Way Chat</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-5">
          {/* PART A & C: Sign-to-Speech Result, Voice Picker & Sentence Builder */}
          <Card tone="default">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#292544]">Translation &amp; Speech Output</h2>
              <span className="font-mono text-xs font-semibold text-[#292544]/65">
                {liveTelemetry?.handsCount
                  ? `${liveTelemetry.handsCount} hand${liveTelemetry.handsCount > 1 ? 's' : ''} tracked`
                  : 'Standby'}
              </span>
            </div>

            <div className="mt-4 min-h-[96px] rounded-2xl border border-[#EDE9FE] bg-[#FFFCF8] p-4">
              {translationText ? (
                <p className="text-2xl font-extrabold text-[#292544]">{translationText}</p>
              ) : (
                <div className="space-y-1 text-xs text-[#292544]/65">
                  <p className="text-sm font-bold text-[#292544]/80">
                    {isModelTrained
                      ? 'Ready to translate hand gestures'
                      : 'Model not trained yet — awaiting authentic ISL dataset'}
                  </p>
                  <p>
                    Confirmed gesture labels appear here automatically, or compose and speak a
                    complete sentence below.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#292544]/75">
                <span>Confidence Indicator (Threshold: {Math.round(confidenceThreshold * 100)}%)</span>
                <span className="font-mono tabular-nums">
                  {confidencePercent !== null ? `${confidencePercent}%` : '—'}
                </span>
              </div>
              <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-[#EDE9FE]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#A7F3D0] transition-all duration-300"
                  style={{ width: `${confidencePercent ?? 0}%` }}
                />
              </div>
            </div>

            {/* Complete Translated Sentence Editor */}
            <div className="mt-5 space-y-2 border-t border-[#EDE9FE] pt-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="translated-sentence-input"
                  className="text-xs font-bold text-[#292544]"
                >
                  Complete Translated Sentence (editable)
                </label>
                {sentenceText && (
                  <button
                    type="button"
                    onClick={() => handleCopy(sentenceText, 'sentence')}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#6D28D9] hover:underline"
                  >
                    {copiedTarget === 'sentence' ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Copy Sentence</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <textarea
                id="translated-sentence-input"
                rows={2}
                value={sentenceText}
                onChange={(e) => setSentenceText(e.target.value)}
                placeholder="Confirmed signs build here automatically, or type any sentence to speak aloud..."
                className="w-full rounded-2xl border border-[#DDD6FE] bg-[#FFFCF8] px-3.5 py-2.5 text-sm font-semibold text-[#292544] placeholder:text-[#292544]/40 focus:border-[#7C3AED] focus:outline-none"
              />
            </div>

            {/* Browser Voice Selector */}
            <div className="mt-4">
              <label htmlFor="tts-voice-select" className="block text-xs font-bold text-[#292544]">
                Speech Voice ({voices.length > 0 ? `${voices.length} browser voices` : 'Browser default'})
              </label>
              <select
                id="tts-voice-select"
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                disabled={!speechAvailable || voices.length === 0}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-xs font-bold text-[#292544] focus:border-[#7C3AED] focus:outline-none disabled:opacity-60"
              >
                <option value="">System Default Voice</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Volume-Independent Speech Playback Controls: Speak, Pause, Resume, Stop */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => startSpeechPlayback(sentenceText || translationText)}
                disabled={!(sentenceText.trim() || translationText.trim()) || !speechAvailable}
                variant="mint"
                size="sm"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>{sentenceText.trim() ? 'Speak Sentence' : 'Speak'}</span>
              </Button>

              {playbackState === 'speaking' && (
                <Button onClick={handlePauseSpeech} variant="blue" size="sm">
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  <span>Pause</span>
                </Button>
              )}

              {playbackState === 'paused' && (
                <Button onClick={handleResumeSpeech} variant="primary" size="sm">
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Resume</span>
                </Button>
              )}

              <Button
                onClick={handleStopSpeech}
                disabled={playbackState === 'idle'}
                variant="peach"
                size="sm"
              >
                <Square className="h-4 w-4" aria-hidden="true" />
                <span>Stop</span>
              </Button>

              <Button
                onClick={() => handleCopy(translationText || sentenceText, 'latest')}
                disabled={!(translationText.trim() || sentenceText.trim())}
                variant="outline"
                size="sm"
              >
                {copiedTarget === 'latest' ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{copiedTarget === 'latest' ? 'Copied' : 'Copy Text'}</span>
              </Button>

              <Button
                onClick={handleClearActiveText}
                disabled={!(translationText || sentenceText)}
                variant="outline"
                size="sm"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Clear Text</span>
              </Button>
            </div>

            {playbackState !== 'idle' && activeSpokenText && (
              <p className="mt-3 rounded-xl bg-[#A7F3D0]/35 px-3 py-2 text-xs font-bold text-[#065F46]">
                {playbackState === 'paused' ? 'Paused speech:' : 'Speaking:'} &ldquo;{activeSpokenText}&rdquo;
              </p>
            )}

            {ttsNotice && (
              <p className="mt-3 rounded-xl bg-[#FED7AA]/55 px-3 py-2 text-xs font-bold text-[#292544]">
                {ttsNotice}
              </p>
            )}
          </Card>

          {/* Local Persistent Prediction History with Replay */}
          <Card tone="default">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#292544]">Saved Translation History</h2>
                <p className="text-[11px] font-semibold text-[#292544]/60">
                  Saved locally in your browser · {history.length} item{history.length === 1 ? '' : 's'}
                </p>
              </div>
              {history.length > 0 && (
                <Button onClick={handleClearHistory} variant="ghost" size="sm">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear History</span>
                </Button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-[#EDE9FE]/35 p-4 text-sm text-[#292544]/70">
                No verified gesture translations saved in local history yet.
              </p>
            ) : (
              <ul className="mt-4 max-h-64 divide-y divide-[#EDE9FE] overflow-y-auto">
                {history.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[#292544]">{entry.text}</p>
                      <p className="font-mono text-xs tabular-nums text-[#292544]/60">
                        {entry.timestamp}
                        {entry.gestureType ? ` · ${entry.gestureType}` : ''}
                        {typeof entry.confidence === 'number'
                          ? ` · ${Math.round(entry.confidence * 100)}%`
                          : ''}
                      </p>
                    </div>
                    <Button
                      onClick={() => startSpeechPlayback(entry.text)}
                      disabled={!speechAvailable}
                      variant="ghost"
                      size="sm"
                      aria-label={`Replay speech for ${entry.text}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Replay</span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card tone="blue" padding="p-5">
            <h2 className="text-sm font-bold text-[#292544]">
              Prototype Vocabulary (8 Target Signs)
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-[#292544]/75">
              Static vs. dynamic sequence requirements — unverified prototype labels until reviewed
              against authentic ISL references.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {PROTOTYPE_VOCABULARY.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/80 bg-white/85 px-3 py-2"
                >
                  <p className="font-extrabold text-[#292544]">{item.label}</p>
                  <p className="text-[11px] font-semibold text-[#6D28D9]">
                    {item.gesture_type === 'dynamic' ? 'Dynamic sequence' : 'Static pose'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
