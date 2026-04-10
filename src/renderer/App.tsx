// ============================================================
// panda-shot-engine — Main App Component
// Enhanced with demo loading, keyboard shortcuts,
// error boundary, and Manager View integration.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorProvider, useEditor } from './hooks/useEditorState';
import EditorLayout from './components/layout/EditorLayout';
import Toolbar from './components/layout/Toolbar';
import ManagerView from './components/managers/ManagerView';
import { FULL_DEMO_DSL, DEMO_CHARACTERS, DEMO_SCENES } from '../demo/demo-project';
import { parseShots } from '../core/dsl/parser';
import { serializeShots } from '../core/dsl/serializer';

import './App.css';

// ─── Error Boundary ─────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PandaShotEngine] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">!</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            {this.state.errorInfo && (
              <details className="error-boundary-details">
                <summary>Technical Details</summary>
                <pre className="error-boundary-stack">
                  {this.state.error?.stack}
                </pre>
                <pre className="error-boundary-component-stack">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button
                className="error-boundary-btn error-boundary-btn--primary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
              <button
                className="error-boundary-btn"
                onClick={() => window.location.reload()}
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Splash Screen ──────────────────────────────────────────

function SplashScreen({ onLoadDemo, onNewProject }: {
  onLoadDemo: () => void;
  onNewProject: () => void;
}) {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="splash-logo-panda">P</div>
          <h1 className="splash-title">Panda Shot Engine</h1>
          <p className="splash-subtitle">Visual Story DSL Editor</p>
        </div>

        <div className="splash-actions">
          <button
            className="splash-btn splash-btn--primary"
            onClick={onLoadDemo}
          >
            <span className="splash-btn-icon">D</span>
            <div className="splash-btn-text">
              <span className="splash-btn-label">Load Demo Project</span>
              <span className="splash-btn-desc">
                3-shot "Inn Encounter" story with 5 characters
              </span>
            </div>
          </button>

          <button className="splash-btn" onClick={onNewProject}>
            <span className="splash-btn-icon">+</span>
            <div className="splash-btn-text">
              <span className="splash-btn-label">New Empty Project</span>
              <span className="splash-btn-desc">
                Start from scratch with a blank shot
              </span>
            </div>
          </button>
        </div>

        <div className="splash-info">
          <div className="splash-info-item">
            <span className="splash-info-key">Space</span>
            <span className="splash-info-desc">Play / Pause</span>
          </div>
          <div className="splash-info-item">
            <span className="splash-info-key">Ctrl+Z</span>
            <span className="splash-info-desc">Undo</span>
          </div>
          <div className="splash-info-item">
            <span className="splash-info-key">Ctrl+Shift+Z</span>
            <span className="splash-info-desc">Redo</span>
          </div>
          <div className="splash-info-item">
            <span className="splash-info-key">1 / 2 / 3</span>
            <span className="splash-info-desc">Switch View Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard Shortcuts ─────────────────────────────────────

function KeyboardShortcuts({ onOpenManager }: { onOpenManager: () => void }) {
  const { state, dispatch, currentShot } = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PLAY' });
        return;
      }

      if (ctrl && !shift && e.code === 'KeyZ') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }

      if ((ctrl && shift && e.code === 'KeyZ') || (ctrl && e.code === 'KeyY')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'DESELECT' });
        return;
      }

      // Ctrl+M: Open Manager View
      if (ctrl && e.code === 'KeyM') {
        e.preventDefault();
        onOpenManager();
        return;
      }

      if (e.code === 'ArrowLeft' && !ctrl) {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYBACK_TIME', time: Math.max(0, state.playbackTime - 0.1) });
        return;
      }
      if (e.code === 'ArrowRight' && !ctrl) {
        e.preventDefault();
        const maxTime = currentShot?.duration ?? 0;
        dispatch({
          type: 'SET_PLAYBACK_TIME',
          time: Math.min(maxTime, state.playbackTime + 0.1),
        });
        return;
      }

      if (e.code === 'ArrowUp' && !ctrl) {
        e.preventDefault();
        if (state.currentShotIndex > 0) {
          dispatch({ type: 'SELECT_SHOT', index: state.currentShotIndex - 1 });
        }
        return;
      }
      if (e.code === 'ArrowDown' && !ctrl) {
        e.preventDefault();
        const maxIdx = (state.project?.shots.length ?? 1) - 1;
        if (state.currentShotIndex < maxIdx) {
          dispatch({ type: 'SELECT_SHOT', index: state.currentShotIndex + 1 });
        }
        return;
      }

      if (e.code === 'Home') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYBACK_TIME', time: 0 });
        return;
      }

      if (e.code === 'End') {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYBACK_TIME', time: currentShot?.duration ?? 0 });
        return;
      }

      if (ctrl && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: Math.min(4, state.zoom + 0.25) });
        return;
      }
      if (ctrl && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: Math.max(0.1, state.zoom - 0.25) });
        return;
      }

      if (ctrl && e.code === 'Digit0') {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: 1 });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, dispatch, currentShot, onOpenManager]);

  return null;
}

