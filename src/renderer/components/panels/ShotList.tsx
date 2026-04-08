import React, { useCallback } from 'react';
import { useEditor } from '../../hooks/useEditorState';

const ShotList: React.FC = () => {
  const { state, dispatch } = useEditor();
  const shots = state.currentProject?.shots ?? [];

  const handleSelect = useCallback(
    (index: number) => {
      dispatch({ type: 'SET_SHOT', index });
    },
    [dispatch]
  );

  const truncate = (s: string, len: number) =>
    s.length > len ? s.slice(0, len) + '...' : s;

  return (
    <div className="panel shot-list">
      <div className="panel-header">
        <span className="panel-header__title">Shots</span>
        <button className="btn btn--small">+</button>
      </div>

      <div className="panel-body">
        {shots.map((shot, idx) => (
          <div
            key={shot.id}
            className={`shot-item ${idx === state.currentShotIndex ? 'active' : ''}`}
            onClick={() => handleSelect(idx)}
            draggable
          >
            <span className="shot-item__drag">⠿</span>
            <span className="shot-item__number">{String(idx + 1).padStart(2, '0')}</span>
            <span className="shot-item__id">{truncate(shot.id, 20)}</span>
            <span className="shot-item__duration">{shot.duration}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShotList;
