// ============================================================
// panda-shot-engine — Asset Panel Component
// Uses CharacterAsset / SceneAsset types from project/types
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { CharacterAsset, SceneAsset } from '../../../core/project/types';
import './AssetPanel.css';

// ─── Character Thumbnail ────────────────────────────────────

const CharacterThumb: React.FC<{ character: CharacterAsset }> = ({ character }) => {
  // Show thumbnail or head part image, or fallback to color circle
  const img = character.thumbnail || character.parts['head'];
  return (
    <div className="asset-thumb" style={{ backgroundColor: (character.color || '#666') + '20' }}>
      {img ? (
        <img src={img} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 4 }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: character.color || '#666',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 18,
        }}>
          {character.name.charAt(0)}
        </div>
      )}
    </div>
  );
};

// ─── Scene Thumbnail ────────────────────────────────────────

const SceneThumb: React.FC<{ scene: SceneAsset }> = ({ scene }) => {
  return (
    <div className="asset-thumb">
      {scene.filePath ? (
        <img src={scene.filePath} alt={scene.name}
          style={{ width: 48, height: 48, borderRadius: 4, objectFit: 'cover' }} />
      ) : (
        <div style={{
          width: 48, height: 48, borderRadius: 4,
          background: scene.backgroundColor || '#1e1e2e',
        }} />
      )}
    </div>
  );
};

// ─── Asset Panel ────────────────────────────────────────────

type AssetTab = 'characters' | 'scenes' | 'props';

const AssetPanel: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [activeTab, setActiveTab] = useState<AssetTab>('characters');
  const [searchQuery, setSearchQuery] = useState('');

  const characters: CharacterAsset[] = state.project?.characters ?? [];
  const scenes: SceneAsset[] = state.project?.scenes ?? [];

  const filteredCharacters = useMemo(() => {
    if (!searchQuery) return characters;
    const q = searchQuery.toLowerCase();
    return characters.filter(
      (c) => c.id.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [characters, searchQuery]);

  const filteredScenes = useMemo(() => {
    if (!searchQuery) return scenes;
    const q = searchQuery.toLowerCase();
    return scenes.filter(
      (s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [scenes, searchQuery]);

  const handleSelectCharacter = useCallback((charId: string) => {
    const isAlready = state.selectedElement?.type === 'character' && state.selectedElement?.id === charId;
    if (isAlready) {
      dispatch({ type: 'DESELECT' });
    } else {
      dispatch({
        type: 'SELECT_ELEMENT',
        element: { type: 'character', shotIndex: state.currentShotIndex, id: charId },
      });
    }
  }, [state.selectedElement, state.currentShotIndex, dispatch]);

  const handleOpenManager = useCallback((tab: string) => {
    dispatch({ type: 'SHOW_MANAGER', tab });
  }, [dispatch]);

  // Props placeholders
  const props = [
    { id: 'iron_sword', name: 'Iron Sword', icon: '⚔' },
    { id: 'wine_cup', name: 'Wine Cup', icon: '☕' },
    { id: 'scroll', name: 'Scroll', icon: '📜' },
    { id: 'table', name: 'Table', icon: '📦' },
    { id: 'lantern', name: 'Lantern', icon: '🏮' },
  ];

  const filteredProps = useMemo(() => {
    if (!searchQuery) return props;
    const q = searchQuery.toLowerCase();
    return props.filter((p) => p.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const tabs: { key: AssetTab; label: string; count: number }[] = [
    { key: 'characters', label: 'Characters', count: filteredCharacters.length },
    { key: 'scenes', label: 'Scenes', count: filteredScenes.length },
    { key: 'props', label: 'Props', count: filteredProps.length },
  ];

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <span className="panel-header__title">Assets</span>
        <button className="btn btn--small"
          onClick={() => handleOpenManager('characters')}
          title="Open Asset Manager (Ctrl+M)">⚙</button>
      </div>

      {/* Search */}
      <div className="asset-search">
        <input type="text" className="input-text asset-search__input"
          placeholder="Search assets..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="asset-tabs">
        {tabs.map((tab) => (
          <button key={tab.key}
            className={`asset-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-body">
        {activeTab === 'characters' && (
          <>
            {filteredCharacters.map((char) => {
              const isSelected = state.selectedElement?.type === 'character' && state.selectedElement?.id === char.id;
              const exprCount = Object.keys(char.expressions).length;
              const partCount = Object.keys(char.parts).length;
              return (
                <div key={char.id}
                  className={`asset-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectCharacter(char.id)}>
                  <div className="asset-item__thumb">
                    <CharacterThumb character={char} />
                  </div>
                  <div className="asset-item__info">
                    <div className="asset-item__name">{char.name}</div>
                    <div className="asset-item__type">
                      {char.id} | {partCount} parts | {exprCount} expr
                    </div>
                    {char.description && (
                      <div className="asset-item__desc">{char.description}</div>
                    )}
                  </div>
                </div>
              );
            })}
            <button className="btn w-full" style={{ marginTop: 8 }}
              onClick={() => handleOpenManager('characters')}>
              + Manage Characters
            </button>
          </>
        )}

        {activeTab === 'scenes' && (
          <>
            {filteredScenes.map((scene) => (
              <div key={scene.id} className="asset-item">
                <div className="asset-item__thumb">
                  <SceneThumb scene={scene} />
                </div>
                <div className="asset-item__info">
                  <div className="asset-item__name">{scene.name}</div>
                  <div className="asset-item__type">{scene.id}</div>
                  {scene.description && (
                    <div className="asset-item__desc">{scene.description}</div>
                  )}
                </div>
              </div>
            ))}
            <button className="btn w-full" style={{ marginTop: 8 }}
              onClick={() => handleOpenManager('scenes')}>
              + Manage Scenes
            </button>
          </>
        )}

        {activeTab === 'props' && (
          <>
            {filteredProps.map((prop) => (
              <div key={prop.id} className="asset-item">
                <div className="asset-item__thumb"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 24 }}>{prop.icon}</span>
                </div>
                <div className="asset-item__info">
                  <div className="asset-item__name">{prop.name}</div>
                  <div className="asset-item__type">{prop.id}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AssetPanel;
