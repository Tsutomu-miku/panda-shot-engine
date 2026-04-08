import React, { useState, useCallback } from 'react';
import {
  useEditor,
  MOCK_CHARACTERS,
  MOCK_SCENES,
  MOCK_PROPS,
  Character,
  Scene,
  Prop,
} from '../../hooks/useEditorState';

/* ================================================================
   Collapsible Section
   ================================================================ */
interface SectionProps {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const AssetSection: React.FC<SectionProps> = ({ icon, title, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="asset-section">
      <div className="asset-section__header" onClick={() => setOpen(!open)}>
        <span className="asset-section__title">
          <span>{icon}</span>
          <span>{title}</span>
        </span>
        <span className={`asset-section__toggle ${open ? '' : 'collapsed'}`}>▼</span>
      </div>
      <div className={`asset-section__body ${open ? '' : 'collapsed'}`}>{children}</div>
    </div>
  );
};

/* ================================================================
   Individual Asset Item
   ================================================================ */
interface AssetItemProps {
  id: string;
  name: string;
  color: string;
  type: string;
  selected?: boolean;
  onClick?: () => void;
}

const AssetItem: React.FC<AssetItemProps> = ({ id, name, color, type, selected, onClick }) => {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/panda-asset', JSON.stringify({ id, name, type }));
      e.dataTransfer.effectAllowed = 'copy';
    },
    [id, name, type]
  );

  return (
    <div
      className={`asset-item ${selected ? 'selected' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
    >
      <div className="asset-item__thumb" style={{ backgroundColor: color }}>
        {type === 'character' ? '👤' : type === 'scene' ? '🏠' : '📦'}
      </div>
      <div className="asset-item__info">
        <div className="asset-item__name">{name}</div>
        <div className="asset-item__type">{id}</div>
      </div>
      <span className="asset-item__drag-handle">⠿</span>
    </div>
  );
};

/* ================================================================
   Asset Panel
   ================================================================ */
const AssetPanel: React.FC = () => {
  const { state, dispatch } = useEditor();

  const handleSelectCharacter = useCallback(
    (id: string) => {
      dispatch({
        type: 'SELECT_CHARACTER',
        id: state.selectedCharacterId === id ? null : id,
      });
    },
    [state.selectedCharacterId, dispatch]
  );

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <span className="panel-header__title">Assets</span>
      </div>

      <div className="panel-body">
        {/* Characters */}
        <AssetSection icon="🎭" title="Characters">
          {MOCK_CHARACTERS.map((c) => (
            <AssetItem
              key={c.id}
              id={c.id}
              name={c.name}
              color={c.color}
              type="character"
              selected={state.selectedCharacterId === c.id}
              onClick={() => handleSelectCharacter(c.id)}
            />
          ))}
        </AssetSection>

        {/* Scenes */}
        <AssetSection icon="🏠" title="Scenes">
          {MOCK_SCENES.map((s) => (
            <AssetItem key={s.id} id={s.id} name={s.name} color={s.color} type="scene" />
          ))}
        </AssetSection>

        {/* Props */}
        <AssetSection icon="📦" title="Props">
          {MOCK_PROPS.map((p) => (
            <AssetItem key={p.id} id={p.id} name={p.name} color={p.color} type="prop" />
          ))}
        </AssetSection>
      </div>

      <div className="asset-panel__footer">
        <button className="btn w-full">+ Add Asset</button>
      </div>
    </div>
  );
};

export default AssetPanel;
