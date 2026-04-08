/**
 * Expression Manager — Image sticker-based expression management
 * 
 * Core concept: Expressions are facial sticker images that overlay on the character.
 * Each expression has slots for eyes, mouth, eyebrows, and full-face overlay.
 * Users upload images for each slot to create different expressions.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useEditor, CharacterAsset, ExpressionSet } from '../../hooks/useEditorState';
import { EXPRESSION_SLOTS } from '../../../core/project/types';
import './ExpressionManager.css';

/** Read a file as a data URL */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Sticker Slot Upload ────────────────────────────────

interface StickerSlotProps {
  label: string;
  imageUrl?: string;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

const StickerSlot: React.FC<StickerSlotProps> = ({ label, imageUrl, onUpload, onRemove }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onUpload(dataUrl);
    if (inputRef.current) inputRef.current.value = '';
  }, [onUpload]);

  return (
    <div className="sticker-slot">
      <div className="sticker-slot__preview">
        {imageUrl ? (
          <div className="sticker-slot__image-wrap">
            <img src={imageUrl} alt={label} />
            <div className="sticker-slot__actions">
              <button className="sticker-slot__btn" onClick={() => inputRef.current?.click()} title="Replace">↻</button>
              <button className="sticker-slot__btn sticker-slot__btn--danger" onClick={onRemove} title="Remove">✕</button>
            </div>
          </div>
        ) : (
          <button className="sticker-slot__upload" onClick={() => inputRef.current?.click()}>
            <span className="sticker-slot__plus">+</span>
          </button>
        )}
      </div>
      <span className="sticker-slot__label">{label}</span>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Expression Card ────────────────────────────────────

interface ExpressionCardProps {
  expression: ExpressionSet;
  charId: string;
  isSelected: boolean;
  isReferenced: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const ExpressionCard: React.FC<ExpressionCardProps> = ({
  expression, charId, isSelected, isReferenced, onSelect, onDelete, onDuplicate,
}) => {
  const filledSlots = EXPRESSION_SLOTS.filter((s) => (expression as any)[s.key]);

  return (
    <div className={`expr-card ${isSelected ? 'selected' : ''}`} onClick={onSelect}>
      <div className="expr-card__preview">
        {expression.thumbnail ? (
          <img src={expression.thumbnail} alt={expression.name} />
        ) : (
          <div className="expr-card__preview-grid">
            {EXPRESSION_SLOTS.slice(0, 4).map((slot) => {
              const img = (expression as any)[slot.key];
              return (
                <div key={slot.key} className="expr-card__mini-slot">
                  {img ? <img src={img} alt={slot.label} /> : <span>—</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="expr-card__info">
        <div className="expr-card__name">
          {expression.name}
          {isReferenced && <span className="ref-badge">IN USE</span>}
        </div>
        <div className="expr-card__meta">{filledSlots.length}/{EXPRESSION_SLOTS.length} stickers</div>
      </div>
      <div className="expr-card__actions">
        <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicate">⧉</button>
        <button className="manager-card__btn manager-card__btn--danger" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">✕</button>
      </div>
    </div>
  );
};

// ─── Main Expression Manager ────────────────────────────

export default function ExpressionManager() {
  const { state, dispatch } = useEditor();
  const characters = state.project.characters;
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id ?? '');
  const [selectedExprId, setSelectedExprId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newExprName, setNewExprName] = useState('');
  const [search, setSearch] = useState('');

  const selectedChar = characters.find((c) => c.id === selectedCharId);
  const expressions = selectedChar ? Object.values(selectedChar.expressions) : [];

  // Find expressions referenced in DSL
  const referencedExprs = useMemo(() => {
    const ids = new Set<string>();
    const regex = /expression\s+(\w+)/g;
    let m: RegExpExecArray | null;
    const allDsl = state.project.shots.map((s) => s.dsl).join('\n');
    while ((m = regex.exec(allDsl)) !== null) ids.add(m[1]);
    return ids;
  }, [state.project.shots]);

  const filtered = useMemo(() => {
    if (!search) return expressions;
    const q = search.toLowerCase();
    return expressions.filter((e) => e.name.toLowerCase().includes(q));
  }, [expressions, search]);

  const selectedExpr = selectedChar?.expressions[selectedExprId ?? ''];

  // ── Create Expression ──
  const handleCreate = useCallback(() => {
    if (!selectedCharId || !newExprName.trim()) return;
    const id = newExprName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
    const expr: ExpressionSet = { id, name: newExprName.trim() };
    dispatch({ type: 'ADD_EXPRESSION', charId: selectedCharId, expression: expr });
    setNewExprName('');
    setIsCreating(false);
    setSelectedExprId(id);
  }, [selectedCharId, newExprName, dispatch]);

  // ── Update Sticker Slot ──
  const handleSlotUpload = useCallback((slot: 'eyesImage' | 'mouthImage' | 'eyebrowImage' | 'overlayImage', dataUrl: string) => {
    if (!selectedCharId || !selectedExprId) return;
    dispatch({ type: 'UPDATE_EXPRESSION_SLOT', charId: selectedCharId, exprId: selectedExprId, slot, imageData: dataUrl });
  }, [selectedCharId, selectedExprId, dispatch]);

  const handleSlotRemove = useCallback((slot: 'eyesImage' | 'mouthImage' | 'eyebrowImage' | 'overlayImage') => {
    if (!selectedCharId || !selectedExprId) return;
    dispatch({ type: 'UPDATE_EXPRESSION_SLOT', charId: selectedCharId, exprId: selectedExprId, slot, imageData: null });
  }, [selectedCharId, selectedExprId, dispatch]);

  // ── Update Expression Thumbnail ──
  const handleThumbnailUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCharId || !selectedExprId) return;
    const dataUrl = await readFileAsDataUrl(file);
    dispatch({ type: 'UPDATE_EXPRESSION', charId: selectedCharId, exprId: selectedExprId, updates: { thumbnail: dataUrl } });
  }, [selectedCharId, selectedExprId, dispatch]);

  // ── Rename Expression ──
  const [renaming, setRenaming] = useState(false);
  const [renameTo, setRenameTo] = useState('');

  const handleRename = useCallback(() => {
    if (!selectedCharId || !selectedExprId || !renameTo.trim()) return;
    dispatch({ type: 'UPDATE_EXPRESSION', charId: selectedCharId, exprId: selectedExprId, updates: { name: renameTo.trim() } });
    setRenaming(false);
  }, [selectedCharId, selectedExprId, renameTo, dispatch]);

  return (
    <div className="expression-manager">
      <div className="manager-header">
        <span className="manager-header__title">Expressions</span>
        <div className="manager-header__actions">
          <button className="manager-btn manager-btn--primary" onClick={() => { setIsCreating(true); setNewExprName(''); }}>+ New</button>
        </div>
      </div>

      {/* Character Selector */}
      <div className="expr-char-selector">
        <label className="expr-char-selector__label">Character:</label>
        <div className="expr-char-chips">
          {characters.map((c) => (
            <button
              key={c.id}
              className={`expr-char-chip ${selectedCharId === c.id ? 'active' : ''}`}
              onClick={() => { setSelectedCharId(c.id); setSelectedExprId(null); }}
            >
              {c.thumbnail ? (
                <img src={c.thumbnail} alt={c.name} className="expr-char-chip__img" />
              ) : (
                <span className="expr-char-chip__letter">{c.name[0]}</span>
              )}
              <span>{c.name}</span>
              <span className="expr-char-chip__count">{Object.keys(c.expressions).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 8px' }}>
        <input className="manager-form__input" placeholder="Search expressions..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Expression List */}
      <div className="manager-list">
        {filtered.length === 0 && !isCreating && (
          <div className="manager-empty">
            <div className="manager-empty__icon">😶</div>
            <div className="manager-empty__text">
              {search ? 'No matching expressions' : selectedChar ? 'No expressions on this character' : 'Select a character first'}
            </div>
          </div>
        )}
        {filtered.map((expr) => (
          <ExpressionCard
            key={expr.id}
            expression={expr}
            charId={selectedCharId}
            isSelected={selectedExprId === expr.id}
            isReferenced={referencedExprs.has(expr.id) || referencedExprs.has(expr.name)}
            onSelect={() => setSelectedExprId(selectedExprId === expr.id ? null : expr.id)}
            onDelete={() => {
              dispatch({ type: 'REMOVE_EXPRESSION', charId: selectedCharId, exprId: expr.id });
              if (selectedExprId === expr.id) setSelectedExprId(null);
            }}
            onDuplicate={() => dispatch({ type: 'DUPLICATE_EXPRESSION', charId: selectedCharId, exprId: expr.id })}
          />
        ))}
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="expr-create-form">
          <div className="manager-form__title">New Expression</div>
          <div className="manager-form__group">
            <input
              className="manager-form__input"
              value={newExprName}
              onChange={(e) => setNewExprName(e.target.value)}
              placeholder="Expression name (e.g. happy, angry...)"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="manager-form__actions">
            <button className="manager-btn manager-btn--primary" onClick={handleCreate} disabled={!newExprName.trim()}>Create</button>
            <button className="manager-btn manager-btn--ghost" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Selected Expression Detail — Sticker Slots */}
      {selectedExpr && !isCreating && (
        <div className="expr-detail">
          <div className="expr-detail__header">
            {renaming ? (
              <div className="expr-detail__rename">
                <input className="manager-form__input" value={renameTo} onChange={(e) => setRenameTo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename()} autoFocus />
                <button className="manager-btn manager-btn--primary" onClick={handleRename}>Save</button>
                <button className="manager-btn manager-btn--ghost" onClick={() => setRenaming(false)}>Cancel</button>
              </div>
            ) : (
              <div className="expr-detail__title-row">
                <span className="expr-detail__title">{selectedExpr.name}</span>
                <button className="manager-card__btn" onClick={() => { setRenaming(true); setRenameTo(selectedExpr.name); }}>✎</button>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div className="expr-detail__section">
            <div className="expr-detail__section-title">Thumbnail Preview</div>
            <div className="expr-detail__thumbnail">
              {selectedExpr.thumbnail ? (
                <div className="expr-detail__thumb-preview">
                  <img src={selectedExpr.thumbnail} alt="thumbnail" />
                </div>
              ) : (
                <span className="expr-detail__thumb-empty">No thumbnail</span>
              )}
              <label className="manager-btn manager-btn--ghost">
                Upload Thumbnail
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumbnailUpload} />
              </label>
            </div>
          </div>

          {/* Sticker Slots */}
          <div className="expr-detail__section">
            <div className="expr-detail__section-title">Facial Sticker Slots</div>
            <p className="expr-detail__hint">Upload images for each facial part. These stickers will be overlaid on the character's face to create this expression.</p>
            <div className="sticker-slots-grid">
              {EXPRESSION_SLOTS.map((slot) => (
                <StickerSlot
                  key={slot.key}
                  label={slot.label}
                  imageUrl={(selectedExpr as any)[slot.key]}
                  onUpload={(url) => handleSlotUpload(slot.key as any, url)}
                  onRemove={() => handleSlotRemove(slot.key as any)}
                />
              ))}
            </div>
          </div>

          {/* Expression Preview */}
          <div className="expr-detail__section">
            <div className="expr-detail__section-title">Preview</div>
            <div className="expr-preview-canvas">
              {selectedChar?.parts.head && (
                <img src={selectedChar.parts.head} alt="head" className="expr-preview__base" />
              )}
              {selectedExpr.eyebrowImage && <img src={selectedExpr.eyebrowImage} alt="eyebrows" className="expr-preview__layer" />}
              {selectedExpr.eyesImage && <img src={selectedExpr.eyesImage} alt="eyes" className="expr-preview__layer" />}
              {selectedExpr.mouthImage && <img src={selectedExpr.mouthImage} alt="mouth" className="expr-preview__layer" />}
              {selectedExpr.overlayImage && <img src={selectedExpr.overlayImage} alt="overlay" className="expr-preview__layer" />}
              {!selectedChar?.parts.head && !selectedExpr.eyesImage && !selectedExpr.mouthImage && (
                <span className="expr-preview__empty">Upload stickers to preview</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
