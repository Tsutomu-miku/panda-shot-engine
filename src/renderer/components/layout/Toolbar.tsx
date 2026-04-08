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
  const time = state.currentTime;
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
  const { state, dispatch } = useEditor();
  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

  return (
    <div className="toolbar-speed-selector">
      <select
        className="toolbar-speed-select"
        value={state.playbackSpeed}
        onChange={(e) =>
          dispatch({ type: 'SET_SPEED', speed: parseFloat(e.target.value) })
        }
        title="Playback speed"
      >
        {speeds.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Zoom Control ───────────────────────────────────────────

function ZoomControl() {
  const { state, dispatch } = useEditor();

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200];

  const zoomIn = useCallback(() => {
    const current = state.zoom;
    const nextLevel = zoomLevels.find((z) => z > current) ?? 200;
    dispatch({ type: 'SET_ZOOM', zoom: nextLevel });
  }, [state.zoom, dispatch]);

  const zoomOut = useCallback(() => {
    const current = state.zoom;
    const prevLevel = [...zoomLevels].reverse().find((z) => z < current) ?? 25;
    dispatch({ type: 'SET_ZOOM', zoom: prevLevel });
  }, [state.zoom, dispatch]);

  const resetZoom = useCallback(() => {
    dispatch({ type: 'SET_ZOOM', zoom: 100 });
  }, [dispatch]);

  return (
    <div className="toolbar-zoom-control">
      <ToolButton label="-" title="Zoom out" onClick={zoomOut} small />
      <button
        className="toolbar-zoom-value"
        onClick={resetZoom}
        title="Reset zoom to 100%"
      >
        {state.zoom}%
      </button>
      <ToolButton label="+" title="Zoom in" onClick={zoomIn} small />
    </div>
  );
}

// ─── View Mode Tabs ─────────────────────────────────────────

function ViewModeTabs() {
  const { state, dispatch } = useEditor();

  const modes: Array<{ id: 'edit' | 'preview' | 'split'; label: string }> = [
    { id: 'edit', label: 'Edit' },
    { id: 'preview', label: 'Preview' },
    { id: 'split', label: 'Split' },
  ];

  return (
    <div className="toolbar-view-tabs">
      {modes.map((mode) => (
        <button
          key={mode.id}
          className={`toolbar-view-tab ${state.viewMode === mode.id ? 'toolbar-view-tab--active' : ''}`}
          onClick={() => dispatch({ type: 'SET_VIEW_MODE', mode: mode.id })}
          title={`Switch to ${mode.label} view`}
        >
          {mode.label}
        </button>
      ))}
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
    dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' });
  }, [dispatch, state.isPlaying]);

  const handleStop = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    dispatch({ type: 'SEEK', time: 0 });
  }, [dispatch]);

  const handleStepBack = useCallback(() => {
    dispatch({ type: 'PAUSE' });
    dispatch({ type: 'SEEK', time: Math.max(0, state.currentTime - 0.1) });
  }, [dispatch, state.currentTime]);

  const handleStepForward = useCallback(() => {
    const maxTime = currentShot?.duration ?? 0;
    dispatch({ type: 'PAUSE' });
    dispatch({
      type: 'SEEK',
      time: Math.min(maxTime, state.currentTime + 0.1),
    });
  }, [dispatch, state.currentTime, currentShot]);

  const handleSkipStart = useCallback(() => {
    dispatch({ type: 'SEEK', time: 0 });
  }, [dispatch]);

  const handleSkipEnd = useCallback(() => {
    const maxTime = currentShot?.duration ?? 0;
    dispatch({ type: 'SEEK', time: maxTime });
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
  const shotCount = state.project?.shots.length ?? 0;
  const currentShotIdx = state.currentShotIndex;
  const hasErrors = state.dslErrors.length > 0;

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
        {hasErrors && (
          <span className="toolbar-error-badge" title={`${state.dslErrors.length} error(s)`}>
            {state.dslErrors.length} err
          </span>
        )}
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
