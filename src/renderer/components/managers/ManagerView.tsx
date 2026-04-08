import React, { useState } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import CharacterManager from './CharacterManager';
import SceneManager from './SceneManager';
import ActionManager from './ActionManager';
import ExpressionManager from './ExpressionManager';
import './ManagerView.css';

type ManagerTab = 'characters' | 'scenes' | 'actions' | 'expressions';

const TABS: { key: ManagerTab; label: string }[] = [
  { key: 'characters', label: 'Characters' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'actions', label: 'Actions' },
  { key: 'expressions', label: 'Expressions' },
];

export default function ManagerView({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<ManagerTab>('characters');

  return (
    <div className="manager-overlay">
      <div className="manager-topbar">
        <button className="manager-topbar__back" onClick={onClose}>
          ← Back to Editor
        </button>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`manager-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="manager-body">
        {activeTab === 'characters' && <CharacterManager />}
        {activeTab === 'scenes' && <SceneManager />}
        {activeTab === 'actions' && <ActionManager />}
        {activeTab === 'expressions' && <ExpressionManager />}
      </div>
    </div>
  );
}
