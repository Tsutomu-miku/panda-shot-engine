// ============================================================
// panda-shot-engine — Editor Layout
// Panel-based layout with resizable dividers and collapsible
// sections, inspired by After Effects / DaVinci Resolve.
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor } from '../../hooks/useEditorState';

// Lazy imports for panels
import ShotList from '../panels/ShotList';
import AssetPanel from '../panels/AssetPanel';
import CanvasPreview from '../panels/CanvasPreview';
import DslEditor from '../panels/DslEditor';
import TimelinePanel from '../panels/TimelinePanel';
import PropertiesPanel from '../panels/PropertiesPanel';

import './EditorLayout.css';

// ─── Resizable Divider ──────────────────────────────────────

interface DividerProps {
  direction: 'vertical' | 'horizontal';
  onResize: (delta: number) => void;
}

function Divider({ direction, onResize }: DividerProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === 'vertical' ? e.clientX : e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const currentPos =
          direction === 'vertical' ? ev.clientX : ev.clientY;
        const delta = currentPos - lastPos.current;
        lastPos.current = currentPos;
        onResize(delta);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor =
        direction === 'vertical' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onResize],
  );

  return (
    <div
      className={`layout-divider layout-divider--${direction}`}
      onMouseDown={handleMouseDown}
    />
  );
}

// ─── Collapsible Panel Wrapper ──────────────────────────────

interface CollapsiblePanelProps {
  panelId: string;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  direction: 'vertical' | 'horizontal';
  minSize?: number;
}

