import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditor, Track, TimelineEvent } from '../../hooks/useEditorState';

/* ================================================================
   Constants
   ================================================================ */
const RULER_HEIGHT = 28;
const TRACK_HEIGHT = 36;
const PIXELS_PER_SECOND_BASE = 120;

/* ================================================================
   Ruler canvas
   ================================================================ */

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

    const W = Math.max(duration * pxPerSec, canvas.parentElement?.clientWidth ?? 600);
    canvas.width = W;
    canvas.height = RULER_HEIGHT;

    ctx.clearRect(0, 0, W, RULER_HEIGHT);
    ctx.fillStyle = '#1e1e30';
    ctx.fillRect(0, 0, W, RULER_HEIGHT);

    // Tick marks
    const step = pxPerSec >= 80 ? 0.5 : 1;
    for (let t = 0; t <= duration; t += step) {
      const x = t * pxPerSec;
      const isMajor = t % 1 === 0;
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
        ctx.fillText(`${t}s`, x, 14);
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
      const x = e.clientX - rect.left + (e.currentTarget.parentElement?.scrollLeft ?? 0);
      const time = Math.max(0, Math.min(x / pxPerSec, duration));
      onSeek(time);
    },
    [pxPerSec, duration, onSeek]
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

/* ================================================================
   Event Block
   ================================================================ */

interface EventBlockProps {
  event: TimelineEvent;
  pxPerSec: number;
}

const EventBlock: React.FC<EventBlockProps> = ({ event, pxPerSec }) => {
  const left = event.startTime * pxPerSec;
  const width = Math.max(event.duration * pxPerSec, 20);

  return (
    <div
      className={`timeline-event timeline-event--${event.type}`}
      style={{ left, width }}
      title={`${event.type}: ${event.label} (${event.startTime}s - ${event.startTime + event.duration}s)`}
    >
      {event.label}
    </div>
  );
};

/* ================================================================
   Timeline Panel
   ================================================================ */

const TimelinePanel: React.FC = () => {
  const { state, dispatch, currentShot } = useEditor();
  const tracksRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const duration = currentShot?.duration ?? 5;
  const tracks = currentShot?.tracks ?? [];
  const pxPerSec = PIXELS_PER_SECOND_BASE * state.timelineZoom;
  const totalWidth = duration * pxPerSec;

  /* Sync vertical scroll between labels and tracks */
  const handleTracksScroll = useCallback(() => {
    if (tracksRef.current && labelsRef.current) {
      labelsRef.current.scrollTop = tracksRef.current.scrollTop;
    }
  }, []);

  /* Seek */
  const handleSeek = useCallback(
    (time: number) => {
      dispatch({ type: 'SEEK', time });
    },
    [dispatch]
  );

  /* Mouse wheel zoom */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        dispatch({ type: 'SET_TIMELINE_ZOOM', zoom: state.timelineZoom + delta });
      }
    },
    [state.timelineZoom, dispatch]
  );

  /* Playhead drag */
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const handleMove = (ev: MouseEvent) => {
        if (!tracksRef.current) return;
        const rect = tracksRef.current.getBoundingClientRect();
        const x = ev.clientX - rect.left + tracksRef.current.scrollLeft;
        const time = Math.max(0, Math.min(x / pxPerSec, duration));
        dispatch({ type: 'SEEK', time });
      };

      const handleUp = () => {
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [pxPerSec, duration, dispatch]
  );

  /* Toggle visibility */
  const handleToggleVisibility = useCallback(
    (trackId: string) => {
      dispatch({ type: 'TOGGLE_TRACK_VISIBILITY', trackId });
    },
    [dispatch]
  );

  const playheadX = state.currentTime * pxPerSec;

  return (
    <div className="panel timeline-panel" onWheel={handleWheel}>
      {/* Header bar */}
      <div className="timeline-panel__header">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Timeline</span>
        <span className="text-mono" style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Zoom: {Math.round(state.timelineZoom * 100)}%
        </span>
      </div>

      {/* Body: labels + tracks */}
      <div className="timeline-panel__body">
        {/* Track labels */}
        <div className="timeline-labels" ref={labelsRef}>
          <div className="timeline-labels__ruler-spacer" />
          {tracks.map((track) => (
            <div className="timeline-label" key={track.id}>
              <span
                className={`timeline-label__eye ${track.visible ? 'visible' : ''}`}
                onClick={() => handleToggleVisibility(track.id)}
              >
                {track.visible ? '👁' : '👁‍🗨'}
              </span>
              <span className="timeline-label__color" style={{ backgroundColor: track.color }} />
              <span className="timeline-label__name">{track.name}</span>
            </div>
          ))}
        </div>

        {/* Tracks area */}
        <div
          className="timeline-tracks"
          ref={tracksRef}
          onScroll={handleTracksScroll}
        >
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
              style={{ width: totalWidth, opacity: track.visible ? 1 : 0.35 }}
            >
              {track.events.map((ev) => (
                <EventBlock key={ev.id} event={ev} pxPerSec={pxPerSec} />
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
