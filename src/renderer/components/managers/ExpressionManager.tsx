import React, { useState, useCallback, useMemo } from 'react';
import { useEditor, DemoCharacter } from '../../hooks/useEditorState';
import './ExpressionManager.css';

const EXPRESSION_FACES: Record<string, string> = {
  neutral: '😐', happy: '😊', angry: '😠', shocked: '😲', smirk: '😏', crying: '😢',
  confused: '😕', determined: '😤', scared: '😨', disgusted: '🤢', sleepy: '😴',
  excited: '🤩', embarrassed: '😳', proud: '😎', sad: '😞', thinking: '🤔',
};

const ALL_EXPRESSIONS = Object.keys(EXPRESSION_FACES);

export default function ExpressionManager() {
  const { state, dispatch } = useEditor();
  const characters = state.project?.characters ?? [];
  const [selectedCharId, setSelectedCharId] = useState<string>(characters[0]?.id ?? '');

  const selectedChar = useMemo(
    () => characters.find((c) => c.id === selectedCharId),
    [characters, selectedCharId],
  );

  const referencedExprs = useMemo(() => {
    const exprs = new Set<string>();
    if (!selectedChar) return exprs;
    const regex = new RegExp(`${selectedChar.id}\\s+expression\\s+(\\w+)`, 'g');
    let m: RegExpExecArray | null;
    while ((m = regex.exec(state.dslText)) !== null) exprs.add(m[1]);
    return exprs;
  }, [state.dslText, selectedChar]);

  const handleAdd = useCallback((expr: string) => {
    if (!selectedChar) return;
    dispatch({ type: 'ADD_CHARACTER_EXPRESSION', characterId: selectedChar.id, expression: expr });
  }, [dispatch, selectedChar]);

  const handleRemove = useCallback((expr: string) => {
    if (!selectedChar) return;
    if (referencedExprs.has(expr)) {
      alert(`Cannot remove: "${expr}" is referenced in DSL`);
      return;
    }
    if (selectedChar.expressions.length <= 1) {
      alert('Character must have at least one expression');
      return;
    }
    dispatch({ type: 'REMOVE_CHARACTER_EXPRESSION', characterId: selectedChar.id, expression: expr });
  }, [dispatch, selectedChar, referencedExprs]);

  return (
    <div className="expression-manager">
      <div className="manager-header">
        <span className="manager-header__title">
          Expressions{selectedChar ? ` — ${selectedChar.name}` : ''}
        </span>
      </div>

      {/* Character selector */}
      <div className="expr-char-select">
        {characters.map((char) => (
          <button
            key={char.id}
            className={`expr-char-chip ${selectedCharId === char.id ? 'active' : ''}`}
            onClick={() => setSelectedCharId(char.id)}
          >
            <span className="expr-char-chip__dot" style={{ backgroundColor: char.color }} />
            {char.name} ({char.expressions.length})
          </button>
        ))}
      </div>

      {/* Referenced expressions info */}
      {referencedExprs.size > 0 && (
        <div className="expr-referenced">
          DSL references: <strong>{[...referencedExprs].join(', ')}</strong>
        </div>
      )}

      {/* Expression grid */}
      {selectedChar ? (
        <div className="expr-grid">
          {/* Active expressions */}
          {selectedChar.expressions.map((expr) => (
            <div key={expr} className="expr-card active">
              <div className="expr-card__face">{EXPRESSION_FACES[expr] ?? '🎭'}</div>
              <div className="expr-card__name">{expr}</div>
              {!referencedExprs.has(expr) && selectedChar.expressions.length > 1 && (
                <button className="expr-card__remove" onClick={(e) => { e.stopPropagation(); handleRemove(expr); }}>×</button>
              )}
            </div>
          ))}
          {/* Available (not yet added) */}
          {ALL_EXPRESSIONS.filter((e) => !selectedChar.expressions.includes(e)).map((expr) => (
            <div key={expr} className="expr-card available" onClick={() => handleAdd(expr)}>
              <div className="expr-card__face">{EXPRESSION_FACES[expr] ?? '🎭'}</div>
              <div className="expr-card__name">{expr}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="manager-empty">
          <div className="manager-empty__icon">E</div>
          <div className="manager-empty__text">Select a character to manage expressions</div>
        </div>
      )}
    </div>
  );
}
