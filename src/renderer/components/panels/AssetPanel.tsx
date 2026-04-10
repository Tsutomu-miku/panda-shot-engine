/**
 * Asset Panel — Sidebar panel showing characters, scenes, and props
 * 
 * Uses image-based CharacterAsset and SceneAsset types.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useEditor, CharacterAsset, SceneAsset } from '../../hooks/useEditorState';
import { DEMO_CHARACTERS, DEMO_SCENES } from '../../../demo/demo-project';

import './AssetPanel.css';

// ─── Scene Preview Component ──────────────────────────────

const ScenePreview: React.FC<{ scene: SceneAsset }> = ({ scene }) => (
  <div style={{
    width: '100%', height: '100%', position: 'relative', borderRadius: 4, overflow: 'hidden',
  }}>
    {scene.backgroundImage ? (
      <img src={scene.backgroundImage} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      <>
        <div style={{
          width: '100%', height: '100%',
          background: `linear-gradient(to bottom, ${scene.gradientStart}, ${scene.gradientEnd})`,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: `${(1 - scene.floorY) * 100}%`,
          background: scene.color, opacity: 0.3,
        }} />
      </>
    )}
  </div>
);

// ─── Character Thumbnail ────────────────────────────────

const CharacterThumb: React.FC<{ character: CharacterAsset }> = ({ character }) => {
  if (character.thumbnail) {
    return <img src={character.thumbnail} alt={character.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />;
  }
  // Fallback: show first letter
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, fontWeight: 700, color: '#b4befe', background: '#252538', borderRadius: 4,
    }}>
      {character.name[0]?.toUpperCase() ?? '?'}
    </div>
  );
};

// ─── Add Character Modal ────────────────────────────────

interface AddCharacterModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, style: string) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const AddCharacterModal: React.FC<AddCharacterModalProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [style, setStyle] = useState('humanoid');

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">Add Character</div>
        <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onAdd(name.trim(), style); setName(''); onClose(); } }} className="modal-body">
          <div className="prop-row">
            <span className="prop-row__label">Name</span>
            <div className="prop-row__value">
              <input type="text" className="input-text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name..." autoFocus />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-row__label">Style</span>
            <div className="prop-row__value">
              <select className="input-select" value={style} onChange={(e) => setStyle(e.target.value)}>
                <option value="humanoid">Humanoid</option>
                <option value="beast">Beast</option>
                <option value="chibi">Chibi</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Asset Panel Component ──────────────────────────────

type AssetTab = 'characters' | 'scenes' | 'props';

const AssetPanel: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [activeTab, setActiveTab] = useState<AssetTab>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCharModal, setShowAddCharModal] = useState(false);

  const characters = state.project?.characters ?? DEMO_CHARACTERS;
  const scenes = state.project?.scenes ?? DEMO_SCENES;

  // Filter items by search
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

  // Drag start for characters
  const handleCharDragStart = useCallback(
    (e: React.DragEvent, char: CharacterAsset) => {
      e.dataTransfer.setData(
        'application/panda-asset',
        JSON.stringify({ type: 'character', id: char.id, name: char.name }),
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleSceneDragStart = useCallback(
    (e: React.DragEvent, scene: SceneAsset) => {
      e.dataTransfer.setData(
        'application/panda-asset',
        JSON.stringify({ type: 'scene', id: scene.id, name: scene.name }),
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleSelectCharacter = useCallback(
    (charId: string) => {
      const isAlready =
        state.selectedElement?.type === 'character' &&
        state.selectedElement?.id === charId;
      if (isAlready) {
        dispatch({ type: 'DESELECT' });
      } else {
        dispatch({
          type: 'SELECT_ELEMENT',
          element: {
            type: 'character',
            shotIndex: state.currentShotIndex,
            id: charId,
          },
        });
      }
    },
    [state.selectedElement, state.currentShotIndex, dispatch],
  );

  const handleAddCharacter = useCallback(
    (name: string, style: string) => {
      const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
      const newChar: CharacterAsset = {
        id,
        name,
        style: style as CharacterAsset['style'],
        parts: {},
        expressions: {},
        skeletonType: style === 'beast' ? 'beast' : style === 'chibi' ? 'chibi' : 'humanoid',
        description: '',
      };
      dispatch({ type: 'ADD_CHARACTER', character: newChar });
    },
    [dispatch],
  );

  // Built-in props list
  const props = [
    { id: 'iron_sword', name: 'Iron Sword', color: '#90a4ae', icon: 'sword' },
    { id: 'wine_cup', name: 'Wine Cup', color: '#ce93d8', icon: 'cup' },
    { id: 'scroll', name: 'Scroll', color: '#fff9c4', icon: 'scroll' },
    { id: 'table', name: 'Table', color: '#8d6e63', icon: 'table' },
    { id: 'lantern', name: 'Lantern', color: '#ffab40', icon: 'lantern' },
  ];

  const filteredProps = useMemo(() => {
    if (!searchQuery) return props;
    const q = searchQuery.toLowerCase();
    return props.filter(
      (p) => p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
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
      </div>

      {/* Search */}
      <div className="asset-search">
        <input
          type="text"
          className="input-text asset-search__input"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="asset-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`asset-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="panel-body">
        {activeTab === 'characters' && (
          <>
            {filteredCharacters.map((char) => {
              const isSelected =
                state.selectedElement?.type === 'character' &&
                state.selectedElement?.id === char.id;
              return (
                <div
                  key={char.id}
                  className={`asset-item ${isSelected ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => handleCharDragStart(e, char)}
                  onClick={() => handleSelectCharacter(char.id)}
                >
                  <div className="asset-item__thumb" style={{ backgroundColor: '#252538' }}>
                    <CharacterThumb character={char} />
                  </div>
                  <div className="asset-item__info">
                    <div className="asset-item__name">{char.name}</div>
                    <div className="asset-item__type">{char.style} | {Object.keys(char.parts).length} parts | {Object.keys(char.expressions).length} expr</div>
                    {char.description && <div className="asset-item__desc">{char.description}</div>}
                  </div>
                  <span className="asset-item__drag-handle">⠇</span>
                </div>
              );
            })}
          </>
        )}

        {activeTab === 'scenes' && (
          <>
            {filteredScenes.map((scene) => (
              <div
                key={scene.id}
                className="asset-item"
                draggable
                onDragStart={(e) => handleSceneDragStart(e, scene)}
              >
                <div className="asset-item__thumb">
                  <ScenePreview scene={scene} />
                </div>
                <div className="asset-item__info">
                  <div className="asset-item__name">{scene.name}</div>
                  <div className="asset-item__type">{scene.id}</div>
                  <div className="asset-item__desc">{scene.description}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === 'props' && (
          <>
            {filteredProps.map((prop) => (
              <div key={prop.id} className="asset-item">
                <div
                  className="asset-item__thumb"
                  style={{ backgroundColor: prop.color + '40' }}
                >
                  <span style={{ fontSize: 20 }}>
                    {prop.icon === 'sword' ? '\u2694' :
                     prop.icon === 'cup' ? '\u2615' :
                     prop.icon === 'scroll' ? '\u{1F4DC}' :
                     prop.icon === 'lantern' ? '\u{1F3EE}' :
                     '\u{1F4E6}'}
                  </span>
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

      {/* Footer */}
      <div className="asset-panel__footer">
        {activeTab === 'characters' && (
          <button
            className="btn w-full"
            onClick={() => setShowAddCharModal(true)}
          >
            + Add Character
          </button>
        )}
      </div>

      {/* Add Character Modal */}
      <AddCharacterModal
        open={showAddCharModal}
        onClose={() => setShowAddCharModal(false)}
        onAdd={handleAddCharacter}
      />
    </div>
  );
};

export default AssetPanel;
