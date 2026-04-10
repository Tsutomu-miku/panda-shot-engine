// ============================================================
// panda-shot-engine — Timeline Panel Component
// Time ruler, multi-track display, playhead, event blocks,
// zoom control, click-to-select, drag playhead
// ============================================================

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { DslShot } from '../../../core/project/types';
import type {
  ActionCommand,
  CameraCommand,
  ExpressionCommand,
  SayCommand,
  SfxCommand,
  VfxCommand,
} from '../../../core/dsl/types';

import './TimelinePanel.css';

// ─── Constants ──────────────────────────────────────────────

const RULER_HEIGHT = 28;
const TRACK_HEIGHT = 36;
const PX_PER_SEC_BASE = 120;

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Flatten shot timeline into renderable tracks ───────────

interface TrackEvent {
  id: string;
  trackId: string;
  type: 'action' | 'expression' | 'say' | 'camera' | 'sfx' | 'vfx';
  label: string;
  startTime: number;
  duration: number;
  character?: string;
}

interface Track {
  id: string;
  name: string;
  color: string;
  type: 'character' | 'camera' | 'sfx' | 'bgm';
  events: TrackEvent[];
}

function buildTracksFromShot(shot: DslShot): Track[] {
  const trackMap = new Map<string, Track>();

  const ensureTrack = (id: string, name: string, type: Track['type'], color: string) => {
    if (!trackMap.has(id)) {
      trackMap.set(id, { id, name, type, color, events: [] });
    }
    return trackMap.get(id)!;
  };

  for (const event of shot.timeline ?? []) {
    for (const command of event.commands) {
      let track: Track;
      let trackEvent: TrackEvent | null = null;

      switch (command.type) {
        case 'camera': {
          const camera = command as CameraCommand;
          track = ensureTrack('track_camera', 'Camera', 'camera', '#ab47bc');
          trackEvent = {
            id: `${shot.id}_camera_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'camera',
            label: camera.target ? `${camera.cameraType} -> ${camera.target}` : camera.cameraType,
            startTime: event.time,
            duration: camera.duration ?? 0.5,
          };
          break;
        }
        case 'action': {
          const action = command as ActionCommand;
          track = ensureTrack(`char_${action.character}`, action.character, 'character', '#4caf50');
          trackEvent = {
            id: `${shot.id}_action_${action.character}_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'action',
            label: action.action,
            startTime: event.time,
            duration: 0.6,
            character: action.character,
          };
          break;
        }
        case 'expression': {
          const expression = command as ExpressionCommand;
          track = ensureTrack(`char_${expression.character}`, expression.character, 'character', '#42a5f5');
          trackEvent = {
            id: `${shot.id}_expression_${expression.character}_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'expression',
            label: expression.expression,
            startTime: event.time,
            duration: 0.6,
            character: expression.character,
          };
          break;
        }
        case 'say': {
          const say = command as SayCommand;
          track = ensureTrack(`char_${say.character}`, say.character, 'character', '#7e57c2');
          trackEvent = {
            id: `${shot.id}_say_${say.character}_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'say',
            label: say.text,
            startTime: event.time,
            duration: 1.2,
            character: say.character,
          };
          break;
        }
        case 'sfx': {
          const sfx = command as SfxCommand;
          track = ensureTrack('track_sfx', 'SFX', 'sfx', '#ffa726');
          trackEvent = {
            id: `${shot.id}_sfx_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'sfx',
            label: sfx.sound,
            startTime: event.time,
            duration: 0.4,
          };
          break;
        }
        case 'vfx': {
          const vfx = command as VfxCommand;
          track = ensureTrack('track_vfx', 'VFX', 'sfx', '#ef5350');
          trackEvent = {
            id: `${shot.id}_vfx_${event.time}_${track.events.length}`,
            trackId: track.id,
            type: 'vfx',
            label: vfx.effect,
            startTime: event.time,
            duration: 0.5,
          };
          break;
        }
        default:
          trackEvent = null;
      }

      if (trackEvent) {
        track.events.push(trackEvent);
      }
    }
  }

  return Array.from(trackMap.values());
}

// ─── Ruler Component ────────────────────────────────────────

interface RulerProps {
  duration: number;
  pxPerSec: number;
  currentTime: number;
  onSeek: (time: number) => void;
}

const Ruler: React.FC<RulerProps> = ({ duration, pxPerSec, currentTime, onSeek }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const safeDuration = Math.max(0, finiteOr(duration, 0));
  const safePxPerSec = Math.max(1, finiteOr(pxPerSec, PX_PER_SEC_BASE));
  const safeCurrentTime = clamp(finiteOr(currentTime, 0), 0, safeDuration);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = Math.max(safeDuration * safePxPerSec + 20, canvas.parentElement?.clientWidth ?? 600);
    canvas.width = W;
    canvas.height = RULER_HEIGHT;

    ctx.clearRect(0, 0, W, RULER_HEIGHT);
    ctx.fillStyle = '#1e1e30';
    ctx.fillRect(0, 0, W, RULER_HEIGHT);

    // Tick marks
    const step = safePxPerSec >= 80 ? 0.5 : 1;
    for (let t = 0; t <= safeDuration + 0.01; t += step) {
      const x = t * safePxPerSec;
      const isMajor = Math.abs(t - Math.round(t)) < 0.01;
      ctx.strokeStyle = isMajor ? '#555' : '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, isMajor ? 8 : 16);
      ctx.lineTo(x, RULER_HEIGHT);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(t)}s`, x, 14);
      }
    }

    // Playhead marker on ruler
    const phX = safeCurrentTime * safePxPerSec;
    ctx.fillStyle = '#ef5350';
    ctx.beginPath();
    ctx.moveTo(phX - 5, 0);
    ctx.lineTo(phX + 5, 0);
    ctx.lineTo(phX, 10);
    ctx.closePath();
    ctx.fill();
  }, [safeDuration, safePxPerSec, safeCurrentTime]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = e.currentTarget.parentElement?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = clamp(x / safePxPerSec, 0, safeDuration);
      onSeek(time);
    },
    [safePxPerSec, safeDuration, onSeek],
  );

  return (
    <canvas
      ref={canvasRef}
      className="timeline-ruler"
      height={RULER_HEIGHT}
      onClick={handleClick}
      style={{ display: 'block', cursor: 'pointer' }}
    />
  );
};

