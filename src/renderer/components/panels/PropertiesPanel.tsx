import React from 'react';
import { useEditor } from '../../hooks/useEditorState';

import './PropertiesPanel.css';

function EmptyState() {
  return (
    <div className="prop-empty-state">
      <div className="prop-empty-icon">i</div>
      <div className="prop-empty-title">No Selection</div>
      <div className="prop-empty-desc">
        Select an item in the editor to inspect its basic properties.
      </div>
    </div>
  );
}

export default function PropertiesPanel() {
  const { state, currentShot } = useEditor();
  const selectedElement = state.selectedElement;

  if (!currentShot) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <span className="panel-header-title">Properties</span>
        </div>
        <div className="properties-panel-body">
          <div className="prop-empty-state">
            <div className="prop-empty-icon">!</div>
            <div className="prop-empty-title">No Shot Loaded</div>
            <div className="prop-empty-desc">Load or create a project to begin.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-header-title">Properties</span>
        {selectedElement && (
          <span className="panel-header-badge">{selectedElement.type}</span>
        )}
      </div>
      <div className="properties-panel-body">
        {!selectedElement ? (
          <div className="prop-content">
            <div className="prop-section">
              <div className="prop-section-title">Current Shot</div>
              <div className="prop-info-item">
                <span className="prop-info-label">ID</span>
                <span className="prop-info-value">{currentShot.id}</span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">Label</span>
                <span className="prop-info-value">{currentShot.label}</span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">Duration</span>
                <span className="prop-info-value">{currentShot.duration ?? 0}s</span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">DSL Length</span>
                <span className="prop-info-value">{currentShot.dsl.length}</span>
              </div>
            </div>
          </div>
        ) : selectedElement.type === 'character' ? (
          <div className="prop-content">
            <div className="prop-section">
              <div className="prop-section-title">Selected Character</div>
              <div className="prop-info-item">
                <span className="prop-info-label">ID</span>
                <span className="prop-info-value">{selectedElement.id}</span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">Shot Index</span>
                <span className="prop-info-value">{selectedElement.shotIndex}</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
