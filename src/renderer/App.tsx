// ============================================================
// panda-shot-engine — Main App Component
// Enhanced with ManagerView overlay, keyboard shortcuts
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { EditorProvider, useEditor } from './hooks/useEditorState';
import EditorLayout from './components/layout/EditorLayout';
import Toolbar from './components/layout/Toolbar';
import ManagerView from './components/managers/ManagerView';
import { FULL_DEMO_DSL, DEMO_CHARACTERS, DEMO_SCENES } from '../demo/demo-project';

import './styles/global.css';
import './App.css';

// ─── Error Boundary ─────────────────────────────────────────

interface ErrorBoundaryProps { children: React.ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null; }

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
                <pre className="error-boundary-stack">{this.state.error?.stack}</pre>
              </details>
            )}
            <div className="error-boundary-actions">
              <button className="error-boundary-btn error-boundary-btn--primary"
                onClick={this.handleReset}>Try Again</button>
              <button className="error-boundary-btn"
                onClick={() => window.location.reload()}>Reload App</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Keyboard Shortcuts ─────────────────────────────────────

function KeyboardShortcuts() {
  const { state, dispatch, currentShot } = useEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      if (e.code === 'Space') { e.preventDefault(); dispatch({ type: state.isPlaying ? 'PAUSE' : 'PLAY' }); return; }
      if (ctrl && !shift && e.code === 'KeyZ') { e.preventDefault(); dispatch({ type: 'UNDO' }); return; }
      if ((ctrl && shift && e.code === 'KeyZ') || (ctrl && e.code === 'KeyY')) { e.preventDefault(); dispatch({ type: 'REDO' }); return; }
      if (e.code === 'Escape') { e.preventDefault(); dispatch({ type: 'DESELECT' }); return; }
      if (e.code === 'Digit1' && !ctrl) { dispatch({ type: 'SET_VIEW_MODE', mode: 'edit' }); return; }
      if (e.code === 'Digit2' && !ctrl) { dispatch({ type: 'SET_VIEW_MODE', mode: 'preview' }); return; }
      if (e.code === 'Digit3' && !ctrl) { dispatch({ type: 'SET_VIEW_MODE', mode: 'split' }); return; }
      if (e.code === 'ArrowLeft' && !ctrl) { e.preventDefault(); dispatch({ type: 'SEEK', time: Math.max(0, state.playbackTime - 0.1) }); return; }
      if (e.code === 'ArrowRight' && !ctrl) { e.preventDefault(); dispatch({ type: 'SEEK', time: Math.min(currentShot?.duration ?? 0, state.playbackTime + 0.1) }); return; }
      if (e.code === 'ArrowUp' && !ctrl && state.currentShotIndex > 0) { e.preventDefault(); dispatch({ type: 'SET_CURRENT_SHOT', index: state.currentShotIndex - 1 }); return; }
      if (e.code === 'ArrowDown' && !ctrl) { e.preventDefault(); const max = (state.project?.shots.length ?? 1) - 1; if (state.currentShotIndex < max) dispatch({ type: 'SET_CURRENT_SHOT', index: state.currentShotIndex + 1 }); return; }
      if (e.code === 'Home') { e.preventDefault(); dispatch({ type: 'SEEK', time: 0 }); return; }
      if (e.code === 'End') { e.preventDefault(); dispatch({ type: 'SEEK', time: currentShot?.duration ?? 0 }); return; }
      if (ctrl && (e.code === 'Equal' || e.code === 'NumpadAdd')) { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom + 25 }); return; }
      if (ctrl && (e.code === 'Minus' || e.code === 'NumpadSubtract')) { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: state.zoom - 25 }); return; }
      if (ctrl && e.code === 'Digit0') { e.preventDefault(); dispatch({ type: 'SET_ZOOM', zoom: 100 }); return; }
      if (ctrl && e.code === 'KeyN') { e.preventDefault(); dispatch({ type: 'NEW_PROJECT' }); return; }
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
        <span className="status-item">{shotCount} shot{shotCount !== 1 ? 's' : ''}</span>
        <span className="status-sep">|</span>
        <span className="status-item">{totalDuration.toFixed(1)}s total</span>
        <span className="status-sep">|</span>
        <span className="status-item">{charCount} character{charCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="status-bar-center">
        {state.viewMode === 'edit' && 'Edit Mode'}
        {state.viewMode === 'preview' && 'Preview Mode'}
        {state.viewMode === 'split' && 'Split View'}
      </div>
      <div className="status-bar-right">
        {errCount > 0 && <span className="status-errors">{errCount} error{errCount !== 1 ? 's' : ''}</span>}
        {warnCount > 0 && <span className="status-warnings">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>}
        {errCount === 0 && warnCount === 0 && <span className="status-ok">OK</span>}
        <span className="status-sep">|</span>
        <span className="status-item">Zoom: {state.zoom}%</span>
        <span className="status-sep">|</span>
        <span className="status-item">Ctrl+M: Manager</span>
      </div>
    </div>
  );
}

// ─── App Inner ──────────────────────────────────────────────

function AppInner() {
  const [showSplash, setShowSplash] = useState(false);
  const { dispatch, state } = useEditor();

  const handleLoadDemo = useCallback(() => {
    dispatch({
      type: 'SET_PROJECT',
      project: {
        name: 'Panda Shot Engine — Demo',
        shots: state.project?.shots ?? [],
        characters: [...DEMO_CHARACTERS],
        scenes: [...DEMO_SCENES],
      },
      dslText: FULL_DEMO_DSL,
    });
    setShowSplash(false);
  }, [dispatch, state.project?.shots]);

  const handleNewProject = useCallback(() => {
    dispatch({ type: 'NEW_PROJECT' });
    setShowSplash(false);
  }, [dispatch]);

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">
            <h1 className="splash-title">Panda Shot Engine</h1>
            <p className="splash-subtitle">Visual Story DSL Editor</p>
          </div>
          <div className="splash-actions">
            <button className="splash-btn splash-btn--primary" onClick={handleLoadDemo}>
              Load Demo Project
            </button>
            <button className="splash-btn" onClick={handleNewProject}>
              New Empty Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <KeyboardShortcuts />
      <Toolbar />
      <EditorLayout />
      <StatusBar />
      <ManagerView />
    </div>
  );
}

// ─── Main App ───────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <EditorProvider>
        <AppInner />
      </EditorProvider>
    </ErrorBoundary>
  );
}
