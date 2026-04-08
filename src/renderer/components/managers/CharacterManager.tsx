import React, { useState, useCallback, useMemo } from 'react';
import { useEditor, DemoCharacter } from '../../hooks/useEditorState';
import './CharacterManager.css';

interface EditingCharacter {
  id: string | null; // null = creating new
  name: string;
  color: string;
  skeletonType: 'humanoid' | 'beast' | 'chibi';
  description: string;
  expressions: string[];
}

const SKELETON_TYPES: Array<{ value: 'humanoid' | 'beast' | 'chibi'; label: string }> = [
  { value: 'humanoid', label: 'Humanoid (人形)' },
  { value: 'beast', label: 'Beast (兽型)' },
  { value: 'chibi', label: 'Chibi (Q版)' },
];

const ALL_EXPRESSIONS = [
  'neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying',
  'confused', 'determined', 'scared', 'disgusted', 'sleepy',
  'excited', 'embarrassed', 'proud', 'sad', 'thinking',
];

export default function CharacterManager() {
  const { state, dispatch } = useEditor();
  const characters = state.project?.characters ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingCharacter | null>(null);
  const [search, setSearch] = useState('');

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    const text = state.dslText;
    const placeRegex = /place\s+(\w+)/g;
    const enterRegex = /(\w+)\s+enter-from/g;
    let m: RegExpExecArray | null;
    while ((m = placeRegex.exec(text)) !== null) ids.add(m[1]);
    while ((m = enterRegex.exec(text)) !== null) ids.add(m[1]);
    return ids;
  }, [state.dslText]);

  const filtered = useMemo(() => {
    if (!search) return characters;
    const q = search.toLowerCase();
    return characters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    );
  }, [characters, search]);

  const startCreate = useCallback(() => {
    setEditing({
      id: null,
      name: '',
      color: '#7c3aed',
      skeletonType: 'humanoid',
      description: '',
      expressions: ['neutral', 'happy', 'angry', 'shocked'],
    });
  }, []);

  const startEdit = useCallback((char: DemoCharacter) => {
    setEditing({
      id: char.id,
      name: char.name,
      color: char.color,
      skeletonType: char.skeletonType,
      description: char.description,
      expressions: [...char.expressions],
    });
    setSelectedId(char.id);
  }, []);

  const handleSave = useCallback(() => {
    if (!editing) return;
    if (!editing.name.trim()) return;

    if (editing.id === null) {
      dispatch({ type: 'ADD_CHARACTER', character: {
        id: editing.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36),
        name: editing.name.trim(),
        color: editing.color,
        skeletonType: editing.skeletonType,
        description: editing.description,
        expressions: editing.expressions.length > 0 ? editing.expressions : ['neutral'],
      }});
    } else {
      dispatch({ type: 'UPDATE_CHARACTER', characterId: editing.id, updates: {
        name: editing.name.trim(),
        color: editing.color,
        skeletonType: editing.skeletonType,
        description: editing.description,
        expressions: editing.expressions.length > 0 ? editing.expressions : ['neutral'],
      }});
    }
    setEditing(null);
  }, [editing, dispatch]);

  const handleDelete = useCallback((charId: string) => {
    if (referencedIds.has(charId)) {
      alert('Cannot delete: this character is referenced in DSL');
      return;
    }
    dispatch({ type: 'REMOVE_CHARACTER', characterId: charId });
    if (selectedId === charId) setSelectedId(null);
    if (editing?.id === charId) setEditing(null);
  }, [dispatch, selectedId, editing, referencedIds]);

  const handleDuplicate = useCallback((charId: string) => {
    dispatch({ type: 'DUPLICATE_CHARACTER', characterId: charId });
  }, [dispatch]);

  const toggleExpression = useCallback((expr: string) => {
    if (!editing) return;
    setEditing((prev) => {
      if (!prev) return prev;
      const has = prev.expressions.includes(expr);
      return {
        ...prev,
        expressions: has
          ? prev.expressions.filter((e) => e !== expr)
          : [...prev.expressions, expr],
      };
    });
  }, [editing]);

  return (
    <div className="character-manager">
      <div className="manager-header">
        <span className="manager-header__title">Characters ({characters.length})</span>
        <div className="manager-header__actions">
          <button className="manager-btn manager-btn--primary" onClick={startCreate}>
            + New
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 8px 0' }}>
        <input
          className="manager-form__input"
          placeholder="Search characters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="manager-list">
        {filtered.length === 0 && (
          <div className="manager-empty">
            <div className="manager-empty__icon">P</div>
            <div className="manager-empty__text">
              {search ? 'No matching characters' : 'No characters yet'}
            </div>
          </div>
        )}
        {filtered.map((char) => (
          <div
            key={char.id}
            className={`manager-card ${selectedId === char.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(selectedId === char.id ? null : char.id)}
          >
            <div className="manager-card__avatar" style={{ backgroundColor: char.color }}>
              {char.name[0]}
            </div>
            <div className="manager-card__info">
              <div className="manager-card__name">
                {char.name}
                {referencedIds.has(char.id) && <span className="ref-badge">IN USE</span>}
              </div>
              <div className="manager-card__meta">
                {char.id} | {char.skeletonType} | {char.expressions.length} expressions
              </div>
            </div>
            <div className="manager-card__actions">
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); startEdit(char); }} title="Edit">E</button>
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); handleDuplicate(char.id); }} title="Duplicate">D</button>
              <button className="manager-card__btn manager-card__btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(char.id); }} title="Delete">X</button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="manager-form">
          <div className="manager-form__title">
            {editing.id === null ? 'Create Character' : 'Edit Character'}
          </div>

          <div className="manager-form__group">
            <label className="manager-form__label">Name</label>
            <input
              className="manager-form__input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Character name..."
            />
          </div>

          <div className="manager-form__group">
            <label className="manager-form__label">Color</label>
            <div className="manager-form__color-row">
              <input
                type="color"
                className="manager-form__color-input"
                value={editing.color}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
              />
              <input
                className="manager-form__input"
                value={editing.color}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          <div className="manager-form__group">
            <label className="manager-form__label">Skeleton Type</label>
            <select
              className="manager-form__select"
              value={editing.skeletonType}
              onChange={(e) => setEditing({ ...editing, skeletonType: e.target.value as 'humanoid' | 'beast' | 'chibi' })}
            >
              {SKELETON_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="manager-form__group">
            <label className="manager-form__label">Description</label>
            <textarea
              className="manager-form__textarea"
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Character description..."
            />
          </div>

          <div className="manager-form__group">
            <label className="manager-form__label">Expressions</label>
            <div className="expression-tags">
              {ALL_EXPRESSIONS.map((expr) => {
                const active = editing.expressions.includes(expr);
                return (
                  <span
                    key={expr}
                    className="expression-tag"
                    style={{
                      background: active ? '#7c3aed40' : '#313244',
                      color: active ? '#b4befe' : '#6c7086',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpression(expr)}
                  >
                    {active ? '✓ ' : ''}{expr}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="manager-form__actions">
            <button className="manager-btn manager-btn--primary" onClick={handleSave}>
              {editing.id === null ? 'Create' : 'Save'}
            </button>
            <button className="manager-btn manager-btn--ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