function CollapsiblePanel({
  panelId,
  children,
  collapsed,
  onToggle,
  direction,
  minSize = 32,
}: CollapsiblePanelProps) {
  if (collapsed) {
    return (
      <div
        className={`layout-collapsed-panel layout-collapsed-panel--${direction}`}
        style={
          direction === 'vertical'
            ? { width: minSize }
            : { height: minSize }
        }
      >
        <button
          className="layout-collapse-btn"
          onClick={onToggle}
          title={`Expand ${panelId}`}
        >
          <span className="layout-collapse-icon">
            {direction === 'vertical' ? '>' : 'v'}
          </span>
          <span className="layout-collapse-label">{panelId}</span>
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Main Editor Layout ─────────────────────────────────────

export default function EditorLayout() {
  const { state } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  const DEFAULT_LEFT_WIDTH = 280;
  const DEFAULT_RIGHT_WIDTH = 340;
  const DEFAULT_TIMELINE_HEIGHT = 220;
  const DEFAULT_LEFT_SPLIT_RATIO = 0.48;
  const DEFAULT_RIGHT_SPLIT_RATIO = 0.52;
  const collapsedPanels = useMemo(() => new Set<string>(), []);

  // Panel widths and heights
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [timelineHeight, setTimelineHeight] = useState(DEFAULT_TIMELINE_HEIGHT);
  const [leftSplitRatio, setLeftSplitRatio] = useState(DEFAULT_LEFT_SPLIT_RATIO);
  const [rightSplitRatio, setRightSplitRatio] = useState(DEFAULT_RIGHT_SPLIT_RATIO);

  const isCollapsed = useCallback(
    (panelId: string) => collapsedPanels.has(panelId),
    [collapsedPanels],
  );

  const toggleCollapse = useCallback(
    (_panelId: string) => {
      // Current editor state does not persist collapsed panel layout yet.
    },
    [],
  );

  // Resize handlers with min/max clamping
  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(160, Math.min(500, w + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(200, Math.min(600, w - delta)));
  }, []);

  const handleTimelineResize = useCallback((delta: number) => {
    setTimelineHeight((h) => Math.max(100, Math.min(500, h - delta)));
  }, []);

  const handleLeftSplitResize = useCallback(
    (delta: number) => {
      if (!containerRef.current) return;
      const containerHeight = containerRef.current.clientHeight - timelineHeight - 40;
      if (containerHeight <= 0) return;
      setLeftSplitRatio((r) =>
        Math.max(0.15, Math.min(0.85, r + delta / containerHeight)),
      );
    },
    [timelineHeight],
  );

  const handleRightSplitResize = useCallback(
    (delta: number) => {
      if (!containerRef.current) return;
      const containerHeight = containerRef.current.clientHeight - timelineHeight - 40;
      if (containerHeight <= 0) return;
      setRightSplitRatio((r) =>
        Math.max(0.15, Math.min(0.85, r + delta / containerHeight)),
      );
    },
    [timelineHeight],
  );

  // Calculate the center area style
  const effectiveLeftWidth = isCollapsed('shots') && isCollapsed('assets') ? 32 : leftWidth;
  const effectiveRightWidth =
    isCollapsed('properties') && isCollapsed('dsl') ? 32 : rightWidth;

  // View mode determines what shows in the center
  const renderCenterPanel = () => (
    <div className="layout-center-full">
      <CanvasPreview />
    </div>
  );

  return (
    <div ref={containerRef} className="editor-layout">
      {/* ── Top Row (panels + center) ──────────────────────── */}
      <div className="layout-main-row">
        {/* Left Column: Shot List + Asset Panel */}
        <CollapsiblePanel
          panelId="left"
          collapsed={isCollapsed('shots') && isCollapsed('assets')}
          onToggle={() => {
            toggleCollapse('shots');
            toggleCollapse('assets');
          }}
          direction="vertical"
        >
          <div
            className="layout-left-column"
            style={{ width: effectiveLeftWidth, minWidth: effectiveLeftWidth }}
          >
            {/* Shot List (top portion) */}
            <CollapsiblePanel
              panelId="shots"
              collapsed={isCollapsed('shots')}
              onToggle={() => toggleCollapse('shots')}
              direction="horizontal"
            >
              <div
                className="layout-left-top"
                style={{
                  height: `${leftSplitRatio * 100}%`,
                  minHeight: 80,
                }}
              >
                <ShotList />
              </div>
            </CollapsiblePanel>

            {/* Split divider */}
            {!isCollapsed('shots') && !isCollapsed('assets') && (
              <Divider direction="horizontal" onResize={handleLeftSplitResize} />
            )}

            {/* Asset Panel (bottom portion) */}
            <CollapsiblePanel
              panelId="assets"
              collapsed={isCollapsed('assets')}
              onToggle={() => toggleCollapse('assets')}
              direction="horizontal"
            >
              <div
                className="layout-left-bottom"
                style={{
                  flex: 1,
                  minHeight: 80,
                  overflow: 'hidden',
                }}
              >
                <AssetPanel />
              </div>
            </CollapsiblePanel>
          </div>
        </CollapsiblePanel>

        {/* Left Divider */}
        <Divider direction="vertical" onResize={handleLeftResize} />

        {/* Center: Canvas / DSL / Split */}
        <div className="layout-center-column">{renderCenterPanel()}</div>

        {/* Right Divider */}
        <Divider direction="vertical" onResize={handleRightResize} />

        {/* Right Column: Properties + DSL Editor */}
        <CollapsiblePanel
          panelId="right"
          collapsed={isCollapsed('properties') && isCollapsed('dsl')}
          onToggle={() => {
            toggleCollapse('properties');
            toggleCollapse('dsl');
          }}
          direction="vertical"
        >
          <div
            className="layout-right-column"
            style={{ width: effectiveRightWidth, minWidth: effectiveRightWidth }}
          >
            {/* Properties (top portion) */}
            <CollapsiblePanel
              panelId="properties"
              collapsed={isCollapsed('properties')}
              onToggle={() => toggleCollapse('properties')}
              direction="horizontal"
            >
              <div
                className="layout-right-top"
                style={{
                  height: `${rightSplitRatio * 100}%`,
                  minHeight: 80,
                }}
              >
                <PropertiesPanel />
              </div>
            </CollapsiblePanel>

            {/* Split divider */}
            {!isCollapsed('properties') && !isCollapsed('dsl') && (
              <Divider direction="horizontal" onResize={handleRightSplitResize} />
            )}

            {/* DSL Editor (bottom portion) */}
            <CollapsiblePanel
              panelId="dsl"
              collapsed={isCollapsed('dsl')}
              onToggle={() => toggleCollapse('dsl')}
              direction="horizontal"
            >
              <div
                className="layout-right-bottom"
                style={{
                  flex: 1,
                  minHeight: 80,
                  overflow: 'hidden',
                }}
              >
                <DslEditor />
              </div>
            </CollapsiblePanel>
          </div>
        </CollapsiblePanel>
      </div>

      {/* ── Timeline Divider ───────────────────────────────── */}
      <Divider direction="horizontal" onResize={handleTimelineResize} />

      {/* ── Bottom Row: Timeline ───────────────────────────── */}
      <CollapsiblePanel
        panelId="timeline"
        collapsed={isCollapsed('timeline')}
        onToggle={() => toggleCollapse('timeline')}
        direction="horizontal"
      >
        <div
          className="layout-timeline-row"
          style={{ height: timelineHeight, minHeight: timelineHeight }}
        >
          <TimelinePanel />
        </div>
      </CollapsiblePanel>
    </div>
  );
}
