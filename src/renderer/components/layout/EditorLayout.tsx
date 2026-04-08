import React from 'react';
import { EditorProvider } from '../../hooks/useEditorState';

import Toolbar from './Toolbar';
import AssetPanel from '../panels/AssetPanel';
import CanvasPreview from '../panels/CanvasPreview';
import TimelinePanel from '../panels/TimelinePanel';
import DslEditor from '../panels/DslEditor';
import PropertiesPanel from '../panels/PropertiesPanel';
import ShotList from '../panels/ShotList';

import '../../styles/components.css';

/* ================================================================
   EditorLayout
   Main 4-panel layout with toolbar, similar to After Effects /
   DaVinci Resolve. Uses CSS Grid.

   grid-template-areas:
     "assets  canvas  inspector"
     "assets  timeline inspector"
   grid-template-columns: 240px 1fr 320px
   grid-template-rows: 1fr 220px
   ================================================================ */

const EditorLayoutInner: React.FC = () => {
  return (
    <div className="editor-root">
      {/* Top Toolbar */}
      <Toolbar />

      {/* Main Grid */}
      <div className="editor-grid">
        {/* LEFT SIDEBAR: Shot list + Asset panel */}
        <div className="panel asset-panel" style={{ gridArea: 'assets', display: 'flex', flexDirection: 'column' }}>
          {/* Shot list (top part of left sidebar) */}
          <ShotList />

          {/* Divider */}
          <div className="divider" />

          {/* Asset browser (bottom part of left sidebar, takes remaining space) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <AssetPanel />
          </div>
        </div>

        {/* CENTER TOP: Canvas */}
        <CanvasPreview />

        {/* CENTER BOTTOM: Timeline */}
        <TimelinePanel />

        {/* RIGHT SIDEBAR: DSL Editor + Properties */}
        <div className="inspector-panel">
          <DslEditor />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
};

/* Wrap with EditorProvider so all children have access to state */
const EditorLayout: React.FC = () => {
  return (
    <EditorProvider>
      <EditorLayoutInner />
    </EditorProvider>
  );
};

export default EditorLayout;
