// ============================================================
// panda-shot-engine — Timeline Panel Component
// Time ruler, multi-track display, playhead, event blocks,
// zoom control, click-to-select, drag playhead
// ============================================================

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { Shot, TimelineEvent, Command } from '../../../core/dsl/types';

// ─── Constants ──────────────────────────────────────────────

const RULER_HEIGHT = 28;
const TRACK_HEIGHT = 36;
const PX_PER_SEC_BASE = 120;

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

function buildTracksFromShot(shot: Shot): Track[] {
  const charTrackMap = new Map<string, TrackEvent[]>();
  const cameraEvents: TrackEvent[] = [];
  const sfxEvents: TrackEvent[] = [];
  const vfxEvents: TrackEvent[] = [];

  // Gather characters from placements
  for (const p of shot.placements) {
    if (!charTrackMap.has(p.character)) {
      charTrackMap.set(p.character, []);
    }
  }

  let eventIdCounter = 0;

  // Walk timeline and extract events
  for (let ti = 0; ti < shot.timeline.length; ti++) {
    const ev = shot.timeline[ti];
    const nextTime = ti + 1 < shot.timeline.length
      ? shot.timeline[ti + 1].time
      : shot.duration;
    const defaultDuration = Math.max(0.3, Math.min(2.0, nextTime - ev.time));

    for (const cmd of ev.commands) {
      const eid = `ev_${eventIdCounter++}`;

      switch (cmd.type) {
        case 'expression': {
          if (!charTrackMap.has(cmd.character)) charTrackMap.set(cmd.character, []);
          charTrackMap.get(cmd.character)!.push({
            id: eid,
            trackId: `track_${cmd.character}`,
            type: 'expression',
            label: cmd.expression,
            startTime: ev.time,
            duration: defaultDuration,
            character: cmd.character,
          });
          break;
        }
        case 'action': {
          if (!charTrackMap.has(cmd.character)) charTrackMap.set(cmd.character, []);
          charTrackMap.get(cmd.character)!.push({
            id: eid,
            trackId: `track_${cmd.character}`,
            type: 'action',
            label: cmd.action,
            startTime: ev.time,
            duration: defaultDuration,
            character: cmd.character,
          });
          break;
        }
        case 'say': {
          if (!charTrackMap.has(cmd.character)) charTrackMap.set(cmd.character, []);
          charTrackMap.get(cmd.character)!.push({
            id: eid,
            trackId: `track_${cmd.character}`,
            type: 'say',
            label: `"${cmd.text.slice(0, 15)}${cmd.text.length > 15 ? '...' : ''}"`,
            startTime: ev.time,
            duration: Math.max(1.5, defaultDuration),
            character: cmd.character,
          });
          break;
        }
        case 'enter': {
          if (!charTrackMap.has(cmd.character)) charTrackMap.set(cmd.character, []);
          charTrackMap.get(cmd.character)!.push({
            id: eid,
            trackId: `track_${cmd.character}`,
            type: 'action',
            label: 'enter',
            startTime: ev.time,
            duration: 1.5,
            character: cmd.character,
          });
          break;
        }
        case 'camera': {
          let label = cmd.cameraType;
          if (cmd.target) label += ` ${cmd.target}`;
          if (cmd.motion) label += ` ${cmd.motion}`;
          cameraEvents.push({
            id: eid,
            trackId: 'track_camera',
            type: 'camera',
            label,
            startTime: ev.time,
            duration: cmd.duration ?? defaultDuration,
          });
          break;
        }
        case 'sfx': {
          sfxEvents.push({
            id: eid,
            trackId: 'track_sfx',
            type: 'sfx',
            label: cmd.sound,
            startTime: ev.time,
            duration: 0.5,
          });
          break;
        }
        case 'vfx': {
          vfxEvents.push({
            id: eid,
            trackId: 'track_vfx',
            type: 'vfx',
            label: cmd.effect,
            startTime: ev.time,
            duration: 0.8,
          });
          break;
        }
      }
    }
  }

  const CHAR_COLORS = ['#4caf50', '#f44336', '#2196f3', '#9c27b0', '#ff9800', '#00bcd4'];
  const tracks: Track[] = [];
  let colorIdx = 0;

  for (const [charId, events] of charTrackMap) {
    tracks.push({
      id: `track_${charId}`,
      name: charId,
      color: CHAR_COLORS[colorIdx % CHAR_COLORS.length],
      type: 'character',
      events,
    });
    colorIdx++;
  }

  if (cameraEvents.length > 0) {
    tracks.push({
      id: 'track_camera',
      name: 'Camera',
      color: '#ab47bc',
      type: 'camera',
      events: cameraEvents,
    });
  }

  if (sfxEvents.length > 0) {
    tracks.push({
      id: 'track_sfx',
      name: 'SFX',
      color: '#ffa726',
      type: 'sfx',
      events: sfxEvents,
    });
  }

  if (vfxEvents.length > 0) {
    tracks.push({
      id: 'track_vfx',
      name: 'VFX',
      color: '#ef5350',
      type: 'sfx',
      events: vfxEvents,
    });
  }

  return tracks;
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = Math.max(duration * pxPerSec + 20, canvas.parentElement?.clientWidth ?? 600);
    canvas.width = W;
    canvas.height = RULER_HEIGHT;

    ctx.clearRect(0, 0, W, RULER_HEIGHT);
    ctx.fillStyle = '#1e1e30';
    ctx.fillRect(0, 0, W, RULER_HEIGHT);

    // Tick marks
    const step = pxPerSec >= 80 ? 0.5 : 1;
    for (let t = 0; t <= duration + 0.01; t += step) {
      const x = t * pxPerSec;
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
    const phX = currentTime * pxPerSec;
    ctx.fillStyle = '#ef5350';
    ctx.beginPath();
    ctx.moveTo(phX - 5, 0);
    ctx.lineTo(phX + 5, 0);
    ctx.lineTo(phX, 10);
    ctx.closePath();
    ctx.fill();
  }, [duration, pxPerSec, currentTime]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const scrollLeft = e.currentTarget.parentElement?.scrollLeft ?? 0;
      const x = e.clientX - rect.left + scrollLeft;
      const time = Math.max(0, Math.min(x / pxPerSec, duration));
      onSeek(time);
    },
    [pxPerSec, duration, onSeek],
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
  const left = event.startTime * pxPerSec;
  const width = Math.max(event.duration * pxPerSec, 24);

  return (
    <div
      className={`timeline-event timeline-event--${event.type} ${isSelected ? 'timeline-event--selected' : ''}`}
      style={{ left, width }}
      title={`${event.type}: ${event.label} (${event.startTime.toFixed(1)}s - ${(event.startTime + event.duration).toFixed(1)}s)`}
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

  const duration = currentShot?.duration ?? 5;
  const pxPerSec = PX_PER_SEC_BASE * state.timelineZoom;
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
    (time: number) => dispatch({ type: 'SEEK', time }),
    [dispatch],
  );

  // Ctrl+wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: state.timelineZoom + delta });
      }
    },
    [state.timelineZoom, dispatch],
  );

  // Playhead drag
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const handleMove = (ev: MouseEvent) => {
        if (!tracksRef.current) return;
        const rect = tracksRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left + tracksRef.current.scrollLeft;
        const time = Math.max(0, Math.min(x / pxPerSec, duration));
        dispatch({ type: 'SEEK', time });
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
          type: 'timelineEvent',
          shotIndex: state.currentShotIndex,
          id: event.id,
          trackId: event.trackId,
        },
      });
    },
    [dispatch, state.currentShotIndex],
  );

  const playheadX = state.currentTime * pxPerSec;

  // Format time display
  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    return `${String(mins).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div className="panel timeline-panel" onWheel={handleWheel}>
      {/* Header */}
      <div className="timeline-panel__header">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Timeline</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {formatTime(state.currentTime)} / {formatTime(duration)}
          </span>
          <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            Zoom: {Math.round(state.timelineZoom * 100)}%
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
            currentTime={state.currentTime}
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
                    state.selectedElement?.type === 'timelineEvent' &&
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
