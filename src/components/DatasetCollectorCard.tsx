import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Download,
  Film,
  Hand,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import { CameraStatus, LandmarkDetectionPayload } from '../services/cameraHandTracker';
import { submitDatasetSample } from '../services/translationService';
import {
  ISL_PROTOTYPE_DISCLAIMER,
  PROTOTYPE_VOCABULARY,
  SequenceFrameEntry,
} from '../utils/landmarkPostProcessor';

export interface CollectedGestureClip {
  sample_id: string;
  gesture_id: string;
  label: string;
  gesture_type: 'static' | 'dynamic';
  signer_id: string;
  session_id: string;
  isl_verified: boolean;
  notes: string;
  frames: SequenceFrameEntry[];
  created_at: string;
}

interface DatasetCollectorCardProps {
  cameraStatus: CameraStatus;
  liveTelemetry: LandmarkDetectionPayload | null;
}

const SEQUENCE_TARGET_FRAMES = 24;

export function DatasetCollectorCard({
  cameraStatus,
  liveTelemetry,
}: DatasetCollectorCardProps) {
  const [selectedId, setSelectedId] = useState<string>('hello');
  const [signerId, setSignerId] = useState<string>('signer_01');
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now().toString().slice(-6)}`);
  const [islVerified, setIslVerified] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [clips, setClips] = useState<CollectedGestureClip[]>([]);
  const [recordingDynamic, setRecordingDynamic] = useState<boolean>(false);
  const [recordedFramesCount, setRecordedFramesCount] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [savingToServer, setSavingToServer] = useState<boolean>(false);

  const recordingFramesRef = useRef<SequenceFrameEntry[]>([]);
  const lastRecordedTimestampRef = useRef<number>(-1);

  const selectedSpec =
    PROTOTYPE_VOCABULARY.find((item) => item.id === selectedId) ?? {
      id: 'unknown',
      label: 'Unknown / Neutral Pose',
      gesture_type: 'static' as const,
      expected_hands: 'Any non-vocabulary hand posture',
      isl_verification_status: 'neutral_negative_class',
    };

  const finishDynamicClip = useCallback(
    (frames: SequenceFrameEntry[]) => {
      const clip: CollectedGestureClip = {
        sample_id: `${selectedSpec.id}_${Date.now()}`,
        gesture_id: selectedSpec.id,
        label: selectedSpec.label,
        gesture_type: 'dynamic',
        signer_id: signerId.trim() || 'signer_01',
        session_id: sessionId.trim() || 'session_default',
        isl_verified: islVerified,
        notes: notes.trim(),
        frames,
        created_at: new Date().toISOString(),
      };
      setClips((prev) => [clip, ...prev]);
      setRecordingDynamic(false);
      setRecordedFramesCount(0);
      recordingFramesRef.current = [];
      setStatusMessage(
        `Recorded ${frames.length}-frame dynamic clip for "${selectedSpec.label}".`
      );
    },
    [islVerified, notes, selectedSpec.id, selectedSpec.label, sessionId, signerId]
  );

  // Append live MediaPipe frames while dynamic recording is active
  useEffect(() => {
    if (!recordingDynamic || cameraStatus !== 'streaming' || !liveTelemetry) return;
    if (liveTelemetry.handsCount === 0) return;
    if (liveTelemetry.timestamp === lastRecordedTimestampRef.current) return;

    lastRecordedTimestampRef.current = liveTelemetry.timestamp;
    const entry: SequenceFrameEntry = {
      landmarks: liveTelemetry.landmarks,
      handedness: liveTelemetry.handedness,
      timestamp: liveTelemetry.timestamp,
    };

    recordingFramesRef.current = [...recordingFramesRef.current, entry];
    const count = recordingFramesRef.current.length;
    setRecordedFramesCount(count);

    if (count >= SEQUENCE_TARGET_FRAMES) {
      finishDynamicClip(recordingFramesRef.current);
    }
  }, [cameraStatus, finishDynamicClip, liveTelemetry, recordingDynamic]);

  const handleCaptureStatic = useCallback(() => {
    if (cameraStatus !== 'streaming' || !liveTelemetry || liveTelemetry.handsCount === 0) {
      setStatusMessage('Start the camera and hold your hand in frame before capturing a sample.');
      return;
    }

    const clip: CollectedGestureClip = {
      sample_id: `${selectedSpec.id}_${Date.now()}`,
      gesture_id: selectedSpec.id,
      label: selectedSpec.label,
      gesture_type: 'static',
      signer_id: signerId.trim() || 'signer_01',
      session_id: sessionId.trim() || 'session_default',
      isl_verified: islVerified,
      notes: notes.trim(),
      frames: [
        {
          landmarks: liveTelemetry.landmarks,
          handedness: liveTelemetry.handedness,
          timestamp: liveTelemetry.timestamp,
        },
      ],
      created_at: new Date().toISOString(),
    };
    setClips((prev) => [clip, ...prev]);
    setStatusMessage(`Captured 1 static 21-point landmark sample for "${selectedSpec.label}".`);
  }, [cameraStatus, islVerified, liveTelemetry, notes, selectedSpec.id, selectedSpec.label, sessionId, signerId]);

  const handleToggleDynamicRecord = useCallback(() => {
    if (recordingDynamic) {
      if (recordingFramesRef.current.length >= 4) {
        finishDynamicClip(recordingFramesRef.current);
      } else {
        setRecordingDynamic(false);
        setRecordedFramesCount(0);
        recordingFramesRef.current = [];
        setStatusMessage('Dynamic clip cancelled (fewer than 4 hand frames captured).');
      }
      return;
    }

    if (cameraStatus !== 'streaming') {
      setStatusMessage('Start the camera before recording a dynamic gesture sequence.');
      return;
    }

    recordingFramesRef.current = [];
    lastRecordedTimestampRef.current = -1;
    setRecordedFramesCount(0);
    setRecordingDynamic(true);
    setStatusMessage(
      `Recording up to ${SEQUENCE_TARGET_FRAMES} real hand frames for "${selectedSpec.label}" — perform the sign now.`
    );
  }, [cameraStatus, finishDynamicClip, recordingDynamic, selectedSpec.label]);

  const handleSaveClipToBackend = useCallback(async (clip: CollectedGestureClip) => {
    setSavingToServer(true);
    try {
      const res = await submitDatasetSample({
        gesture_id: clip.gesture_id,
        gesture_type: clip.gesture_type,
        signer_id: clip.signer_id,
        session_id: clip.session_id,
        isl_verified: clip.isl_verified,
        notes: clip.notes,
        frames: clip.frames,
      });
      setStatusMessage(`Saved sample '${res.sample_id}' to ${res.file_path}.`);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setStatusMessage(
        apiErr?.message || 'Could not reach backend dataset endpoint — use Export JSON instead.'
      );
    } finally {
      setSavingToServer(false);
    }
  }, []);

  const handleExportDataset = useCallback(() => {
    if (clips.length === 0) return;
    const payload = {
      schema_version: '1.0',
      exported_at: new Date().toISOString(),
      isl_disclaimer: ISL_PROTOTYPE_DISCLAIMER,
      samples: clips.map(({ label: _l, created_at: _c, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `signspeak_landmarks_${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${clips.length} labeled sample(s) as JSON for train_classifier.py.`);
  }, [clips]);

  const countsByClass = clips.reduce<Record<string, number>>((acc, item) => {
    acc[item.label] = (acc[item.label] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card tone="default" className="border-2 border-[#DDD6FE]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#EDE9FE] px-2.5 py-1 text-xs font-extrabold text-[#5B21B6]">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Dataset Collection &amp; Annotation Workflow</span>
          </span>
          <h3 className="mt-2 text-lg font-extrabold text-[#292544]">
            Collect Real ISL Landmark Samples
          </h3>
          <p className="mt-1 text-xs text-[#292544]/75">
            Record real MediaPipe 21-point hand landmarks from your webcam, annotate signer/session
            metadata, verify against authentic ISL references, and train the backend classifier.
          </p>
        </div>

        <span className="font-mono text-xs font-bold tabular-nums text-[#6D28D9]">
          {clips.length} sample{clips.length === 1 ? '' : 's'} collected
        </span>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-[#FDBA74] bg-[#FED7AA]/45 p-3.5 text-xs text-[#292544]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#9A3412]" aria-hidden="true" />
        <p className="font-semibold leading-relaxed">
          {ISL_PROTOTYPE_DISCLAIMER}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="dataset-gesture-select"
            className="block text-xs font-bold text-[#292544]"
          >
            Prototype Gesture Label
          </label>
          <select
            id="dataset-gesture-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#DDD6FE] bg-[#FFFCF8] px-3 py-2 text-sm font-bold text-[#292544] focus:border-[#7C3AED] focus:outline-none"
          >
            {PROTOTYPE_VOCABULARY.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.gesture_type === 'dynamic' ? 'Dynamic Sequence' : 'Static Pose'})
              </option>
            ))}
            <option value="unknown">Unknown / Neutral Pose (Negative Class)</option>
          </select>
          <p className="mt-1 text-[11px] font-semibold text-[#292544]/65">
            Expected: {selectedSpec.expected_hands}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dataset-signer-id" className="block text-xs font-bold text-[#292544]">
              Signer ID
            </label>
            <input
              id="dataset-signer-id"
              type="text"
              value={signerId}
              onChange={(e) => setSignerId(e.target.value)}
              placeholder="signer_01"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#DDD6FE] bg-[#FFFCF8] px-3 py-2 text-sm font-semibold text-[#292544] focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="dataset-session-id" className="block text-xs font-bold text-[#292544]">
              Session ID
            </label>
            <input
              id="dataset-session-id"
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="session_01"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-[#DDD6FE] bg-[#FFFCF8] px-3 py-2 text-sm font-semibold text-[#292544] focus:border-[#7C3AED] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="dataset-notes" className="block text-xs font-bold text-[#292544]">
            Orientation / Movement Notes
          </label>
          <input
            id="dataset-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., palm facing front, 50cm distance, verified with ISL reference"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-[#DDD6FE] bg-[#FFFCF8] px-3 py-2 text-xs font-semibold text-[#292544] focus:border-[#7C3AED] focus:outline-none"
          />
        </div>

        <label className="mt-5 flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-[#EDE9FE] bg-[#FFFCF8] px-3.5 py-2 text-xs font-bold text-[#292544]">
          <input
            type="checkbox"
            checked={islVerified}
            onChange={(e) => setIslVerified(e.target.checked)}
            className="h-4 w-4 accent-[#7C3AED]"
          />
          <span>Verified against authentic ISL reference / reviewer</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Button
          onClick={handleCaptureStatic}
          disabled={cameraStatus !== 'streaming' || !liveTelemetry?.handsCount || recordingDynamic}
          variant="primary"
          size="sm"
        >
          <Hand className="h-4 w-4" aria-hidden="true" />
          <span>Capture Static Frame</span>
        </Button>

        <Button
          onClick={handleToggleDynamicRecord}
          disabled={cameraStatus !== 'streaming'}
          variant={recordingDynamic ? 'peach' : 'blue'}
          size="sm"
        >
          <Film className="h-4 w-4" aria-hidden="true" />
          <span>
            {recordingDynamic
              ? `Recording (${recordedFramesCount}/${SEQUENCE_TARGET_FRAMES}) — Click to Stop`
              : `Record Dynamic Sequence (${SEQUENCE_TARGET_FRAMES} frames)`}
          </span>
        </Button>

        <Button
          onClick={handleExportDataset}
          disabled={clips.length === 0}
          variant="mint"
          size="sm"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>Export JSON Dataset</span>
        </Button>
      </div>

      {statusMessage && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 rounded-xl bg-[#EDE9FE]/55 px-3.5 py-2.5 text-xs font-bold text-[#292544]"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6D28D9]" aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      )}

      {Object.keys(countsByClass).length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(countsByClass).map(([clsName, count]) => (
            <span
              key={clsName}
              className="rounded-xl bg-[#A7F3D0]/45 px-2.5 py-1 text-xs font-bold text-[#065F46]"
            >
              {clsName}: {count}
            </span>
          ))}
        </div>
      )}

      {clips.length > 0 && (
        <ul className="mt-4 max-h-48 divide-y divide-[#EDE9FE] overflow-y-auto rounded-2xl border border-[#EDE9FE] bg-[#FFFCF8] px-3">
          {clips.map((clip) => (
            <li key={clip.sample_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
              <div>
                <p className="font-bold text-[#292544]">
                  {clip.label}{' '}
                  <span className="font-mono text-[11px] font-semibold text-[#6D28D9]">
                    ({clip.gesture_type} · {clip.frames.length} frame{clip.frames.length === 1 ? '' : 's'})
                  </span>
                </p>
                <p className="text-[11px] text-[#292544]/65">
                  Signer: {clip.signer_id} · {clip.isl_verified ? 'ISL Verified' : 'Unverified Prototype'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => handleSaveClipToBackend(clip)}
                  disabled={savingToServer}
                  variant="outline"
                  size="sm"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save</span>
                </Button>
                <Button
                  onClick={() => setClips((prev) => prev.filter((c) => c.sample_id !== clip.sample_id))}
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${clip.label} sample`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl bg-[#EDE9FE]/35 p-3 text-[11px] font-semibold text-[#292544]/80">
        <p className="font-extrabold text-[#292544]">Train &amp; Evaluate Command (Python Backend):</p>
        <code className="mt-1 block overflow-x-auto rounded-lg bg-white px-2.5 py-1.5 font-mono text-[11px] text-[#4C1D95]">
          python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models
        </code>
      </div>
    </Card>
  );
}
