// ============================================================
// panda-shot-engine — Shot List Panel
// Displays all shots with mini-thumbnails, supports reordering,
// right-click context menu, and shot management actions.
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, DEMO_SCENES } from '../../hooks/useEditorState';
import { Shot, CameraCommand } from '../../../core/dsl/types';
import { getScenePreset } from '../../../demo/demo-project';

import './ShotList.css';

// ─── Mini Thumbnail Renderer ────────────────────────────────

function ShotThumbnail({
  shot,
  width,
  height,
}: {
  shot: Shot;
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Draw scene background
    const preset = getScenePreset(shot.set);
    const bgGradientStart = preset.bgGradientStart || '#3e2723';
    const bgGradientEnd = preset.bgGradientEnd || '#1a0e0a';
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, bgGradientStart);
    grad.addColorStop(1, bgGradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw floor line
    const floorY = height * 0.75;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(width, floorY);
    ctx.stroke();

    // Draw mini characters as colored circles
    const placements = shot.placements;
    const charColors: Record<string, string> = {
      '张三': '#4caf50',
      '赤蛟': '#f44336',
      '李四': '#2196f3',
      '白长老': '#9c27b0',
      '王掌柜': '#ff9800',
    };

    placements.forEach((p, i) => {
      const semanticMap: Record<string, number> = {
        'far-left': 0.1,
        'left-third': 0.2,
        'left': 0.3,
        'center-left': 0.4,
        'center': 0.5,
        'center-right': 0.6,
        'right': 0.7,
        'right-third': 0.8,
        'far-right': 0.9,
      };
      const xFrac = semanticMap[p.position?.semantic ?? 'center'] ?? 0.5;
      const cx = xFrac * width;
      const cy = floorY - 6;
      const color = charColors[p.character] ?? '#aaa';

      // Head
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy + 6);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Camera indicator
    let cameraType = 'wide';
    for (const te of shot.timeline) {
      for (const cmd of te.commands) {
        if (cmd.type === 'camera') {
          cameraType = (cmd as CameraCommand).cameraType;
          break;
        }
      }
    }

    // Show camera frame overlay for non-wide
    if (cameraType !== 'wide') {
      ctx.strokeStyle = 'rgba(255,200,0,0.5)';
      ctx.lineWidth = 1;
      let inset = 0;
      if (cameraType === 'medium') inset = width * 0.1;
      else if (cameraType === 'close-up') inset = width * 0.2;
      else if (cameraType === 'extreme-close-up') inset = width * 0.3;
      ctx.strokeRect(inset, inset * 0.6, width - inset * 2, height - inset * 1.2);
    }

    // Shot label
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, height - 12, width, 12);
    ctx.fillStyle = '#eee';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(shot.id.substring(0, 16), 2, height - 3);

    // Duration badge
    ctx.textAlign = 'right';
    ctx.fillText(`${shot.duration}s`, width - 2, height - 3);
  }, [shot, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block', borderRadius: 3 }}
    />
  );
}

// ─── Context Menu ───────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  shotIndex: number;
}

