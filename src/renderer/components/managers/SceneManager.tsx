import React, { useState, useCallback, useMemo } from 'react';
import { useEditor, DemoScene } from '../../hooks/useEditorState';
import './SceneManager.css';

interface EditingScene {
  id: string | null;
  name: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  description: string;
  floorY: number;
}

export default function SceneManager() {
  const { state, dispatch } = useEditor();
  const scenes = state.project?.scenes ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingScene | null>(null);
  const [search, setSearch] = useState('');

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    const regex = /set:\s*"([^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(state.dslText)) !== null) ids.add(m[1]);
    return ids;
  }, [state.dslText]);

  const filtered = useMemo(() => {
    if (!search) return scenes;
    const q = search.toLowerCase();
    return scenes.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [scenes, search]);

  const startCreate = useCallback(() => {
    setEditing({
      id: null, name: '', color: '#795548',
      gradientStart: '#3e2723', gradientEnd: '#1a0e0a',
      description: '', floorY: 0.78,
    });
  }, []);

  const startEdit = useCallback((scene: DemoScene) => {
    setEditing({
      id: scene.id, name: scene.name, color: scene.color,
      gradientStart: scene.gradientStart, gradientEnd: scene.gradientEnd,
      description: scene.description, floorY: scene.floorY,
    });
    setSelectedId(scene.id);
  }, []);

  const handleSave = useCallback(() => {
    if (!editing || !editing.name.trim()) return;
    if (editing.id === null) {
      dispatch({ type: 'ADD_SCENE', scene: {
        id: editing.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36),
        name: editing.name.trim(),
        color: editing.color,
        gradientStart: editing.gradientStart,
        gradientEnd: editing.gradientEnd,
        description: editing.description,
        floorY: editing.floorY,
      }});
    } else {
      dispatch({ type: 'UPDATE_SCENE', sceneId: editing.id, updates: {
        name: editing.name.trim(),
        color: editing.color,
        gradientStart: editing.gradientStart,
        gradientEnd: editing.gradientEnd,
        description: editing.description,
        floorY: editing.floorY,
      }});
    }
    setEditing(null);
  }, [editing, dispatch]);

  const handleDelete = useCallback((sceneId: string) => {
    if (referencedIds.has(sceneId)) {
      alert('Cannot delete: this scene is referenced in DSL');
      return;
    }
    dispatch({ type: 'REMOVE_SCENE', sceneId });
    if (selectedId === sceneId) setSelectedId(null);
    if (editing?.id === sceneId) setEditing(null);
  }, [dispatch, selectedId, editing, referencedIds]);

  const handleDuplicate = useCallback((sceneId: string) => {
    dispatch({ type: 'DUPLICATE_SCENE', sceneId });
  }, [dispatch]);

  return (
    <div className="scene-manager">
      <div className="manager-header">
        <span className="manager-header__title">Scenes ({scenes.length})</span>
        <div className="manager-header__actions">
          <button className="manager-btn manager-btn--primary" onClick={startCreate}>+ New</button>
        </div>
      </div>

      <div style={{ padding: '8px 8px 0' }}>
        <input className="manager-form__input" placeholder="Search scenes..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="manager-list">
        {filtered.length === 0 && (
          <div className="manager-empty">
            <div className="manager-empty__icon">S</div>
            <div className="manager-empty__text">{search ? 'No matching scenes' : 'No scenes yet'}</div>
          </div>
        )}
        {filtered.map((scene) => (
          <div key={scene.id} className={`manager-card ${selectedId === scene.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(selectedId === scene.id ? null : scene.id)}>
            <div className="scene-preview-thumb">
              <div className="scene-preview-thumb__gradient"
                style={{ background: `linear-gradient(to bottom, ${scene.gradientStart}, ${scene.gradientEnd})` }} />
              <div className="scene-preview-thumb__floor" style={{ backgroundColor: scene.color }} />
            </div>
            <div className="manager-card__info">
              <div className="manager-card__name">
                {scene.name}
                {referencedIds.has(scene.id) && <span className="ref-badge">IN USE</span>}
              </div>
              <div className="manager-card__meta">{scene.id} | floor: {(scene.floorY * 100).toFixed(0)}%</div>
            </div>
            <div className="manager-card__actions">
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); startEdit(scene); }}>E</button>
              <button className="manager-card__btn" onClick={(e) => { e.stopPropagation(); handleDuplicate(scene.id); }}>D</button>
              <button className="manager-card__btn manager-card__btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(scene.id); }}>X</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="manager-form">
          <div className="manager-form__title">{editing.id === null ? 'Create Scene' : 'Edit Scene'}</div>
          <div className="manager-form__group">
            <label className="manager-form__label">Name</label>
            <input className="manager-form__input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Color</label>
            <div className="manager-form__color-row">
              <input type="color" className="manager-form__color-input" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} />
              <input className="manager-form__input" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })} style={{ flex: 1 }} />
            </div>
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Gradient</label>
            <div className="gradient-preview">
              <input type="color" className="manager-form__color-input" value={editing.gradientStart} onChange={(e) => setEditing({ ...editing, gradientStart: e.target.value })} />
              <input type="color" className="manager-form__color-input" value={editing.gradientEnd} onChange={(e) => setEditing({ ...editing, gradientEnd: e.target.value })} />
              <div className="gradient-preview__swatch" style={{ background: `linear-gradient(to right, ${editing.gradientStart}, ${editing.gradientEnd})` }} />
            </div>
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Floor Y Position</label>
            <div className="floor-slider">
              <input type="range" min="0.5" max="0.95" step="0.01" value={editing.floorY} onChange={(e) => setEditing({ ...editing, floorY: parseFloat(e.target.value) })} />
              <span className="floor-slider__value">{(editing.floorY * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="manager-form__group">
            <label className="manager-form__label">Description</label>
            <textarea className="manager-form__textarea" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
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
