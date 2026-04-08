import React, { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '../../hooks/useEditorState';

const Toolbar: React.FC = () => {
  const { state, dispatch, currentShot } = useEditor();
  const { isPlaying, currentTime } = state;
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  /* ---------- Playback loop ---------- */
  useEffect(() => {
    if (!isPlaying || !currentShot) return;

    lastTickRef.current = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      const next = state.currentTime + dt;

      if (next >= currentShot.duration) {
        dispatch({ type: 'PAUSE' });
        dispatch({ type: 'SEEK', time: currentShot.duration });
      } else {
        dispatch({ type: 'SEEK', time: next });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  /* ---------- Helpers ---------- */
  const formatTime = (t: number): string => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  };

  const totalDuration = currentShot?.duration ?? 0;

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      dispatch({ type: 'PAUSE' });
    } else {
      if (currentTime >= totalDuration) {
        dispatch({ type: 'SEEK', time: 0 });
      }
      dispatch({ type: 'PLAY' });
    }
  }, [isPlaying, currentTime, totalDuration, dispatch]);

  const handleStop = useCallback(() => dispatch({ type: 'STOP' }), [dispatch]);
  const handleSkipBackward = useCallback(() => dispatch({ type: 'SKIP_BACKWARD' }), [dispatch]);
  const handleSkipForward = useCallback(() => dispatch({ type: 'SKIP_FORWARD' }), [dispatch]);
  const handleGoToStart = useCallback(() => dispatch({ type: 'SEEK', time: 0 }), [dispatch]);
  const handleGoToEnd = useCallback(
    () => dispatch({ type: 'SEEK', time: totalDuration }),
    [dispatch, totalDuration]
  );

  return (
    <div className="toolbar">
      {/* LEFT */}
      <div className="toolbar__left">
        <span className="toolbar__logo">🐼</span>
        <span className="toolbar__project-name">
          {state.currentProject?.name ?? 'Untitled Project'}
        </span>
      </div>

      {/* CENTER – playback controls */}
      <div className="toolbar__center">
        <button className="btn btn--icon" title="Go to start" onClick={handleGoToStart}>
          ⏮
        </button>
        <button className="btn btn--icon" title="Skip backward" onClick={handleSkipBackward}>
          ⏪
        </button>
        <button
          className={`btn btn--icon ${isPlaying ? 'active' : ''}`}
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={handlePlayPause}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="btn btn--icon" title="Skip forward" onClick={handleSkipForward}>
          ⏩
        </button>
        <button className="btn btn--icon" title="Go to end" onClick={handleGoToEnd}>
          ⏭
        </button>

        <div className="toolbar__time-display">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* RIGHT */}
      <div className="toolbar__right">
        <button className="btn btn--primary" title="Render / Export">
          🎬 Render
        </button>
        <button className="btn" title="Settings">
          ⚙ Settings
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
