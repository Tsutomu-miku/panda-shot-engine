/**
 * ManagerView — Full-screen overlay with tabbed management panels
 */

import React, { useState, useCallback, useEffect } from 'react';
import CharacterManager from './CharacterManager';
import SceneManager from './SceneManager';
import ActionManager from './ActionManager';
import ExpressionManager from './ExpressionManager';
import './ManagerView.css';

type ManagerTab = 'characters' | 'scenes' | 'actions' | 'expressions';

interface ManagerViewProps {
  open: boolean;
  onClose: () => void;
  initialTab?: ManagerTab;
}

export default function ManagerView({ open, onClose, initialTab = 'characters' }: ManagerViewProps) {
  const [activeTab, setActiveTab] = useState<ManagerTab>(initialTab);

  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const tabs: { key: ManagerTab; label: string; icon: string }[] = [
    { key: 'characters', label: 'Characters', icon: '👤' },
    { key: 'expressions', label: 'Expressions', icon: '😊' },
    { key: 'scenes', label: 'Scenes', icon: '🎬' },
    { key: 'actions', label: 'Actions', icon: '⚡' },
  ];

  return (
    <div className="manager-overlay" onClick={onClose}>
      <div className="manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="manager-sidebar">
          <div className="manager-sidebar__title">Asset Manager</div>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`manager-sidebar__tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="manager-sidebar__icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
          <div className="manager-sidebar__spacer" />
          <button className="manager-sidebar__close" onClick={onClose}>
            ✕ Close (Esc)
          </button>
        </div>
        <div className="manager-content">
          {activeTab === 'characters' && <CharacterManager />}
          {activeTab === 'expressions' && <ExpressionManager />}
          {activeTab === 'scenes' && <SceneManager />}
          {activeTab === 'actions' && <ActionManager />}
        </div>
      </div>
    </div>
  );
}
