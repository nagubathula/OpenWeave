'use client';

import { useState, useEffect } from 'react';
import { Exporter } from '../lib/utils/exporter.js';
import { Templates } from '../lib/utils/templates.js';
import { LayoutGrid, Download, Upload, RefreshCw, Plus, Minus, Layers, Wand2, Play } from 'lucide-react';

export default function HeaderNav({ state, renderer, onSaveApi, onOpenAI, onOpenPrototype }) {
  const [projectName, setProjectName] = useState(state ? state.projectName : 'OpenPencil Figma Clone');
  const [gridType, setGridType] = useState(state ? state.gridType : 'dots');
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!state) return;
    const unsub = state.subscribe(s => {
      setProjectName(s.projectName);
      setGridType(s.gridType);
      setZoom(s.zoom);
    });
    return () => unsub();
  }, [state]);

  const toggleGrid = () => {
    const modes = ['dots', 'lines', 'none'];
    const curIdx = modes.indexOf(state.gridType);
    const nextMode = modes[(curIdx + 1) % modes.length];
    state.gridType = nextMode;
    setGridType(nextMode);
    renderer?.render();
  };

  return (
    <header className="header-nav">
      <div className="brand-section">
        <div className="brand-logo">
          <Layers width={18} height={18} />
        </div>
        <div className="brand-title">
          OpenPencil
          <span className="brand-badge">AI Native</span>
        </div>
        <input
          type="text"
          className="project-name-input"
          value={projectName}
          onChange={e => {
            setProjectName(e.target.value);
            state.projectName = e.target.value;
          }}
        />
      </div>

      <div className="nav-actions">
        {/* OpenPencil AI Assistant Wand Button */}
        <button className="nav-btn primary" onClick={onOpenAI} title="Open AI Prompt Generator (Ctrl+K)">
          <Wand2 width={16} height={16} />
          <span>AI Assistant</span>
        </button>

        {/* Play Prototype Button */}
        <button className="nav-btn" onClick={onOpenPrototype} title="Play Interactive Prototype (F5)">
          <Play width={16} height={16} fill="var(--accent-primary)" color="var(--accent-primary)" />
          <span>Prototype (F5)</span>
        </button>

        {/* Grid Toggle */}
        <button className="nav-btn" onClick={toggleGrid} title="Toggle Grid Mode">
          <LayoutGrid width={16} height={16} />
          <span>Grid: {gridType.charAt(0).toUpperCase() + gridType.slice(1)}</span>
        </button>

        {/* Zoom Level */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button className="icon-btn-tiny" onClick={() => { state.setZoom(state.zoom * 0.85); renderer?.render(); }}>
            <Minus width={14} height={14} />
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', minWidth: '45px', textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button className="icon-btn-tiny" onClick={() => { state.setZoom(state.zoom * 1.15); renderer?.render(); }}>
            <Plus width={14} height={14} />
          </button>
          <button className="icon-btn-tiny" onClick={() => { state.setZoom(1); state.setPan(0, 0); renderer?.render(); }}>
            <RefreshCw width={14} height={14} />
          </button>
        </div>

        {/* Exports */}
        <button className="nav-btn" onClick={() => Exporter.exportPNG(renderer?.canvas, state.projectName)}>
          <Download width={16} height={16} />
          PNG
        </button>

        <button className="nav-btn" onClick={() => Exporter.exportSVG(state)}>
          <Download width={16} height={16} />
          SVG
        </button>
      </div>
    </header>
  );
}
