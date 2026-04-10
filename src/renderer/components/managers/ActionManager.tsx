// ============================================================
// panda-shot-engine — Action Manager Component
// Browse, filter, inspect actions with keyframe visualization
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { BUILTIN_ACTIONS, getActionsByCategory, searchActions } from '../../../core/skeleton/action-library';
import type { ActionDefinition, ActionKeyframe } from '../../../core/skeleton/types';
import type { ActionCategory } from '../../../core/project/types';
import { ACTION_CATEGORIES } from '../../../core/project/types';
import './ActionManager.css';

// ─── Category Colors ────────────────────────────────────────

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  movement: '#3b82f6',
  combat: '#ef4444',
  emotion: '#f59e0b',
  gesture: '#10b981',
  idle: '#64748b',
  custom: '#a855f7',
};

// ─── Keyframe Timeline Visualizer ───────────────────────────

const KeyframeTimeline: React.FC<{
  keyframes: ActionKeyframe[];
  duration: number;
}> = ({ keyframes, duration }) => {
  const width = 300;
  const height = 32;

  return (
    <div className="kf-timeline">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Track line */}
        <line x1="8" y1={height / 2} x2={width - 8} y2={height / 2}
          stroke="#334155" strokeWidth="2" />
        {/* Keyframe dots */}
        {keyframes.map((kf, i) => {
          const x = 8 + ((kf.time / duration) * (width - 16));
          const boneCount = Object.keys(kf.boneStates).length;
          return (
            <g key={i}>
              <circle cx={x} cy={height / 2} r={5} fill={CATEGORY_COLORS.movement}
                stroke="#e2e8f0" strokeWidth="1.5" />
              <text x={x} y={height / 2 - 8} textAnchor="middle"
                fill="#94a3b8" fontSize="8">{kf.time.toFixed(1)}s</text>
              <text x={x} y={height / 2 + 14} textAnchor="middle"
                fill="#64748b" fontSize="7">{boneCount}b</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Bone Inspector ─────────────────────────────────────────

const BoneInspector: React.FC<{ keyframe: ActionKeyframe }> = ({ keyframe }) => {
  const bones = Object.entries(keyframe.boneStates);
  if (bones.length === 0) return <div className="bone-empty">No bone states</div>;

  return (
    <div className="bone-inspector">
      <table className="bone-table">
        <thead>
          <tr>
            <th>Bone</th>
            <th>Rot°</th>
            <th>Tx</th>
            <th>Ty</th>
            <th>Sx</th>
            <th>Sy</th>
          </tr>
        </thead>
        <tbody>
          {bones.map(([name, bs]) => (
            <tr key={name}>
              <td className="bone-name">{name}</td>
              <td>{(bs.rotation * 180 / Math.PI).toFixed(1)}</td>
              <td>{bs.translateX.toFixed(1)}</td>
              <td>{bs.translateY.toFixed(1)}</td>
              <td>{bs.scaleX.toFixed(2)}</td>
              <td>{bs.scaleY.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Action Card ────────────────────────────────────────────

const ActionCard: React.FC<{
  action: ActionDefinition;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ action, isSelected, onSelect }) => {
  const cat = action.category ?? 'custom';
  const color = CATEGORY_COLORS[cat];

  return (
    <div className={`action-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}>
      <div className="action-card__color-bar" style={{ background: color }} />
      <div className="action-card__body">
        <div className="action-card__header">
          <span className="action-card__name">{action.name}</span>
          <span className="action-card__badge" style={{ background: color + '30', color }}>
            {cat}
          </span>
        </div>
        <div className="action-card__meta">
          {action.duration.toFixed(1)}s | {action.keyframes.length} keyframes | {action.loop ? 'Loop' : 'Once'}
        </div>
        {action.tags && action.tags.length > 0 && (
          <div className="action-card__tags">
            {action.tags.map((t) => (
              <span key={t} className="action-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Action Manager ────────────────────────────────────

const ActionManager: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ActionCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedKeyframe, setExpandedKeyframe] = useState<number | null>(null);

  const filteredActions = useMemo(() => {
    let actions = BUILTIN_ACTIONS;
    if (filterCategory !== 'all') {
      actions = getActionsByCategory(filterCategory);
    }
    if (searchQuery) {
      actions = searchActions(searchQuery);
      if (filterCategory !== 'all') {
        actions = actions.filter((a) => a.category === filterCategory);
      }
    }
    return actions;
  }, [filterCategory, searchQuery]);

  const selectedAction = useMemo(
    () => BUILTIN_ACTIONS.find((a) => a.id === selectedId),
    [selectedId],
  );

  return (
    <div className="action-manager">
      {/* Left: Action list */}
      <div className="action-manager__list">
        <div className="action-list-header">
          <h3>Actions ({filteredActions.length})</h3>
        </div>

        {/* Category filters */}
        <div className="action-filters">
          <button className={`filter-chip ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}>All</button>
          {ACTION_CATEGORIES.map((cat) => (
            <button key={cat}
              className={`filter-chip ${filterCategory === cat ? 'active' : ''}`}
              style={{ '--fc': CATEGORY_COLORS[cat] } as React.CSSProperties}
              onClick={() => setFilterCategory(cat)}>
              {cat} ({getActionsByCategory(cat).length})
            </button>
          ))}
        </div>

        {/* Search */}
        <input type="text" className="input-text action-search"
          placeholder="Search by name or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)} />

        {/* List */}
        <div className="action-list-items">
          {filteredActions.map((action) => (
            <ActionCard key={action.id} action={action}
              isSelected={action.id === selectedId}
              onSelect={() => { setSelectedId(action.id); setExpandedKeyframe(null); }} />
          ))}
          {filteredActions.length === 0 && (
            <div className="action-empty">No actions match the current filter.</div>
          )}
        </div>
      </div>

      {/* Right: Detail */}
      <div className="action-manager__detail">
        {selectedAction ? (
          <>
            <div className="action-detail-header">
              <h3>{selectedAction.name}</h3>
              <span className="action-detail-badge"
                style={{ background: CATEGORY_COLORS[selectedAction.category ?? 'custom'] }}>
                {selectedAction.category ?? 'custom'}
              </span>
            </div>

            {selectedAction.description && (
              <p className="action-detail-desc">{selectedAction.description}</p>
            )}

            <div className="action-detail-props">
              <div className="action-prop">
                <span className="action-prop__label">Duration</span>
                <span className="action-prop__value">{selectedAction.duration.toFixed(2)}s</span>
              </div>
              <div className="action-prop">
                <span className="action-prop__label">Loop</span>
                <span className="action-prop__value">{selectedAction.loop ? 'Yes' : 'No'}</span>
              </div>
              <div className="action-prop">
                <span className="action-prop__label">Keyframes</span>
                <span className="action-prop__value">{selectedAction.keyframes.length}</span>
              </div>
              {selectedAction.targetSkeleton && (
                <div className="action-prop">
                  <span className="action-prop__label">Target</span>
                  <span className="action-prop__value">{selectedAction.targetSkeleton}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {selectedAction.tags && selectedAction.tags.length > 0 && (
              <div className="action-detail-tags">
                {selectedAction.tags.map((t) => (
                  <span key={t} className="action-tag action-tag--lg">{t}</span>
                ))}
              </div>
            )}

            {/* Keyframe Timeline */}
            <div className="action-detail-section">
              <h4>Keyframe Timeline</h4>
              <KeyframeTimeline keyframes={selectedAction.keyframes}
                duration={selectedAction.duration} />
            </div>

            {/* Keyframe List with Bone Inspector */}
            <div className="action-detail-section">
              <h4>Keyframe Details</h4>
              <div className="kf-list">
                {selectedAction.keyframes.map((kf, i) => (
                  <div key={i} className="kf-item">
                    <div className="kf-item-header"
                      onClick={() => setExpandedKeyframe(expandedKeyframe === i ? null : i)}>
                      <span className="kf-item-time">
                        t={kf.time.toFixed(2)}s
                      </span>
                      <span className="kf-item-bones">
                        {Object.keys(kf.boneStates).length} bones
                      </span>
                      {kf.easing && <span className="kf-item-easing">{kf.easing}</span>}
                      <span className="kf-item-expand">
                        {expandedKeyframe === i ? '▼' : '▶'}
                      </span>
                    </div>
                    {expandedKeyframe === i && (
                      <BoneInspector keyframe={kf} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="action-detail-empty">
            Select an action to view its details, keyframes, and bone states.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionManager;