// ─── Status Bar ─────────────────────────────────────────────

function StatusBar({ onOpenManager }: { onOpenManager: () => void }) {
  const { state } = useEditor();

  const shotCount = state.project?.shots?.length ?? 0;
  const charCount = state.project?.characters?.length ?? 0;
  const sceneCount = state.project?.scenes?.length ?? 0;
  const actionCount = state.project?.customActions?.length ?? 0;
  const errCount = 0;
  const warnCount = 0;
  const totalDuration = (state.project?.shots ?? []).reduce(
    (sum, shot) => sum + (shot.duration ?? 0),
    0,
  );
  const viewModeLabel = 'Edit Mode';
  const zoomPercent = Math.round((state.zoom ?? 1) * 100);
  const undoCount = state.undoStack?.length ?? 0;
  const redoCount = state.redoStack?.length ?? 0;

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <span className="status-item">
          {shotCount} shot{shotCount !== 1 ? 's' : ''}
        </span>
        <span className="status-sep">|</span>
        <span className="status-item">
          {totalDuration.toFixed(1)}s total
        </span>
        <span className="status-sep">|</span>
        <span className="status-item">
          {charCount} char{charCount !== 1 ? 's' : ''}
        </span>
        <span className="status-sep">|</span>
        <span className="status-item">
          {sceneCount} scene{sceneCount !== 1 ? 's' : ''}
        </span>
        {actionCount > 0 && (
          <>
            <span className="status-sep">|</span>
            <span className="status-item">
              {actionCount} custom action{actionCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>
      <div className="status-bar-center">
        {viewModeLabel}
        <button
          className="status-manager-btn"
          onClick={onOpenManager}
          title="Open Asset Manager (Ctrl+M)"
        >
          Manage Assets
        </button>
      </div>
      <div className="status-bar-right">
        {errCount > 0 && (
          <span className="status-errors">
            {errCount} error{errCount !== 1 ? 's' : ''}
          </span>
        )}
        {warnCount > 0 && (
          <span className="status-warnings">
            {warnCount} warning{warnCount !== 1 ? 's' : ''}
          </span>
        )}
        {errCount === 0 && warnCount === 0 && (
          <span className="status-ok">OK</span>
        )}
        <span className="status-sep">|</span>
        <span className="status-item">Zoom: {zoomPercent}%</span>
        <span className="status-sep">|</span>
        <span className="status-item">
          Undo: {undoCount} | Redo: {redoCount}
        </span>
      </div>
    </div>
  );
}

// ─── App Inner (has access to editor context) ───────────────

function AppInner() {
  const [showSplash, setShowSplash] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const { dispatch } = useEditor();

  const handleLoadDemo = useCallback(() => {
    try {
      dispatch({
        type: 'LOAD_PROJECT',
        project: {
          name: 'Panda Shot Engine — Demo',
          shots: [
            ...parseShots(FULL_DEMO_DSL).map((shot, index) => ({
              id: shot.id,
              label: `Shot ${index + 1}`,
              dsl: serializeShots([shot]),
              duration: shot.duration,
            })),
          ],
          characters: [...DEMO_CHARACTERS],
          scenes: [...DEMO_SCENES],
          customActions: [],
        },
      });
    } catch (err) {
      console.error('Failed to load demo:', err);
    }
    setShowSplash(false);
  }, [dispatch]);

  const handleNewProject = useCallback(() => {
    dispatch({
      type: 'LOAD_PROJECT',
      project: {
        name: 'Untitled Project',
        shots: [
          {
            id: 'shot_001',
            label: 'Shot 1',
            dsl: 'scene tavern_interior',
            duration: 3,
          },
        ],
        characters: [...DEMO_CHARACTERS],
        scenes: [...DEMO_SCENES],
        customActions: [],
      },
    });
    setShowSplash(false);
  }, [dispatch]);

  const handleOpenManager = useCallback(() => {
    setShowManager(true);
  }, []);

  const handleCloseManager = useCallback(() => {
    setShowManager(false);
  }, []);

  if (showSplash) {
    return (
      <SplashScreen
        onLoadDemo={handleLoadDemo}
        onNewProject={handleNewProject}
      />
    );
  }

  return (
    <div className="app-root">
      <KeyboardShortcuts onOpenManager={handleOpenManager} />
      <Toolbar />
      <EditorLayout />
      <StatusBar onOpenManager={handleOpenManager} />
      {showManager && <ManagerView open={showManager} onClose={handleCloseManager} />}
    </div>
  );
}

// ─── Main App with Provider ─────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <AppInner />
      </EditorProvider>
    </ErrorBoundary>
  );
}