function ContextMenu({
  menu,
  onAction,
  onClose,
}: {
  menu: ContextMenuState;
  onAction: (action: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const items = [
    { id: 'duplicate', label: 'Duplicate Shot', icon: '+' },
    { id: 'insert_before', label: 'Insert Before', icon: '>' },
    { id: 'insert_after', label: 'Insert After', icon: '<' },
    { id: 'divider', label: '', icon: '' },
    { id: 'move_up', label: 'Move Up', icon: 'U' },
    { id: 'move_down', label: 'Move Down', icon: 'D' },
    { id: 'divider2', label: '', icon: '' },
    { id: 'delete', label: 'Delete Shot', icon: 'X' },
  ];

  return (
    <div
      ref={ref}
      className="shotlist-context-menu"
      style={{ top: menu.y, left: menu.x }}
    >
      {items.map((item) =>
        item.id.startsWith('divider') ? (
          <div key={item.id} className="shotlist-ctx-divider" />
        ) : (
          <div
            key={item.id}
            className={`shotlist-ctx-item ${item.id === 'delete' ? 'shotlist-ctx-item--danger' : ''}`}
            onClick={() => onAction(item.id)}
          >
            <span className="shotlist-ctx-icon">{item.icon}</span>
            <span className="shotlist-ctx-label">{item.label}</span>
          </div>
        ),
      )}
    </div>
  );
}

// ─── Drag state ─────────────────────────────────────────────

interface DragState {
  fromIndex: number;
  overIndex: number;
}

// ─── Shot List Item ─────────────────────────────────────────

function ShotListItem({
  shot,
  index,
  isActive,
  isDragOver,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  shot: Shot;
  index: number;
  isActive: boolean;
  isDragOver: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      className={`shotlist-item ${isActive ? 'shotlist-item--active' : ''} ${isDragOver ? 'shotlist-item--dragover' : ''}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <div className="shotlist-item-thumb">
        <ShotThumbnail shot={shot} width={120} height={68} />
      </div>
      <div className="shotlist-item-info">
        <div className="shotlist-item-id" title={shot.id}>
          {shot.id}
        </div>
        <div className="shotlist-item-meta">
          <span className="shotlist-item-duration">{shot.duration}s</span>
          <span className="shotlist-item-sep">|</span>
          <span className="shotlist-item-set">{shot.set}</span>
        </div>
        <div className="shotlist-item-chars">
          {shot.placements.map((p) => (
            <span key={p.character} className="shotlist-item-char-tag">
              {p.character}
            </span>
          ))}
        </div>
      </div>
      <div className="shotlist-item-index">#{index + 1}</div>
    </div>
  );
}

// ─── Main ShotList Component ────────────────────────────────

export default function ShotList() {
  const { state, dispatch } = useEditor();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const shots = state.project?.shots ?? [];
  const currentIndex = state.currentShotIndex;

  const filteredIndices = useMemo(() => {
    if (!searchQuery.trim()) return shots.map((_, i) => i);
    const q = searchQuery.toLowerCase();
    return shots
      .map((s, i) => ({ s, i }))
      .filter(
        ({ s }) =>
          s.id.toLowerCase().includes(q) ||
          s.set.toLowerCase().includes(q) ||
          s.placements.some((p) => p.character.toLowerCase().includes(q)),
      )
      .map(({ i }) => i);
  }, [shots, searchQuery]);

  const handleSelect = useCallback(
    (index: number) => {
      dispatch({ type: 'SET_CURRENT_SHOT', index });
      dispatch({
        type: 'SELECT_ELEMENT',
        element: { type: 'shot', shotIndex: index, id: shots[index]?.id ?? '' },
      });
    },
    [dispatch, shots],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, shotIndex: index });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return;
      const idx = contextMenu.shotIndex;

      switch (action) {
        case 'duplicate':
          dispatch({ type: 'DUPLICATE_SHOT', index: idx });
          break;
        case 'insert_before':
          dispatch({ type: 'ADD_SHOT', afterIndex: idx - 1 });
          break;
        case 'insert_after':
          dispatch({ type: 'ADD_SHOT', afterIndex: idx });
          break;
        case 'move_up':
          if (idx > 0) {
            dispatch({ type: 'REORDER_SHOT', fromIndex: idx, toIndex: idx - 1 });
          }
          break;
        case 'move_down':
          if (idx < shots.length - 1) {
            dispatch({ type: 'REORDER_SHOT', fromIndex: idx, toIndex: idx + 1 });
          }
          break;
        case 'delete':
          if (shots.length > 1) {
            dispatch({ type: 'REMOVE_SHOT', index: idx });
          }
          break;
      }
      setContextMenu(null);
    },
    [contextMenu, dispatch, shots.length],
  );

  const handleDragStart = useCallback((index: number) => {
    setDragState({ fromIndex: index, overIndex: index });
  }, []);

  const handleDragOver = useCallback(
    (index: number) => {
      if (dragState) {
        setDragState({ ...dragState, overIndex: index });
      }
    },
    [dragState],
  );

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragState && dragState.fromIndex !== toIndex) {
        dispatch({
          type: 'REORDER_SHOT',
          fromIndex: dragState.fromIndex,
          toIndex,
        });
      }
      setDragState(null);
    },
    [dragState, dispatch],
  );

  const handleAddShot = useCallback(() => {
    dispatch({ type: 'ADD_SHOT', afterIndex: shots.length - 1 });
  }, [dispatch, shots.length]);

  // Scroll active shot into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('.shotlist-item--active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex]);

  // Total duration
  const totalDuration = useMemo(
    () => shots.reduce((sum, s) => sum + s.duration, 0),
    [shots],
  );

  return (
    <div className="shotlist-panel">
      <div className="panel-header">
        <span className="panel-header-title">Shots</span>
        <span className="panel-header-badge">{shots.length}</span>
      </div>

      {/* Search bar */}
      <div className="shotlist-search">
        <input
          type="text"
          className="shotlist-search-input"
          placeholder="Search shots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            className="shotlist-search-clear"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            x
          </button>
        )}
      </div>

      {/* Shot list */}
      <div
        ref={listRef}
        className="shotlist-items"
        onDragEnd={() => setDragState(null)}
      >
        {filteredIndices.map((originalIndex) => {
          const shot = shots[originalIndex];
          if (!shot) return null;
          return (
            <ShotListItem
              key={`${shot.id}_${originalIndex}`}
              shot={shot}
              index={originalIndex}
              isActive={originalIndex === currentIndex}
              isDragOver={dragState?.overIndex === originalIndex}
              onSelect={() => handleSelect(originalIndex)}
              onContextMenu={(e) => handleContextMenu(e, originalIndex)}
              onDragStart={() => handleDragStart(originalIndex)}
              onDragOver={() => handleDragOver(originalIndex)}
              onDrop={() => handleDrop(originalIndex)}
            />
          );
        })}

        {filteredIndices.length === 0 && (
          <div className="shotlist-empty">
            {searchQuery ? 'No matching shots' : 'No shots in project'}
          </div>
        )}
      </div>

      {/* Footer with stats and add button */}
      <div className="shotlist-footer">
        <div className="shotlist-stats">
          <span>{shots.length} shots</span>
          <span className="shotlist-stats-sep">|</span>
          <span>{totalDuration.toFixed(1)}s total</span>
        </div>
        <button className="shotlist-add-btn" onClick={handleAddShot} title="Add new shot">
          + New Shot
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
