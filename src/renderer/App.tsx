// ============================================================
// panda-shot-engine — Main App Component
// Enhanced with demo loading, keyboard shortcuts, and
// error boundary for production resilience.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorProvider, useEditor } from './hooks/useEditorState';
import EditorLayout from './components/layout/EditorLayout';
import Toolbar from './components/layout/Toolbar';
import { FULL_DEMO_DSL, DEMO_CHARACTERS, DEMO_SCENES } from '../demo/demo-project';
import { parseShots } from '../core/dsl/parser';
import { serializeShots } from '../core/dsl/serializer';

import './styles/global.css';
import './styles/components.css';

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

function KeyboardShortcuts() {
  const { state, dispatch, currentShot } = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Space: Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' });
        return;
      }

      // Ctrl+Z: Undo
      if (ctrl && !shift && e.code === 'KeyZ') {
        e.preventDefault();
        dispatch({ type: 'UNDO' });
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if ((ctrl && shift && e.code === 'KeyZ') || (ctrl && e.code === 'KeyY')) {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Delete / Backspace: Deselect or delete shot
      if (e.code === 'Escape') {
        e.preventDefault();
        dispatch({ type: 'DESELECT' });
        return;
      }

      // 1, 2, 3: View modes
      if (e.code === 'Digit1' && !ctrl) {
        dispatch({ type: 'SET_VIEW_MODE', mode: 'edit' });
        return;
      }
      if (e.code === 'Digit2' && !ctrl) {
        dispatch({ type: 'SET_VIEW_MODE', mode: 'preview' });
        return;
      }
      if (e.code === 'Digit3' && !ctrl) {
        dispatch({ type: 'SET_VIEW_MODE', mode: 'split' });
        return;
      }

      // Left / Right: Step through time
      if (e.code === 'ArrowLeft' && !ctrl) {
        e.preventDefault();
        dispatch({ type: 'SEEK', time: Math.max(0, state.currentTime - 0.1) });
        return;
      }
      if (e.code === 'ArrowRight' && !ctrl) {
        e.preventDefault();
        const maxTime = currentShot?.duration ?? 0;
        dispatch({
          type: 'SEEK',
          time: Math.min(maxTime, state.currentTime + 0.1),
        });
        return;
      }

      // Up / Down: Navigate shots
      if (e.code === 'ArrowUp' && !ctrl) {
        e.preventDefault();
        if (state.currentShotIndex > 0) {
          dispatch({
            type: 'SET_CURRENT_SHOT',
            index: state.currentShotIndex - 1,
          });
        }
        return;
      }
      if (e.code === 'ArrowDown' && !ctrl) {
        e.preventDefault();
        const maxIdx = (state.project?.shots.length ?? 1) - 1;
        if (state.currentShotIndex < maxIdx) {
          dispatch({
            type: 'SET_CURRENT_SHOT',
            index: state.currentShotIndex + 1,
          });
        }
        return;
      }

      // Home: Seek to start
      if (e.code === 'Home') {
        e.preventDefault();
        dispatch({ type: 'SEEK', time: 0 });
        return;
      }

      // End: Seek to end
      if (e.code === 'End') {
        e.preventDefault();
        dispatch({ type: 'SEEK', time: currentShot?.duration ?? 0 });
        return;
      }

      // Ctrl+= / Ctrl+-: Zoom
      if (ctrl && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: state.zoom + 25 });
        return;
      }
      if (ctrl && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: state.zoom - 25 });
        return;
      }

      // Ctrl+0: Reset zoom
      if (ctrl && e.code === 'Digit0') {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', zoom: 100 });
        return;
      }

      // Ctrl+N: New project
      if (ctrl && e.code === 'KeyN') {
        e.preventDefault();
        dispatch({ type: 'NEW_PROJECT' });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, dispatch, currentShot]);

  return null;
}

// ─── Status Bar ─────────────────────────────────────────────

function StatusBar() {
  const { state, totalDuration } = useEditor();

  const shotCount = state.project?.shots.length ?? 0;
  const charCount = state.project?.characters.length ?? 0;
  const errCount = state.dslErrors.length;
  const warnCount = state.dslWarnings.length;

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
          {charCount} character{charCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="status-bar-center">
        {state.viewMode === 'edit' && 'Edit Mode'}
        {state.viewMode === 'preview' && 'Preview Mode'}
        {state.viewMode === 'split' && 'Split View'}
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
        <span className="status-item">Zoom: {state.zoom}%</span>
        <span className="status-sep">|</span>
        <span className="status-item">
          Undo: {state.undoStack.length} | Redo: {state.redoStack.length}
        </span>
      </div>
    </div>
  );
}

// ─── App Inner (has access to editor context) ───────────────

function AppInner() {
  const [showSplash, setShowSplash] = useState(false);
  const { dispatch } = useEditor();

  const handleLoadDemo = useCallback(() => {
    try {
      const shots = parseShots(FULL_DEMO_DSL);
      dispatch({
        type: 'SET_PROJECT',
        project: {
          name: 'Panda Shot Engine — Demo',
          shots,
          characters: [...DEMO_CHARACTERS],
          scenes: [...DEMO_SCENES],
        },
        dslText: FULL_DEMO_DSL,
      });
    } catch (err) {
      console.error('Failed to load demo:', err);
    }
    setShowSplash(false);
  }, [dispatch]);

  const handleNewProject = useCallback(() => {
    dispatch({ type: 'NEW_PROJECT' });
    setShowSplash(false);
  }, [dispatch]);

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
      <KeyboardShortcuts />
      <Toolbar />
      <EditorLayout />
      <StatusBar />
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
