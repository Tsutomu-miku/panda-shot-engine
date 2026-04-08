import React, { useCallback, useMemo } from 'react';
import { useEditor, Character, MOCK_SCENES } from '../../hooks/useEditorState';

/* ================================================================
   Expression & Action Options
   ================================================================ */

const EXPRESSIONS = ['neutral', 'happy', 'angry', 'shocked', 'smirk', 'crying'];
const ACTIONS = ['none', 'idle', 'walk', 'run', 'nod', 'wave', 'punch', 'sword_slash'];
const TRANSITIONS = ['cut', 'dissolve', 'fade', 'wipe', 'iris'];

/* ================================================================
   Character Properties Sub-panel
   ================================================================ */

interface CharacterPropsProps {
  character: Character;
}

const CharacterProps: React.FC<CharacterPropsProps> = ({ character }) => {
  const { dispatch } = useEditor();

  const update = useCallback(
    (changes: Partial<Character>) => {
      dispatch({ type: 'UPDATE_CHARACTER', id: character.id, changes });
    },
    [dispatch, character.id]
  );

  return (
    <>
      <div className="prop-group">
        <div className="prop-group__title">Character: {character.name}</div>

        {/* Position X */}
        <div className="prop-row">
          <span className="prop-row__label">Position X</span>
          <div className="prop-row__value">
            <input
              type="number"
              className="input-number"
              value={Math.round((character.position?.x ?? 0.5) * 1000) / 1000}
              step={0.01}
              min={0}
              max={1}
              onChange={(e) =>
                update({ position: { x: parseFloat(e.target.value) || 0, y: character.position?.y ?? 0.5 } })
              }
            />
          </div>
        </div>

        {/* Position Y */}
        <div className="prop-row">
          <span className="prop-row__label">Position Y</span>
          <div className="prop-row__value">
            <input
              type="number"
              className="input-number"
              value={Math.round((character.position?.y ?? 0.5) * 1000) / 1000}
              step={0.01}
              min={0}
              max={1}
              onChange={(e) =>
                update({ position: { x: character.position?.x ?? 0.5, y: parseFloat(e.target.value) || 0 } })
              }
            />
          </div>
        </div>

        {/* Scale */}
        <div className="prop-row">
          <span className="prop-row__label">Scale</span>
          <div className="prop-row__value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range"
              className="input-range"
              value={character.scale ?? 1}
              step={0.05}
              min={0.5}
              max={2.0}
              onChange={(e) => update({ scale: parseFloat(e.target.value) })}
            />
            <span className="text-mono" style={{ fontSize: 11, minWidth: 36, textAlign: 'right' }}>
              {(character.scale ?? 1).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Facing */}
        <div className="prop-row">
          <span className="prop-row__label">Facing</span>
          <div className="prop-row__value">
            <div className="toggle-group">
              <button
                className={`toggle-group__btn ${character.facing === 'left' ? 'active' : ''}`}
                onClick={() => update({ facing: 'left' })}
              >
                \u2190 Left
              </button>
              <button
                className={`toggle-group__btn ${character.facing === 'right' ? 'active' : ''}`}
                onClick={() => update({ facing: 'right' })}
              >
                Right \u2192
              </button>
            </div>
          </div>
        </div>

        {/* Expression */}
        <div className="prop-row">
          <span className="prop-row__label">Expression</span>
          <div className="prop-row__value">
            <select
              className="input-select"
              value={character.expression ?? 'neutral'}
              onChange={(e) => update({ expression: e.target.value })}
            >
              {EXPRESSIONS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action */}
        <div className="prop-row">
          <span className="prop-row__label">Action</span>
          <div className="prop-row__value">
            <select
              className="input-select"
              value={character.action ?? 'none'}
              onChange={(e) => update({ action: e.target.value })}
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

/* ================================================================
   Shot Properties Sub-panel
   ================================================================ */

const ShotProps: React.FC = () => {
  const { dispatch, currentShot } = useEditor();

  if (!currentShot) {
    return (
      <div className="prop-group">
        <div className="prop-group__title">No shot selected</div>
      </div>
    );
  }

  const updateShot = (changes: Partial<typeof currentShot>) => {
    dispatch({ type: 'UPDATE_SHOT', changes });
  };

  return (
    <div className="prop-group">
      <div className="prop-group__title">Shot Properties</div>

      {/* Duration */}
      <div className="prop-row">
        <span className="prop-row__label">Duration</span>
        <div className="prop-row__value">
          <input
            type="number"
            className="input-number"
            value={currentShot.duration}
            step={0.5}
            min={0.5}
            max={120}
            onChange={(e) => updateShot({ duration: parseFloat(e.target.value) || 1 })}
          />
        </div>
      </div>

      {/* Scene */}
      <div className="prop-row">
        <span className="prop-row__label">Scene</span>
        <div className="prop-row__value">
          <select
            className="input-select"
            value={currentShot.scene}
            onChange={(e) => updateShot({ scene: e.target.value })}
          >
            {MOCK_SCENES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transition */}
      <div className="prop-row">
        <span className="prop-row__label">Transition</span>
        <div className="prop-row__value">
          <select
            className="input-select"
            value={currentShot.transition}
            onChange={(e) => updateShot({ transition: e.target.value })}
          >
            {TRANSITIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   Properties Panel
   ================================================================ */

const PropertiesPanel: React.FC = () => {
  const { state, currentShot } = useEditor();
  const selectedId = state.selectedCharacterId;

  const selectedCharacter = useMemo(() => {
    if (!selectedId || !currentShot) return null;
    return currentShot.characters.find((c) => c.id === selectedId) ?? null;
  }, [selectedId, currentShot]);

  return (
    <div className="panel properties-panel">
      <div className="panel-header">
        <span className="panel-header__title">Properties</span>
      </div>
      <div className="panel-body">
        {selectedCharacter ? (
          <CharacterProps character={selectedCharacter} />
        ) : (
          <ShotProps />
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
