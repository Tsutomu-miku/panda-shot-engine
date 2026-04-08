import React, { useState } from 'react';

// ── Asset Panel (Left Sidebar) ────────────────────────────────────────────────

function AssetPanel(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'characters' | 'props' | 'scenes'>('characters');

  const tabs = [
    { key: 'characters' as const, label: '角色' },
    { key: 'props' as const, label: '道具' },
    { key: 'scenes' as const, label: '场景' },
  ];

  const placeholderItems: Record<string, string[]> = {
    characters: ['熊猫头 - 默认', '熊猫头 - 开心', '虾头 - 默认', '虾头 - 惊讶'],
    props: ['对话气泡', '特效 - 闪光', '特效 - 爆炸', '道具 - 帽子'],
    scenes: ['默认背景', '户外场景', '室内场景', '纯色背景'],
  };

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <span className="panel-title">素材库</span>
      </div>
      <div className="asset-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`asset-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="asset-list">
        {placeholderItems[activeTab].map((item, index) => (
          <div key={index} className="asset-item">
            <div className="asset-thumbnail" />
            <span className="asset-name">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Canvas Preview (Center Top) ───────────────────────────────────────────────

function CanvasPreview(): React.ReactElement {
  return (
    <div className="panel canvas-panel">
      <div className="panel-header">
        <span className="panel-title">场景预览</span>
        <div className="canvas-toolbar">
          <button className="toolbar-btn" title="缩放适配">⊞</button>
          <button className="toolbar-btn" title="放大">+</button>
          <button className="toolbar-btn" title="缩小">−</button>
          <span className="zoom-label">100%</span>
        </div>
      </div>
      <div className="canvas-area">
        <div className="canvas-placeholder">
          <div className="canvas-empty-state">
            <div className="empty-icon">🎬</div>
            <p>将素材拖拽到画布开始创作</p>
            <p className="empty-hint">或在 DSL 编辑器中编写动画脚本</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Panel (Center Bottom) ────────────────────────────────────────────

function TimelinePanel(): React.ReactElement {
  const tracks = [
    { name: '熊猫头', type: 'character' },
    { name: '对话气泡', type: 'prop' },
    { name: '背景', type: 'scene' },
  ];

  return (
    <div className="panel timeline-panel">
      <div className="panel-header">
        <span className="panel-title">时间线</span>
        <div className="timeline-controls">
          <button className="toolbar-btn" title="回到开头">⏮</button>
          <button className="toolbar-btn play-btn" title="播放">▶</button>
          <button className="toolbar-btn" title="到末尾">⏭</button>
          <span className="time-display">00:00.000 / 00:05.000</span>
        </div>
      </div>
      <div className="timeline-body">
        <div className="timeline-tracks-header">
          {tracks.map((track, index) => (
            <div key={index} className="track-label">
              <span className="track-type-indicator" data-type={track.type} />
              {track.name}
            </div>
          ))}
        </div>
        <div className="timeline-tracks-area">
          <div className="timeline-ruler">
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className="ruler-mark">{(i * 0.5).toFixed(1)}s</span>
            ))}
          </div>
          {tracks.map((_, index) => (
            <div key={index} className="track-row">
              <div className="keyframe-block" style={{ left: '5%', width: '30%' }} />
            </div>
          ))}
          <div className="playhead" style={{ left: '0%' }} />
        </div>
      </div>
    </div>
  );
}

// ── DSL Editor Panel (Right Sidebar Top) ──────────────────────────────────────

function DSLEditorPanel(): React.ReactElement {
  const [dslCode, setDslCode] = useState<string>(
`# Panda Shot DSL
@scene "默认场景" {
  background: "#1a1a30"
  duration: 5s
}

@character "熊猫头" {
  position: center
  scale: 1.0

  @keyframe 0s {
    expression: "default"
    opacity: 0
  }

  @keyframe 0.5s {
    expression: "default"
    opacity: 1
  }

  @keyframe 2s {
    expression: "happy"
    move: [100, 0]
  }
}

@prop "对话气泡" {
  attach: "熊猫头"
  offset: [0, -120]

  @keyframe 1s { text: "你好!" }
  @keyframe 3s { text: "再见~" }
}`
  );

  return (
    <div className="panel dsl-panel">
      <div className="panel-header">
        <span className="panel-title">DSL 编辑器</span>
        <div className="dsl-toolbar">
          <button className="toolbar-btn" title="运行">▶ 运行</button>
          <button className="toolbar-btn" title="格式化">格式化</button>
        </div>
      </div>
      <div className="dsl-editor-area">
        <textarea
          className="dsl-textarea"
          value={dslCode}
          onChange={(e) => setDslCode(e.target.value)}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ── Properties Panel (Right Sidebar Bottom) ───────────────────────────────────

function PropertiesPanel(): React.ReactElement {
  return (
    <div className="panel properties-panel">
      <div className="panel-header">
        <span className="panel-title">属性</span>
      </div>
      <div className="properties-body">
        <div className="property-group">
          <div className="property-group-title">变换</div>
          <div className="property-row">
            <label>位置 X</label>
            <input type="number" className="property-input" defaultValue={0} />
          </div>
          <div className="property-row">
            <label>位置 Y</label>
            <input type="number" className="property-input" defaultValue={0} />
          </div>
          <div className="property-row">
            <label>缩放</label>
            <input type="number" className="property-input" defaultValue={1.0} step={0.1} />
          </div>
          <div className="property-row">
            <label>旋转</label>
            <input type="number" className="property-input" defaultValue={0} step={1} />
          </div>
        </div>
        <div className="property-group">
          <div className="property-group-title">外观</div>
          <div className="property-row">
            <label>透明度</label>
            <input type="range" className="property-slider" min={0} max={1} step={0.01} defaultValue={1} />
          </div>
          <div className="property-row">
            <label>混合模式</label>
            <select className="property-select" defaultValue="normal">
              <option value="normal">正常</option>
              <option value="multiply">正片叠底</option>
              <option value="screen">滤色</option>
              <option value="overlay">叠加</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App Layout ───────────────────────────────────────────────────────────

export function App(): React.ReactElement {
  return (
    <div className="app-container">
      {/* Top Menu Bar */}
      <div className="menu-bar">
        <div className="menu-left">
          <span className="app-logo">🐼</span>
          <span className="app-title">Panda Shot Engine</span>
        </div>
        <div className="menu-center">
          <button className="menu-item">文件</button>
          <button className="menu-item">编辑</button>
          <button className="menu-item">视图</button>
          <button className="menu-item">动画</button>
          <button className="menu-item">导出</button>
          <button className="menu-item">帮助</button>
        </div>
        <div className="menu-right">
          <span className="project-name">未命名项目</span>
        </div>
      </div>

      {/* Main Editor Grid */}
      <div className="editor-grid">
        {/* Left Sidebar */}
        <aside className="sidebar-left">
          <AssetPanel />
        </aside>

        {/* Center Area */}
        <main className="center-area">
          <div className="center-top">
            <CanvasPreview />
          </div>
          <div className="center-bottom">
            <TimelinePanel />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="sidebar-right">
          <div className="right-top">
            <DSLEditorPanel />
          </div>
          <div className="right-bottom">
            <PropertiesPanel />
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <span className="status-item">FPS: 60</span>
        <span className="status-item">帧: 0 / 150</span>
        <span className="status-item">分辨率: 1920 x 1080</span>
        <span className="status-spacer" />
        <span className="status-item">v0.1.0</span>
      </div>
    </div>
  );
}
