// ============================================================
// panda-shot-engine — Toolbar
// Full toolbar with playback controls, speed selection,
// zoom, view mode toggle, undo/redo, and export actions.
// ============================================================

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import { serializeShots } from '../../../core/dsl/serializer';

import './Toolbar.css';

// ─── Tool Button ────────────────────────────────────────────

interface ToolButtonProps {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  small?: boolean;
}

function ToolButton({
  label,
  title,
  onClick,
  active = false,
  disabled = false,
  variant = 'default',
  small = false,
}: ToolButtonProps) {
  return (
    <button
      className={`toolbar-btn toolbar-btn--${variant} ${active ? 'toolbar-btn--active' : ''} ${small ? 'toolbar-btn--small' : ''}`}
      title={title}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

// ─── Separator ──────────────────────────────────────────────

function ToolbarSeparator() {
  return <div className="toolbar-separator" />;
}

// ─── Time Display ───────────────────────────────────────────

function TimeDisplay() {
  const { state, currentShot } = useEditor();
  const time = state.playbackTime;
  const duration = currentShot?.duration ?? 0;

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = t % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
  };

  return (
    <div className="toolbar-time-display">
      <span className="toolbar-time-current">{formatTime(time)}</span>
      <span className="toolbar-time-sep">/</span>
      <span className="toolbar-time-total">{formatTime(duration)}</span>
    </div>
  );
}

// ─── Speed Dropdown ─────────────────────────────────────────

function SpeedSelector() {
  return (
    <div className="toolbar-speed-selector">
      <select
        className="toolbar-speed-select"
        value={1}
        disabled
        title="Playback speed"
      >
        <option value={1}>1x</option>
      </select>
    </div>
  );
}

// ─── Zoom Control ───────────────────────────────────────────

function ZoomControl() {
  const { state, dispatch } = useEditor();

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200];

  const zoomIn = useCallback(() => {
    const current = Math.round(state.zoom * 100);
    const nextLevel = zoomLevels.find((z) => z > current) ?? 200;
    dispatch({ type: 'SET_ZOOM', zoom: nextLevel / 100 });
  }, [state.zoom, dispatch]);

  const zoomOut = useCallback(() => {
    const current = Math.round(state.zoom * 100);
    const prevLevel = [...zoomLevels].reverse().find((z) => z < current) ?? 25;
    dispatch({ type: 'SET_ZOOM', zoom: prevLevel / 100 });
  }, [state.zoom, dispatch]);

  const resetZoom = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', zoom: 1 });
  }, [dispatch]);

  return (
    <div className="toolbar-zoom-control">
      <ToolButton label="-" title="Zoom out" onClick={zoomOut} small />
      <button
        className="toolbar-zoom-value"
        onClick={resetZoom}
        title="Reset zoom to 100%"
      >
        {Math.round(state.zoom * 100)}%
      </button>
      <ToolButton label="+" title="Zoom in" onClick={zoomIn} small />
    </div>
  );
}

// ─── View Mode Tabs ─────────────────────────────────────────

function ViewModeTabs() {
  return (
    <div className="toolbar-view-tabs">
      <button className="toolbar-view-tab toolbar-view-tab--active" title="Current view">
        Edit
      </button>
    </div>
  );
}

// ─── Export Menu ─────────────────────────────────────────────

