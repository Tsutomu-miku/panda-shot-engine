// ============================================================
// panda-shot-engine — Expression Manager Component
// Per-character expression sticker management (eyes, mouth,
// eyebrows, overlays)
// ============================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { CharacterAsset, ExpressionSet } from '../../../core/project/types';
import './ExpressionManager.css';

// ─── Image Upload Slot ──────────────────────────────────────

const StickerSlot: React.FC<{
  label: string;
  src?: string;
  onUpload: (dataUrl: string) => void;
  onClear?: () => void;
}> = ({ label, src, onUpload, onClear }) => {
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
    <div className="sticker-slot" onClick={() => ref.current?.click()}>
      {src ? (
        <>
          <img src={src} alt={label} className="sticker-slot__img" />
          {onClear && (
            <button className="sticker-slot__clear"
              onClick={(ev) => { ev.stopPropagation(); onClear(); }}>×</button>
          )}
        </>
      ) : (
        <div className="sticker-slot__empty">
          <span>+</span>
          <span>{label}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
};

// ─── Sticker Part Names ─────────────────────────────────────

const STICKER_PARTS = [
  { key: 'eyesImage', label: '👁 Eyes' },
  { key: 'mouthImage', label: '👄 Mouth' },
  { key: 'eyebrowImage', label: '🤨 Eyebrows' },
  { key: 'overlayImage', label: '✨ Overlay' },
] as const;

type StickerPartKey = (typeof STICKER_PARTS)[number]['key'];

// ─── Expression Manager ─────────────────────────────────────

const ExpressionManager: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedExpr, setSelectedExpr] = useState<string | null>(null);
  const [newExprName, setNewExprName] = useState('');
  const [showAddExpr, setShowAddExpr] = useState(false);

  const characters: CharacterAsset[] = state.project?.characters ?? [];
  const selectedChar = useMemo(
    () => characters.find((c) => c.id === selectedCharId) ?? characters[0] ?? null,
    [characters, selectedCharId],
  );

  const expressions = selectedChar ? Object.entries(selectedChar.expressions) : [];
  const activeExpr = selectedChar?.expressions[selectedExpr ?? ''];

  const handleAddExpression = useCallback(() => {
    if (!selectedChar || !newExprName.trim()) return;
    const expr: ExpressionSet = { name: newExprName.trim() };
    dispatch({
      type: 'SET_CHARACTER_EXPRESSION',
      characterId: selectedChar.id,
      expressionName: newExprName.trim(),
      expression: expr,
    });
    setSelectedExpr(newExprName.trim());
    setNewExprName('');
    setShowAddExpr(false);
  }, [selectedChar, newExprName, dispatch]);

  const handleDeleteExpression = useCallback((name: string) => {
    if (!selectedChar) return;
    dispatch({
      type: 'REMOVE_CHARACTER_EXPRESSION',
      characterId: selectedChar.id,
      expressionName: name,
    });
    if (selectedExpr === name) setSelectedExpr(null);
  }, [selectedChar, selectedExpr, dispatch]);

  const handleStickerUpload = useCallback((partKey: StickerPartKey, dataUrl: string) => {
    if (!selectedChar || !selectedExpr || !activeExpr) return;
    const updated: ExpressionSet = { ...activeExpr, [partKey]: dataUrl };
    dispatch({
      type: 'SET_CHARACTER_EXPRESSION',
      characterId: selectedChar.id,
      expressionName: selectedExpr,
      expression: updated,
    });
  }, [selectedChar, selectedExpr, activeExpr, dispatch]);

  const handleStickerClear = useCallback((partKey: StickerPartKey) => {
    if (!selectedChar || !selectedExpr || !activeExpr) return;
    const updated: ExpressionSet = { ...activeExpr, [partKey]: undefined };
    dispatch({
      type: 'SET_CHARACTER_EXPRESSION',
      characterId: selectedChar.id,
      expressionName: selectedExpr,
      expression: updated,
    });
  }, [selectedChar, selectedExpr, activeExpr, dispatch]);

  return (
    <div className="expr-manager">
      {/* Character selector */}
      <div className="expr-char-bar">
        <span className="expr-char-bar__label">Character:</span>
        {characters.map((c) => (
          <button key={c.id}
            className={`expr-char-chip ${c.id === selectedChar?.id ? 'active' : ''}`}
            style={{ '--c': c.color || '#666' } as React.CSSProperties}
            onClick={() => { setSelectedCharId(c.id); setSelectedExpr(null); }}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="expr-content">
        {/* Left: Expression list */}
        <div className="expr-list-panel">
          <div className="expr-list-header">
            <h3>Expressions ({expressions.length})</h3>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAddExpr(true)}>+ Add</button>
          </div>

          {showAddExpr && (
            <div className="expr-add-form">
              <input type="text" className="input-text" value={newExprName}
                onChange={(e) => setNewExprName(e.target.value)}
                placeholder="e.g. happy, angry..." autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAddExpression()} />
              <button className="btn btn--primary btn--xs" onClick={handleAddExpression}>Add</button>
              <button className="btn btn--xs" onClick={() => setShowAddExpr(false)}>Cancel</button>
            </div>
          )}

          <div className="expr-list-items">
            {expressions.map(([name, expr]) => (
              <div key={name}
                className={`expr-list-item ${name === selectedExpr ? 'selected' : ''}`}
                onClick={() => setSelectedExpr(name)}>
                <div className="expr-list-item__preview">
                  {expr.eyesImage ? (
                    <img src={expr.eyesImage} alt={name} />
                  ) : (
                    <span>😀</span>
                  )}
                </div>
                <div className="expr-list-item__info">
                  <div className="expr-list-item__name">{name}</div>
                  <div className="expr-list-item__parts">
                    {expr.eyesImage ? '👁' : ''}
                    {expr.mouthImage ? '👄' : ''}
                    {expr.eyebrowImage ? '🤨' : ''}
                    {expr.overlayImage ? '✨' : ''}
                    {!expr.eyesImage && !expr.mouthImage && !expr.eyebrowImage && !expr.overlayImage ? 'No stickers' : ''}
                  </div>
                </div>
                <button className="btn btn--xs btn--danger"
                  onClick={(e) => { e.stopPropagation(); handleDeleteExpression(name); }}>×</button>
              </div>
            ))}
            {expressions.length === 0 && (
              <div className="expr-empty">No expressions yet. Add one to get started.</div>
            )}
          </div>
        </div>

        {/* Right: Sticker editor */}
        <div className="expr-detail-panel">
          {selectedExpr && activeExpr ? (
            <>
              <h3 className="expr-detail-title">
                Expression: <strong>{selectedExpr}</strong>
              </h3>
              <p className="expr-detail-hint">
                Upload sticker images for each facial part. These images will be overlaid on the character's face_base.
              </p>

              <div className="sticker-grid">
                {STICKER_PARTS.map(({ key, label }) => (
                  <div key={key} className="sticker-group">
                    <div className="sticker-group__label">{label}</div>
                    <StickerSlot
                      label={label}
                      src={activeExpr[key]}
                      onUpload={(url) => handleStickerUpload(key, url)}
                      onClear={activeExpr[key] ? () => handleStickerClear(key) : undefined}
                    />
                  </div>
                ))}
              </div>

              {/* Composite Preview */}
              <div className="expr-composite-preview">
                <h4>Composite Preview</h4>
                <div className="expr-composite-canvas">
                  {selectedChar?.parts['face_base'] && (
                    <img src={selectedChar.parts['face_base']} alt="face_base" className="expr-composite-layer" />
                  )}
                  {activeExpr.eyebrowImage && (
                    <img src={activeExpr.eyebrowImage} alt="eyebrows" className="expr-composite-layer" style={{ zIndex: 2 }} />
                  )}
                  {activeExpr.eyesImage && (
                    <img src={activeExpr.eyesImage} alt="eyes" className="expr-composite-layer" style={{ zIndex: 3 }} />
                  )}
                  {activeExpr.mouthImage && (
                    <img src={activeExpr.mouthImage} alt="mouth" className="expr-composite-layer" style={{ zIndex: 4 }} />
                  )}
                  {activeExpr.overlayImage && (
                    <img src={activeExpr.overlayImage} alt="overlay" className="expr-composite-layer" style={{ zIndex: 5 }} />
                  )}
                  {!selectedChar?.parts['face_base'] && !activeExpr.eyesImage && (
                    <div className="expr-composite-empty">Upload stickers above to preview</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="expr-detail-empty">
              Select an expression from the list to edit its sticker images.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpressionManager;
