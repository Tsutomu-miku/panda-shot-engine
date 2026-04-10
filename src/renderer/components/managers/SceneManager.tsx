// ============================================================
// panda-shot-engine — Scene Manager Component
// CRUD for scene backgrounds with image upload
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import type { SceneAsset } from '../../../core/project/types';
import './SceneManager.css';

let _sid = 0;
function genSceneId(): string {
  return `scene_${Date.now().toString(36)}_${(++_sid).toString(36)}`;
}

type EditableSceneField = 'name' | 'filePath' | 'thumbnail' | 'backgroundColor' | 'description';

const SceneManager: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBg, setNewBg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const scenes: SceneAsset[] = state.project?.scenes ?? [];
  const selected = scenes.find((s) => s.id === selectedId);

  const handleFileUpload = useCallback((callback: (dataUrl: string) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === 'string') callback(reader.result); };
      reader.readAsDataURL(file);
      e.target.value = '';
    };
  }, []);

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    const scene: SceneAsset = {
      id: genSceneId(),
      name: newName.trim(),
      filePath: newBg,
      backgroundColor: '#1e1e2e',
    };
    dispatch({ type: 'ADD_SCENE', scene });
    setNewName('');
    setNewBg('');
    setShowAdd(false);
    setSelectedId(scene.id);
  }, [newName, newBg, dispatch]);

  const handleDelete = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SCENE', sceneId: id });
    if (selectedId === id) setSelectedId(null);
  }, [selectedId, dispatch]);

  const handleUpdateField = useCallback((field: EditableSceneField, value: string) => {
    if (!selected) return;
    dispatch({ type: 'UPDATE_SCENE', scene: { ...selected, [field]: value } });
  }, [selected, dispatch]);

  const handleUpdateImage = useCallback((dataUrl: string) => {
    if (!selected) return;
    dispatch({ type: 'UPDATE_SCENE', scene: { ...selected, filePath: dataUrl } });
  }, [selected, dispatch]);

  return (
    <div className="scene-manager">
      {/* Left: Scene list */}
      <div className="scene-manager__list">
        <div className="scene-list-header">
          <h3>Scenes ({scenes.length})</h3>
          <button className="btn btn--primary btn--sm" onClick={() => setShowAdd(true)}>+ New</button>
        </div>

        {showAdd && (
          <div className="scene-add-form">
            <input type="text" className="input-text" value={newName}
              onChange={(e) => setNewName(e.target.value)} placeholder="Scene name..."
              autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
            <div className="scene-add-form__btns">
              <button className="btn btn--primary btn--xs" onClick={handleAdd}>Add</button>
              <button className="btn btn--xs" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="scene-list-items">
          {scenes.map((s) => (
            <div key={s.id}
              className={`scene-list-item ${s.id === selectedId ? 'selected' : ''}`}
              onClick={() => setSelectedId(s.id)}>
              <div className="scene-list-item__thumb">
                {s.filePath ? (
                  <img src={s.filePath} alt={s.name} />
                ) : (
                  <div className="scene-list-item__color"
                    style={{ background: s.backgroundColor || '#1e1e2e' }} />
                )}
              </div>
              <div className="scene-list-item__info">
                <div className="scene-list-item__name">{s.name}</div>
                <div className="scene-list-item__id">{s.id}</div>
              </div>
              <button className="btn btn--xs btn--danger"
                onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="scene-manager__detail">
        {selected ? (
          <>
            <div className="scene-detail-header">
              <input type="text" className="input-text scene-detail-name"
                value={selected.name}
                onChange={(e) => handleUpdateField('name', e.target.value)} />
              <span className="scene-detail-id">ID: {selected.id}</span>
            </div>

            {/* Background Image */}
            <div className="scene-detail-section">
              <h4>Background Image</h4>
              <div className="scene-bg-upload"
                onClick={() => fileRef.current?.click()}>
                {selected.filePath ? (
                  <img src={selected.filePath} alt={selected.name} className="scene-bg-upload__img" />
                ) : (
                  <div className="scene-bg-upload__empty">
                    <span>+</span>
                    <span>Click to upload background image</span>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={handleFileUpload(handleUpdateImage)} />
            </div>

            {/* Background Color */}
            <div className="scene-detail-section">
              <h4>Fallback Background Color</h4>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={selected.backgroundColor || '#1e1e2e'}
                  onChange={(e) => handleUpdateField('backgroundColor', e.target.value)} />
                <input type="text" className="input-text" value={selected.backgroundColor || ''}
                  onChange={(e) => handleUpdateField('backgroundColor', e.target.value)}
                  placeholder="#1e1e2e" style={{ flex: 1, maxWidth: 150 }} />
              </div>
            </div>

            {/* Description */}
            <div className="scene-detail-section">
              <h4>Description</h4>
              <textarea className="input-text scene-detail-desc"
                value={selected.description || ''}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                placeholder="Scene description..." rows={3} />
            </div>
          </>
        ) : (
          <div className="scene-detail-empty">
            Select a scene to edit, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneManager;