function ExportMenu() {
  const { state } = useEditor();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExportDsl = useCallback(() => {
    if (!state.project) return;
    const dsl = serializeShots(state.project.shots);
    const blob = new Blob([dsl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name || 'project'}.panda`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [state.project]);

  const handleExportJson = useCallback(() => {
    if (!state.project) return;
    const json = JSON.stringify(
      {
        name: state.project.name,
        shots: state.project.shots,
        characters: state.project.characters,
        scenes: state.project.scenes,
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.name || 'project'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  }, [state.project]);

  const handleCopyDsl = useCallback(() => {
    if (!state.project) return;
    const dsl = serializeShots(state.project.shots);
    navigator.clipboard.writeText(dsl).catch(() => {
      // Fallback: select a temp textarea
      const ta = document.createElement('textarea');
      ta.value = dsl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setOpen(false);
  }, [state.project]);

  // Close menu on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="toolbar-export-wrapper" ref={menuRef}>
      <ToolButton
        label="Export"
        title="Export project"
        onClick={() => setOpen(!open)}
        variant="primary"
      />
      {open && (
        <div className="toolbar-export-menu">
          <div className="toolbar-export-item" onClick={handleExportDsl}>
            <span className="toolbar-export-icon">D</span>
            <div className="toolbar-export-info">
              <div className="toolbar-export-label">Export DSL (.panda)</div>
              <div className="toolbar-export-desc">Save as panda-shot DSL text</div>
            </div>
          </div>
          <div className="toolbar-export-item" onClick={handleExportJson}>
            <span className="toolbar-export-icon">J</span>
            <div className="toolbar-export-info">
              <div className="toolbar-export-label">Export JSON</div>
              <div className="toolbar-export-desc">Full project data as JSON</div>
            </div>
          </div>
          <div className="toolbar-export-divider" />
          <div className="toolbar-export-item" onClick={handleCopyDsl}>
            <span className="toolbar-export-icon">C</span>
            <div className="toolbar-export-info">
              <div className="toolbar-export-label">Copy DSL to Clipboard</div>
              <div className="toolbar-export-desc">Copy full DSL text</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Toolbar Component ─────────────────────────────────

export default function Toolbar() {
  const { state, dispatch, currentShot } = useEditor();

  // Playback controls
  const handlePlayPause = useCallback(() => {
    dispatch({ type: 'TOGGLE_PLAY' });
  }, [dispatch, state.isPlaying]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'STOP' });
  }, [dispatch]);

  const handleStepBack = useCallback(() => {
    dispatch({ type: 'SET_PLAYBACK_TIME', time: Math.max(0, state.playbackTime - 0.1) });
  }, [dispatch, state.playbackTime]);

  const handleStepForward = useCallback(() => {
    const maxTime = currentShot?.duration ?? 0;
    dispatch({
      type: 'SET_PLAYBACK_TIME',
      time: Math.min(maxTime, state.playbackTime + 0.1),
    });
  }, [dispatch, state.playbackTime, currentShot]);

  const handleSkipStart = useCallback(() => {
    dispatch({ type: 'SET_PLAYBACK_TIME', time: 0 });
  }, [dispatch]);

  const handleSkipEnd = useCallback(() => {
    const maxTime = currentShot?.duration ?? 0;
    dispatch({ type: 'SET_PLAYBACK_TIME', time: maxTime });
  }, [dispatch, currentShot]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, [dispatch]);

  const handleRedo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, [dispatch]);

  // Project info
  const projectName = state.project?.name ?? 'Untitled';
  const shotCount = state.project?.shots?.length ?? 0;
  const currentShotIdx = state.currentShotIndex;
  const hasErrors = false;

  return (
    <div className="toolbar">
      {/* Project Info */}
      <div className="toolbar-section toolbar-project-info">
        <span className="toolbar-project-name" title={projectName}>
          {projectName}
        </span>
        <span className="toolbar-shot-indicator">
          Shot {currentShotIdx + 1}/{shotCount}
        </span>
      </div>

      <ToolbarSeparator />

      {/* Undo/Redo */}
      <div className="toolbar-section">
        <ToolButton
          label="Undo"
          title="Undo (Ctrl+Z)"
          onClick={handleUndo}
          disabled={state.undoStack.length === 0}
          small
        />
        <ToolButton
          label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          onClick={handleRedo}
          disabled={state.redoStack.length === 0}
          small
        />
      </div>

      <ToolbarSeparator />

      {/* Playback Controls */}
      <div className="toolbar-section toolbar-playback">
        <ToolButton
          label="|<"
          title="Skip to start"
          onClick={handleSkipStart}
          small
        />
        <ToolButton
          label="<|"
          title="Step back (0.1s)"
          onClick={handleStepBack}
          small
        />
        <ToolButton
          label={state.isPlaying ? '||' : '>'}
          title={state.isPlaying ? 'Pause' : 'Play (Space)'}
          onClick={handlePlayPause}
          variant="primary"
        />
        <ToolButton
          label="|>"
          title="Step forward (0.1s)"
          onClick={handleStepForward}
          small
        />
        <ToolButton
          label=">|"
          title="Skip to end"
          onClick={handleSkipEnd}
          small
        />
        <ToolButton
          label="[]"
          title="Stop"
          onClick={handleStop}
          small
        />
      </div>

      {/* Time Display */}
      <TimeDisplay />

      {/* Speed */}
      <SpeedSelector />

      <ToolbarSeparator />

      {/* View Mode */}
      <ViewModeTabs />

      <ToolbarSeparator />

      {/* Zoom */}
      <ZoomControl />

      {/* Spacer */}
      <div className="toolbar-spacer" />

      {/* Export */}
      <ExportMenu />
    </div>
  );
}
