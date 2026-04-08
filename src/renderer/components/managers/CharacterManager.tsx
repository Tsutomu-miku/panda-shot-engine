/**
 * Character Manager — Image-based character management UI
 * 
 * Supports:
 * - Image upload for body parts (head, body, arms, legs)
 * - Character thumbnail upload/preview
 * - Expression sticker management (delegated to ExpressionManager)
 * - CRUD operations with undo/redo
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useEditor, CharacterAsset } from '../../hooks/useEditorState';
import { STANDARD_PARTS, ExpressionSet } from '../../../core/project/types';
import './CharacterManager.css';

/** Read a file as a data URL */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Image Upload Slot ──────────────────────────────────

interface ImageSlotProps {
  label: string;
  imageUrl?: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
  size?: number;
}

const ImageSlot: React.FC<ImageSlotProps> = ({ label, imageUrl, onUpload, onRemove, size = 64 }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onUpload(dataUrl);
    if (inputRef.current) inputRef.current.value = '';
  }, [onUpload]);

  return (
    <div className="image-slot" style={{ width: size, height: size }}>
      {imageUrl ? (
        <div className="image-slot__preview">
          <img src={imageUrl} alt={label} />
          <div className="image-slot__overlay">
            <button className="image-slot__btn" onClick={() => inputRef.current?.click()} title="Replace">↻</button>
            <button className="image-slot__btn image-slot__btn--danger" onClick={onRemove} title="Remove">✕</button>
          </div>
        </div>
      ) : (
        <button className="image-slot__empty" onClick={() => inputRef.current?.click()}>
          <span className="image-slot__plus">+</span>
          <span className="image-slot__label">{label}</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Character Form ─────────────────────────────────────

interface CharacterFormProps {
  initial?: CharacterAsset;
  onSave: (data: {
    name: string;
    style: CharacterAsset['style'];
    skeletonType: string;
    description: string;
    parts: Record<string, string>;
    thumbnail?: string;
  }) => void;
  onCancel: () => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({ initial, onSave, onCancel }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [style, setStyle] = useState<CharacterAsset['style']>(initial?.style ?? 'humanoid');
  const [skeletonType, setSkeletonType] = useState(initial?.skeletonType ?? 'humanoid');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [parts, setParts] = useState<Record<string, string>>(initial?.parts ?? {});
  const [thumbnail, setThumbnail] = useState<string | undefined>(initial?.thumbnail);

  const handlePartUpload = useCallback((partKey: string, dataUrl: string) => {
    setParts((prev) => ({ ...prev, [partKey]: dataUrl }));
  }, []);

  const handlePartRemove = useCallback((partKey: string) => {
    setParts((prev) => {
      const next = { ...prev };
      delete next[partKey];
      return next;
    });
  }, []);

  const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setThumbnail(dataUrl);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), style, skeletonType, description, parts, thumbnail });
  }, [name, style, skeletonType, description, parts, thumbnail, onSave]);

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <div className="manager-form__title">{initial ? 'Edit Character' : 'Create Character'}</div>
      
      {/* Thumbnail */}
      <div className="manager-form__group">
        <label className="manager-form__label">Thumbnail</label>
        <div className="char-thumbnail-upload">
          {thumbnail ? (
            <div className="char-thumbnail-upload__preview">
              <img src={thumbnail} alt="thumbnail" />
              <button type="button" className="char-thumbnail-upload__remove" onClick={() => setThumbnail(undefined)}>✕</button>
            </div>
          ) : (
            <label className="char-thumbnail-upload__empty">
              <span>+ Upload</span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbnailUpload} />
            </label>
          )}
        </div>
      </div>

      {/* Basic Info */}
      <div className="manager-form__group">
        <label className="manager-form__label">Name</label>
        <input className="manager-form__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Character name..." autoFocus />
      </div>

      <div className="manager-form__row">
        <div className="manager-form__group" style={{ flex: 1 }}>
          <label className="manager-form__label">Style</label>
          <select className="manager-form__input" value={style} onChange={(e) => setStyle(e.target.value as CharacterAsset['style'])}>
            <option value="humanoid">Humanoid</option>
            <option value="beast">Beast</option>
            <option value="chibi">Chibi</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="manager-form__group" style={{ flex: 1 }}>
          <label className="manager-form__label">Skeleton</label>
          <select className="manager-form__input" value={skeletonType} onChange={(e) => setSkeletonType(e.target.value)}>
            <option value="humanoid">Humanoid</option>
            <option value="beast">Beast</option>
            <option value="chibi">Chibi</option>
          </select>
        </div>
      </div>

      <div className="manager-form__group">
        <label className="manager-form__label">Description</label>
        <textarea className="manager-form__textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Character description..." />
      </div>

      {/* Body Parts */}
      <div className="manager-form__group">
        <label className="manager-form__label">Body Parts (Upload images for each part)</label>
        <div className="char-parts-grid">
          {STANDARD_PARTS.map((part) => (
            <div key={part.key} className="char-part-item">
              <ImageSlot
                label={part.label}
                imageUrl={parts[part.key]}
                onUpload={(url) => handlePartUpload(part.key, url)}
                onRemove={() => handlePartRemove(part.key)}
              />
              <span className="char-part-item__label">{part.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="manager-form__actions">
        <button type="submit" className="manager-btn manager-btn--primary">{initial ? 'Save' : 'Create'}</button>
        <button type="button" className="manager-btn manager-btn--ghost" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};

// ─── Main Character Manager ─────────────────────────────

export default function CharacterManager() {
  const { state, dispatch } = useEditor();
  const characters = state.project.characters;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CharacterAsset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    const regex = /enter\s+(\w+)/g;
    let m: RegExpExecArray | null;
    const allDsl = state.project.shots.map((s) => s.dsl).join('\n');
    while ((m = regex.exec(allDsl)) !== null) ids.add(m[1]);
    return ids;
  }, [state.project.shots]);

  const filtered = useMemo(() => {
    if (!search) return characters;
    const q = search.toLowerCase();
    return characters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
    );
  }, [characters, search]);

  const handleCreate = useCallback((data: any) => {
    const id = data.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    const newChar: CharacterAsset = {
      id,
      name: data.name,
      style: data.style,
      parts: data.parts,
      expressions: {},
      skeletonType: data.skeletonType,
      thumbnail: data.thumbnail,
      description: data.description,
    };
    dispatch({ type: 'ADD_CHARACTER', character: newChar });
    setIsCreating(false);
  }, [dispatch]);

  const handleUpdate = useCallback((data: any) => {
    if (!editing) return;
    dispatch({ type: 'UPDATE_CHARACTER', charId: editing.id, updates: {
      name: data.name,
      style: data.style,
      skeletonType: data.skeletonType,
      description: data.description,
      thumbnail: data.thumbnail,
    }});
    // Update parts individually
    for (const [key, val] of Object.entries(data.parts as Record<string, string>)) {
      dispatch({ type: 'UPDATE_CHARACTER_PART', charId: editing.id, partKey: key, imageData: val });
    }
    setEditing(null);
  }, [editing, dispatch]);

  const handleDelete = useCallback((charId: string) => {
    if (referencedIds.has(charId)) {
      alert('Cannot delete: character is referenced in DSL shots');
      return;
    }
    dispatch({ type: 'REMOVE_CHARACTER', charId });
    if (selectedId === charId) setSelectedId(null);
    if (editing?.id === charId) setEditing(null);
  }, [dispatch, selectedId, editing, referencedIds]);

  const handleDuplicate = useCallback((charId: string) => {
    dispatch({ type: 'DUPLICATE_CHARACTER', charId });
  }, [dispatch]);

  const selectedChar = characters.find((c) => c.id === selectedId);
  const partsCount = (c: CharacterAsset) => Object.keys(c.parts).length;
  const exprCount = (c: CharacterAsset) => Object.keys(c.expressions).length;

  return (
    <div className="character-manager">
      <div className="manager-header">
        <span className="manager-header__title">Characters ({characters.length})</span>
        <div className="manager-header__actions">
          <button className="manager-btn manager-btn--primary" onClick={() => setIsCreating(true)}>+ New</button>
        </div>
      </div>

      <div style={{ padding: '8px 8px 0' }}>
        <input className="manager-form__input" placeholder="Search characters..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="manager-list">
        {filtered.length === 0 && (
          <div className="manager-empty">
            <div className="manager-empty__icon">👤</div>
            <div className="manager-empty__text">{search ? 'No matching characters' : 'No characters yet. Create one!'}</div>
          </div>
        )}
        {filtered.map((char) => (
          <div
            key={char.id}
            className={`manager-card ${selectedId === char.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(selectedId === char.id ? null : char.id)}
          >
            <div className="manager-card__avatar">
              {char.thumbnail ? (
                <img src={char.thumbnail} alt={char.name} className="manager-card__avatar-img" />
              ) : (
                <span className="manager-card__avatar-placeholder">{char.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="manager-card__info">
              <div className="manager-card__name">
                {char.name}
                {referencedIds.has(char.id) && <span className="ref-badge">IN USE</span>}
              </div>
              <div className="manager-card__meta">
                {char.style} | {partsCount(char)} parts | {exprCount(char)} expressions
              </div>
            </div>
            <div className="manager-card__actions">
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); setEditing(char); }} title="Edit">✎</button>
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); handleDuplicate(char.id); }} title="Duplicate">⧉</button>
              <button className="manager-card__btn manager-card__btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(char.id); }} title="Delete">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Character Detail */}
      {selectedChar && !editing && !isCreating && (
        <div className="char-detail">
          <div className="char-detail__header">
            {selectedChar.thumbnail && <img src={selectedChar.thumbnail} alt="" className="char-detail__thumb" />}
            <div>
              <div className="char-detail__name">{selectedChar.name}</div>
              <div className="char-detail__meta">{selectedChar.style} | {selectedChar.skeletonType}</div>
            </div>
          </div>
          {selectedChar.description && <p className="char-detail__desc">{selectedChar.description}</p>}
          <div className="char-detail__section">
            <div className="char-detail__section-title">Body Parts ({partsCount(selectedChar)})</div>
            <div className="char-parts-grid char-parts-grid--small">
              {STANDARD_PARTS.map((part) => (
                <div key={part.key} className="char-part-item">
                  <div className={`char-part-preview ${selectedChar.parts[part.key] ? '' : 'empty'}`}>
                    {selectedChar.parts[part.key] ? (
                      <img src={selectedChar.parts[part.key]} alt={part.label} />
                    ) : (
                      <span>—</span>
                    )}
                  </div>
                  <span className="char-part-item__label">{part.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="char-detail__section">
            <div className="char-detail__section-title">Expressions ({exprCount(selectedChar)})</div>
            <div className="char-expr-grid">
              {Object.values(selectedChar.expressions).map((expr) => (
                <div key={expr.id} className="char-expr-chip">
                  {expr.thumbnail ? (
                    <img src={expr.thumbnail} alt={expr.name} className="char-expr-chip__img" />
                  ) : (
                    <span className="char-expr-chip__placeholder">😶</span>
                  )}
                  <span className="char-expr-chip__name">{expr.name}</span>
                </div>
              ))}
              {exprCount(selectedChar) === 0 && <span className="char-detail__empty">No expressions yet</span>}
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <CharacterForm onSave={handleCreate} onCancel={() => setIsCreating(false)} />
      )}

      {/* Edit Form */}
      {editing && (
        <CharacterForm initial={editing} onSave={handleUpdate} onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}