// ─── Event Block Component ──────────────────────────────────

interface EventBlockProps {
  event: TrackEvent;
  pxPerSec: number;
  isSelected: boolean;
  onSelect: () => void;
}

const EventBlock: React.FC<EventBlockProps> = ({ event, pxPerSec, isSelected, onSelect }) => {
  const safePxPerSec = Math.max(1, finiteOr(pxPerSec, PX_PER_SEC_BASE));
  const startTime = Math.max(0, finiteOr(event.startTime, 0));
  const duration = Math.max(0, finiteOr(event.duration, 0));
  const left = startTime * safePxPerSec;
  const width = Math.max(duration * safePxPerSec, 24);

  return (
    <div
      className={`timeline-event timeline-event--${event.type} ${isSelected ? 'timeline-event--selected' : ''}`}
      style={{ left, width }}
      title={`${event.type}: ${event.label} (${startTime.toFixed(1)}s - ${(startTime + duration).toFixed(1)}s)`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {event.label}
    </div>
  );
};

// ─── Timeline Panel Component ───────────────────────────────

const TimelinePanel: React.FC = () => {
  const { state, dispatch, currentShot } = useEditor();
  const tracksRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);

  const duration = Math.max(0, finiteOr(currentShot?.duration ?? 5, 5));
  const pxPerSec = Math.max(1, finiteOr(PX_PER_SEC_BASE, 120));
  const totalWidth = duration * pxPerSec + 20;

  const tracks = useMemo(() => {
    if (!currentShot) return [];
    return buildTracksFromShot(currentShot);
  }, [currentShot]);

  // Sync vertical scroll between labels and tracks
  const handleTracksScroll = useCallback(() => {
    if (tracksRef.current && labelsRef.current) {
      labelsRef.current.scrollTop = tracksRef.current.scrollTop;
    }
  }, []);

  const handleSeek = useCallback(
    (time: number) => dispatch({ type: 'SET_PLAYBACK_TIME', time }),
    [dispatch],
  );

  const handleWheel = useCallback((_e: React.WheelEvent) => {}, []);

  // Playhead drag
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const handleMove = (ev: MouseEvent) => {
        if (!tracksRef.current) return;
        const rect = tracksRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left + tracksRef.current.scrollLeft;
        const time = clamp(x / pxPerSec, 0, duration);
        dispatch({ type: 'SET_PLAYBACK_TIME', time });
      };
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [pxPerSec, duration, dispatch],
  );

  // Select timeline event
  const handleSelectEvent = useCallback(
    (event: TrackEvent) => {
      dispatch({
          type: 'SELECT_ELEMENT',
          element: {
            type: 'action',
            shotIndex: state.currentShotIndex,
            id: event.id,
          },
        });
    },
    [dispatch, state.currentShotIndex],
  );

  const playheadX = clamp(finiteOr(state.playbackTime, 0), 0, duration) * pxPerSec;

  // Format time display
  const formatTime = (t: number) => {
    const safeTime = Math.max(0, finiteOr(t, 0));
    const mins = Math.floor(safeTime / 60);
    const secs = safeTime % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div className="panel timeline-panel" onWheel={handleWheel}>
      {/* Header */}
      <div className="timeline-panel__header">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Timeline</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {formatTime(state.playbackTime)} / {formatTime(duration)}
          </span>
          <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Zoom: 100%
          </span>
        </div>
      </div>

      {/* Body: labels + tracks */}
      <div className="timeline-panel__body">
        {/* Track labels */}
        <div className="timeline-labels" ref={labelsRef}>
          <div className="timeline-labels__ruler-spacer" />
          {tracks.map((track) => (
            <div className="timeline-label" key={track.id}>
              <span
                className="timeline-label__color"
                style={{ backgroundColor: track.color }}
              />
              <span className="timeline-label__name">{track.name}</span>
              <span className="timeline-label__count" style={{
                fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto',
              }}>
                {track.events.length}
              </span>
            </div>
          ))}
          {tracks.length === 0 && (
            <div style={{ padding: '12px 8px', fontSize: 11, color: 'var(--text-muted)' }}>
              No tracks
            </div>
          )}
        </div>

        {/* Tracks area */}
        <div className="timeline-tracks" ref={tracksRef} onScroll={handleTracksScroll}>
          {/* Ruler */}
          <Ruler
            duration={duration}
            pxPerSec={pxPerSec}
            currentTime={state.playbackTime}
            onSeek={handleSeek}
          />

          {/* Track rows */}
          {tracks.map((track) => (
            <div
              className="timeline-track"
              key={track.id}
              style={{ width: totalWidth }}
            >
              {track.events.map((ev) => (
                <EventBlock
                  key={ev.id}
                  event={ev}
                  pxPerSec={pxPerSec}
                  isSelected={
                    state.selectedElement?.type === 'action' &&
                    state.selectedElement?.id === ev.id
                  }
                  onSelect={() => handleSelectEvent(ev)}
                />
              ))}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="timeline-playhead"
            style={{ left: playheadX, top: 0 }}
            onMouseDown={handlePlayheadMouseDown}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
