// ============================================================
// panda-shot-engine — Manager View (Full-screen Overlay)
// Tabs: Characters / Expressions / Actions / Scenes / Appearances
// ============================================================

import React, { useCallback, useEffect } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import CharacterManager from '../managers/CharacterManager';
import ExpressionManager from '../managers/ExpressionManager';
import ActionManager from '../managers/ActionManager';
import SceneManager from '../managers/SceneManager';
import AppearanceManager from '../managers/AppearanceManager';
import './ManagerView.css';

const TABS = [
  { key: 'characters', label: '👤 Characters' },
  { key: 'expressions', label: '😀 Expressions' },
  { key: 'actions', label: '🏃 Actions' },
  { key: 'scenes', label: '🎬 Scenes' },
  { key: 'appearances', label: '👔 Appearances' },
] as const;

const ManagerView: React.FC = () => {
  const { state, dispatch } = useEditor();

  const handleClose = useCallback(() => {
    dispatch({ type: 'HIDE_MANAGER' });
  }, [dispatch]);

  const handleTabChange = useCallback((tab: string) => {
    dispatch({ type: 'SET_MANAGER_TAB', tab });
  }, [dispatch]);

  // Ctrl+M to toggle, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyM') {
        e.preventDefault();
        if (state.showManager) {
          dispatch({ type: 'HIDE_MANAGER' });
        } else {
          dispatch({ type: 'SHOW_MANAGER' });
        }
      }
      if (e.code === 'Escape' && state.showManager) {
        e.preventDefault();
        dispatch({ type: 'HIDE_MANAGER' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.showManager, dispatch]);

  if (!state.showManager) return null;

  const activeTab = state.managerTab;

  return (
    <div className="manager-overlay">
      <div className="manager-container">
        {/* Header */}
        <div className="manager-header">
          <div className="manager-header__title">Asset Manager</div>
          <div className="manager-header__tabs">
            {TABS.map((tab) => (
              <button key={tab.key}
                className={`manager-tab ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleTabChange(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>
          <button className="manager-header__close" onClick={handleClose} title="Close (Esc)">✕</button>
        </div>

        {/* Body */}
        <div className="manager-body">
          {activeTab === 'characters' && <CharacterManager />}
          {activeTab === 'expressions' && <ExpressionManager />}
          {activeTab === 'actions' && <ActionManager />}
          {activeTab === 'scenes' && <SceneManager />}
          {activeTab === 'appearances' && <AppearanceManager />}
        </div>
      </div>
    </div>
  );
};

export default ManagerView;
