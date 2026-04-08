import React, { useState, useCallback, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import { ActionDefinition } from '../../../core/skeleton/types';
import { getActionIds, getAction } from '../../../core/skeleton/action-library';
import './ActionManager.css';

const EASING_OPTIONS = [
  'linear', 'ease-in', 'ease-out', 'ease-in-out',
  'bounce', 'elastic', 'overshoot',
];

interface EditingAction {
  id: string | null;
  name: string;
  duration: number;
  loop: boolean;
  easing: string;
  isBuiltIn: boolean;
}

export default function ActionManager() {
  const { state, dispatch } = useEditor();
  const customActions = state.project?.customActions ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingAction | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'builtin' | 'custom'>('all');

  const builtInActions: ActionDefinition[] = useMemo(() => {
    return getActionIds().map((id) => getAction(id)!);
  }, []);

  const allActions = useMemo(() => {
    return [...builtInActions, ...customActions];
  }, [builtInActions, customActions]);

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    const regex = /action\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(state.dslText)) !== null) ids.add(m[1]);
    return ids;
  }, [state.dslText]);

  const filtered = useMemo(() => {
    let list = allActions;
    if (filter === 'builtin') list = builtInActions;
    if (filter === 'custom') list = customActions;
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  }, [allActions, builtInActions, customActions, search, filter]);

  const isBuiltIn = useCallback((id: string) => getActionIds().includes(id), []);

  const startCreate = useCallback(() => {
    setEditing({ id: null, name: '', duration: 1.0, loop: false, easing: 'ease-in-out', isBuiltIn: false });
  }, []);

  const startEdit = useCallback((action: ActionDefinition) => {
    setEditing({
      id: action.id, name: action.name, duration: action.duration,
      loop: action.loop, easing: action.easing, isBuiltIn: isBuiltIn(action.id),
    });
    setSelectedId(action.id);
  }, [isBuiltIn]);

  const handleSave = useCallback(() => {
    if (!editing || !editing.name.trim()) return;
    if (editing.isBuiltIn) return; // cannot edit built-in
    if (editing.id === null) {
      dispatch({ type: 'ADD_CUSTOM_ACTION', action: {
        id: 'custom_' + editing.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36),
        name: editing.name.trim(), duration: editing.duration,
        loop: editing.loop, easing: editing.easing,
        keyframes: [{ time: 0, boneStates: {} }, { time: 1, boneStates: {} }],
      }});
    } else {
      dispatch({ type: 'UPDATE_CUSTOM_ACTION', actionId: editing.id, updates: {
        name: editing.name.trim(), duration: editing.duration,
        loop: editing.loop, easing: editing.easing,
      }});
    }
    setEditing(null);
  }, [editing, dispatch]);

  const handleDelete = useCallback((actionId: string) => {
    if (isBuiltIn(actionId)) { alert('Cannot delete built-in actions'); return; }
    if (referencedIds.has(actionId)) { alert('Cannot delete: action is referenced in DSL'); return; }
    dispatch({ type: 'REMOVE_CUSTOM_ACTION', actionId });
    if (selectedId === actionId) setSelectedId(null);
    if (editing?.id === actionId) setEditing(null);
  }, [dispatch, selectedId, editing, isBuiltIn, referencedIds]);

  const handleDuplicate = useCallback((actionId: string) => {
    dispatch({ type: 'DUPLICATE_CUSTOM_ACTION', actionId });
  }, [dispatch]);

  return (
    <div className="action-manager">
      <div className="manager-header">
        <span className="manager-header__title">Actions ({allActions.length})</span>
        <div className="manager-header__actions">
          <button className="manager-btn manager-btn--primary" onClick={startCreate}>+ New</button>
        </div>
      </div>

      <div style={{ padding: '8px 8px 0' }}>
        <input className="manager-form__input" placeholder="Search actions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['all', 'builtin', 'custom'] as const).map((f) => (
            <button key={f} className={`easing-option ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'builtin' ? 'Built-in' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      <div className="manager-list">
        {filtered.length === 0 && (
          <div className="manager-empty">
            <div className="manager-empty__icon">A</div>
            <div className="manager-empty__text">{search ? 'No matching actions' : 'No actions'}</div>
          </div>
        )}
        {filtered.map((action) => {
          const bi = isBuiltIn(action.id);
          return (
            <div key={action.id} className={`manager-card ${selectedId === action.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(selectedId === action.id ? null : action.id)}>
              <div className="manager-card__avatar" style={{ backgroundColor: bi ? '#313244' : '#7c3aed40', color: bi ? '#6c7086' : '#b4befe' }}>
                {action.loop ? '↻' : '→'}
              </div>
              <div className="manager-card__info">
                <div className="manager-card__name">
                  {action.name}
                  <span className={`action-badge ${bi ? 'action-badge--builtin' : 'action-badge--custom'}`}>
                    {bi ? 'BUILT-IN' : 'CUSTOM'}
                  </span>
                  {action.loop && <span className="action-badge action-badge--loop">LOOP</span>}
                  {referencedIds.has(action.id) && <span className="ref-badge">IN USE</span>}
                </div>
                <div className="manager-card__meta">
                  {action.duration}s | {action.keyframes.length} keyframes | {action.easing}
                </div>
              </div>
              <div className="manager-card__actions">
                {!bi && <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); startEdit(action); }}>E</button>}
                <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); handleDuplicate(action.id); }}>D</button>
                {!bi && <button className="manager-card__btn manager-card__btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(action.id); }}>X</button>}
              </div>
            </div>
          );
        })}
      </div>

      {editing && !editing.isBuiltIn && (
        <div className="manager-form">
          <div className="manager-form__title">{editing.id === null ? 'Create Action' : 'Edit Action'}</div>
          <div className="manager-form__group">
            <label className="manager-form__label">Name</label>
            <input className="manager-form__input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Duration (seconds)</label>
            <input className="manager-form__input" type="number" min="0.1" step="0.1" value={editing.duration}
              onChange={(e) => setEditing({ ...editing, duration: parseFloat(e.target.value) || 1 })} />
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Loop</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={editing.loop} onChange={(e) => setEditing({ ...editing, loop: e.target.checked })} />
              <span style={{ fontSize: 12, color: '#a6adc8' }}>Loop animation continuously</span>
            </label>
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Easing</label>
            <div className="easing-select">
              {EASING_OPTIONS.map((e) => (
                <button key={e} className={`easing-option ${editing.easing === e ? 'active' : ''}`}
                  onClick={() => setEditing({ ...editing, easing: e })}>{e}</button>
              ))}
            </div>
          </div>
          <div className="manager-form__actions">
            <button className="manager-btn manager-btn--primary" onClick={handleSave}>{editing.id === null ? 'Create' : 'Save'}</button>
            <button className="manager-btn manager-btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
