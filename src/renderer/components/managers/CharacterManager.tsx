// ============================================================
// panda-shot-engine — Character Manager Component
// Full CRUD for characters with image-based body parts
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { CharacterAsset } from '../../../core/project/types';
import './CharacterManager.css';

let _cid = 0;
function genCharId(): string {
  return `char_${Date.now().toString(36)}_${(++_cid).toString(36)}`;
}

// ─── Image Upload Slot ──────────────────────────────────────

const ImageSlot: React.FC<{
  label: string;
  src?: string;
  onUpload: (dataUrl: string) => void;
  onClear?: () => void;
  size?: number;
}> = ({ label, src, onUpload, onClear, size = 72 }) => {
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') onUpload(reader.result); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="char-img-slot" style={{ width: size, height: size }}
      onClick={() => ref.current?.click()}>
      {src ? (
        <>
          <img src={src} alt={label} className="char-img-slot__img" />
          {onClear && (
            <button className="char-img-slot__clear" onClick={(ev) => { ev.stopPropagation(); onClear(); }}>×</button>
          )}
        </>
      ) : (
        <div className="char-img-slot__empty">
          <span>+</span>
          <span className="char-img-slot__label">{label}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Body Part Names ────────────────────────────────────────

const BODY_PARTS = ['head', 'body', 'left_arm', 'right_arm', 'left_leg', 'right_leg', 'face_base'] as const;

// ─── Character Manager ──────────────────────────────────────

const CharacterManager: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStyle, setNewStyle] = useState('panda-default');

  const characters: CharacterAsset[] = state.project?.characters ?? [];
  const selected = characters.find((c) => c.id === selectedId);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    const char: CharacterAsset = {
      id: genCharId(),
      name: newName.trim(),
      style: newStyle,
      parts: {},
      expressions: {},
      skeletonType: 'humanoid',
      appearanceItems: [],
      appearancePresets: [],
      color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
    };
    dispatch({ type: 'ADD_CHARACTER', character: char });
    setNewName('');
    setShowAdd(false);
    setSelectedId(char.id);
  }, [newName, newStyle, dispatch]);

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CHARACTER', characterId: id });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, dispatch]);

  const handlePartUpload = useCallback((partName: string, dataUrl: string) => {
    if (!selected) return;
    const updated = { ...selected, parts: { ...selected.parts, [partName]: dataUrl } };
    dispatch({ type: 'UPDATE_CHARACTER', character: updated });
  }, [selected, dispatch]);

  const handlePartClear = useCallback((partName: string) => {
    if (!selected) return;
    const parts = { ...selected.parts };
    delete parts[partName];
    dispatch({ type: 'UPDATE_CHARACTER', character: { ...selected, parts } });
  }, [selected, dispatch]);

  const handleFieldChange = useCallback((field: keyof CharacterAsset, value: string) => {
    if (!selected) return;
    dispatch({ type: 'UPDATE_CHARACTER', character: { ...selected, [field]: value } });
  }, [selected, dispatch]);

  return (
    <div className="char-manager">
      {/* Left: Character List */}
      <div className="char-manager__list">
        <div className="char-manager__list-header">
          <h3>Characters ({characters.length})</h3>
          <button className="btn btn--primary btn--sm" onClick={() => setShowAdd(true)}>+ New</button>
        </div>

        {showAdd && (
          <div className="char-add-form">
            <input type="text" className="input-text" value={newName}
              onChange={(e) => setNewName(e.target.value)} placeholder="Name..."
              autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <select className="input-select" value={newStyle}
              onChange={(e) => setNewStyle(e.target.value)}>
              <option value="panda-default">Panda Default</option>
              <option value="custom">Custom</option>
            </select>
            <div className="char-add-form__btns">
              <button className="btn btn--primary btn--xs" onClick={handleAdd}>Add</button>
              <button className="btn btn--xs" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="char-manager__items">
          {characters.map((c) => (
            <div key={c.id}
              className={`char-list-item ${c.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(c.id)}>
              <div className="char-list-item__color" style={{ background: c.color || '#666' }} />
              <div className="char-list-item__info">
                <div className="char-list-item__name">{c.name}</div>
                <div className="char-list-item__meta">
                  {c.style} | {Object.keys(c.parts).length} parts | {Object.keys(c.expressions).length} expr
                </div>
              </div>
              <button className="btn btn--xs btn--danger"
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="char-manager__detail">
        {selected ? (
          <>
            <div className="char-detail-header">
              <div className="char-detail-header__color"
                style={{ background: selected.color || '#666' }} />
              <div>
                <input type="text" className="input-text char-detail-name"
                  value={selected.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)} />
                <div className="char-detail-meta">
                  ID: {selected.id} | Skeleton: {selected.skeletonType}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="char-detail-section">
              <h4>Description</h4>
              <textarea className="input-text char-detail-desc"
                value={selected.description || ''}
                onChange={(e) => handleFieldChange('description' as any, e.target.value)}
                placeholder="Character description..." rows={2} />
            </div>

            {/* Body Parts */}
            <div className="char-detail-section">
              <h4>Body Parts ({Object.keys(selected.parts).length})</h4>
              <div className="char-parts-grid">
                {BODY_PARTS.map((part) => (
                  <div key={part} className="char-part-item">
                    <ImageSlot label={part} src={selected.parts[part]}
                      onUpload={(url) => handlePartUpload(part, url)}
                      onClear={selected.parts[part] ? () => handlePartClear(part) : undefined} />
                    <span className="char-part-item__name">{part}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="char-detail-section">
              <h4>Quick Stats</h4>
              <div className="char-stats">
                <div className="char-stat">
                  <span className="char-stat__num">{Object.keys(selected.expressions).length}</span>
                  <span className="char-stat__label">Expressions</span>
                </div>
                <div className="char-stat">
                  <span className="char-stat__num">{selected.appearanceItems.length}</span>
                  <span className="char-stat__label">Appearance Items</span>
                </div>
                <div className="char-stat">
                  <span className="char-stat__num">{selected.appearancePresets.length}</span>
                  <span className="char-stat__label">Presets</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="char-detail-empty">
            Select a character to view details, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterManager;
