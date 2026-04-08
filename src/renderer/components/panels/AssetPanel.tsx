// ============================================================
// panda-shot-engine — Asset Panel Component
// Three tabs: Characters / Scenes / Props
// Character preview thumbnails, scene color blocks,
// drag-to-canvas, add character form, search/filter
// ============================================================

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useEditor, DEMO_CHARACTERS, DEMO_SCENES } from '../../hooks/useEditorState';
import type { DemoCharacter, DemoScene } from '../../../demo/demo-project';

import './AssetPanel.css';

// ─── Mini panda head canvas thumbnail ───────────────────────

function drawMiniPandaHead(
  canvas: HTMLCanvasElement,
  color: string,
  expression: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const cx = W / 2;
  const cy = H / 2 + 2;
  const r = Math.min(W, H) * 0.32;

  ctx.clearRect(0, 0, W, H);

  // Background circle with character color
  ctx.fillStyle = color + '30';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ears
  ctx.fillStyle = '#222';
  const earR = r * 0.3;
  ctx.beginPath();
  ctx.arc(cx - r * 0.7, cy - r * 0.75, earR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.7, cy - r * 0.75, earR, 0, Math.PI * 2);
  ctx.fill();

  // Eye patches
  ctx.fillStyle = '#222';
  const epW = r * 0.35;
  const epH = r * 0.28;
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.33, cy - r * 0.1, epW, epH, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.33, cy - r * 0.1, epW, epH, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  const eyeR = r * 0.12;
  ctx.beginPath();
  ctx.arc(cx - r * 0.33, cy - r * 0.1, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.33, cy - r * 0.1, eyeR, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.1, eyeR * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + r * 0.36, cy - r * 0.1, eyeR * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.2, r * 0.1, r * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth based on expression
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';

  if (expression === 'happy') {
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.3, r * 0.25, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (expression === 'angry') {
    ctx.fillStyle = '#333';
    ctx.fillRect(cx - r * 0.2, cy + r * 0.35, r * 0.4, r * 0.15);
  } else if (expression === 'shocked') {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.4, r * 0.15, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.2, cy + r * 0.4);
    ctx.lineTo(cx + r * 0.2, cy + r * 0.4);
    ctx.stroke();
  }

  // Color indicator dot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(W - 6, 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Character Thumbnail Component ──────────────────────────

const CharacterThumb: React.FC<{ character: DemoCharacter }> = ({ character }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      drawMiniPandaHead(canvasRef.current, character.color, 'neutral');
    }
  }, [character]);

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={48}
      style={{ borderRadius: 4 }}
    />
  );
};

// ─── Scene Preview Block ────────────────────────────────────

const ScenePreview: React.FC<{ scene: DemoScene }> = ({ scene }) => {
  return (
    <div
      className="scene-preview-block"
      style={{
        width: 48,
        height: 48,
        borderRadius: 4,
        background: `linear-gradient(180deg, ${scene.gradientStart}, ${scene.gradientEnd})`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Floor line */}
      <div
        style={{
          position: 'absolute',
          bottom: `${(1 - scene.floorY) * 100}%`,
          left: 0,
          right: 0,
          height: 1,
          background: 'rgba(255,255,255,0.2)',
        }}
      />
    </div>
  );
};

// ─── Add Character Modal ────────────────────────────────────

interface AddCharacterModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, style: string) => void;
}

const AddCharacterModal: React.FC<AddCharacterModalProps> = ({ open, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [style, setStyle] = useState('humanoid');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), style);
      setName('');
      setStyle('humanoid');
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Add Character</span>
          <button className="btn btn--small" onClick={onClose}>X</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="prop-row">
            <span className="prop-row__label">Name</span>
            <div className="prop-row__value">
              <input
                type="text"
                className="input-text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name..."
                autoFocus
              />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-row__label">Style</span>
            <div className="prop-row__value">
              <select
                className="input-select"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="humanoid">Humanoid</option>
                <option value="beast">Beast</option>
                <option value="chibi">Chibi</option>
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

// ─── Asset Panel Component ──────────────────────────────────

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
    (e: React.DragEvent, char: DemoCharacter) => {
      e.dataTransfer.setData(
        'application/panda-asset',
        JSON.stringify({ type: 'character', id: char.id, name: char.name }),
      );
      e.dataTransfer.effectAllowed = 'copy';
    },
    [],
  );

  const handleSceneDragStart = useCallback(
    (e: React.DragEvent, scene: DemoScene) => {
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
      // In a real implementation this would add to project state
      // For now just log
      console.log('Add character:', name, style);
    },
    [],
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
                  <div className="asset-item__thumb" style={{ backgroundColor: char.color + '20' }}>
                    <CharacterThumb character={char} />
                  </div>
                  <div className="asset-item__info">
                    <div className="asset-item__name">{char.name}</div>
                    <div className="asset-item__type">{char.id} | {char.skeletonType}</div>
                    <div className="asset-item__desc">{char.description}</div>
                  </div>
                  <span className="asset-item__drag-handle">...</span>
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
