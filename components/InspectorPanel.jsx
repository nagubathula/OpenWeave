'use client';

import { useState, useEffect } from 'react';
import { CodeGenerator } from '../lib/utils/codeGenerator';
import { Copy, Check, Sliders, Layers, Code, Play } from 'lucide-react';

export default function InspectorPanel({ state, renderer }) {
  const [activeTab, setActiveTab] = useState('design'); // design, prototype, inspect
  const [selected, setSelected] = useState([]);
  const [, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [codeType, setCodeType] = useState('react'); // react, tailwind, css

  useEffect(() => {
    if (!state) return;
    const unsub = state.subscribe(() => {
      setSelected(state.getSelectedElements());
      setVersion(v => v + 1);
    });
    return () => unsub();
  }, [state]);

  if (!state) return null;

  const elem = selected[0];

  const copyCode = (codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Triple Tab Header */}
      <div className="sidebar-tabs">
        <button className={`tab-btn ${activeTab === 'design' ? 'active' : ''}`} onClick={() => setActiveTab('design')}>
          <Sliders width={14} height={14} /> Design
        </button>
        <button className={`tab-btn ${activeTab === 'prototype' ? 'active' : ''}`} onClick={() => setActiveTab('prototype')}>
          <Play width={14} height={14} /> Prototype
        </button>
        <button className={`tab-btn ${activeTab === 'inspect' ? 'active' : ''}`} onClick={() => setActiveTab('inspect')}>
          <Code width={14} height={14} /> Inspect
        </button>
      </div>

      <div className="sidebar-content">
        {/* DESIGN TAB */}
        {activeTab === 'design' && (
          <div>
            {!elem ? (
              <div className="inspector-section">
                <div className="section-title">Canvas Settings</div>
                <div className="property-grid">
                  <div className="property-field">
                    <label>Grid Mode</label>
                    <select
                      className="input-with-unit"
                      style={{ background: 'var(--panel-glass)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '6px', borderRadius: '6px' }}
                      value={state.gridType}
                      onChange={e => {
                        state.gridType = e.target.value;
                        renderer?.render();
                      }}
                    >
                      <option value="dots">Dots</option>
                      <option value="lines">Lines</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                  <div className="property-field">
                    <label>Grid Size</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={state.gridSize}
                        onChange={e => {
                          state.gridSize = parseInt(e.target.value) || 20;
                          renderer?.render();
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="inspector-section">
                  <div className="section-title">Transform</div>
                  <div className="property-grid">
                    <div className="property-field">
                      <label>X Position</label>
                      <div className="input-with-unit">
                        <input type="number" value={Math.round(elem.x)} onChange={e => { state.updateElement(elem.id, { x: parseFloat(e.target.value) || 0 }); renderer?.render(); }} />
                      </div>
                    </div>
                    <div className="property-field">
                      <label>Y Position</label>
                      <div className="input-with-unit">
                        <input type="number" value={Math.round(elem.y)} onChange={e => { state.updateElement(elem.id, { y: parseFloat(e.target.value) || 0 }); renderer?.render(); }} />
                      </div>
                    </div>
                    <div className="property-field">
                      <label>Width</label>
                      <div className="input-with-unit">
                        <input type="number" value={Math.round(elem.width)} onChange={e => { state.updateElement(elem.id, { width: parseFloat(e.target.value) || 10 }); renderer?.render(); }} />
                      </div>
                    </div>
                    <div className="property-field">
                      <label>Height</label>
                      <div className="input-with-unit">
                        <input type="number" value={Math.round(elem.height)} onChange={e => { state.updateElement(elem.id, { height: parseFloat(e.target.value) || 10 }); renderer?.render(); }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="section-title">Fill & Colors</div>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      className="color-swatch-input"
                      value={elem.style?.fill || '#1e293b'}
                      onChange={e => { state.updateElement(elem.id, { style: { fill: e.target.value } }); renderer?.render(); }}
                    />
                    <input
                      type="text"
                      className="input-with-unit"
                      value={elem.style?.fill || '#1e293b'}
                      style={{ flex: 1 }}
                      onChange={e => { state.updateElement(elem.id, { style: { fill: e.target.value } }); renderer?.render(); }}
                    />
                  </div>
                  <div className="preset-swatches">
                    {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#1e293b', '#fef08a'].map(c => (
                      <div
                        key={c}
                        className="swatch-item"
                        style={{ background: c }}
                        onClick={() => { state.updateElement(elem.id, { style: { fill: c } }); renderer?.render(); }}
                      />
                    ))}
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="section-title">Text Content</div>
                  <input
                    type="text"
                    className="input-with-unit"
                    value={elem.text || elem.label || ''}
                    placeholder="Enter text..."
                    onChange={e => { state.updateElement(elem.id, { text: e.target.value }); renderer?.render(); }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROTOTYPE TAB */}
        {activeTab === 'prototype' && (
          <div>
            <div className="inspector-section">
              <div className="section-title">Interactivity Triggers</div>
              <div className="property-field" style={{ marginBottom: '10px' }}>
                <label>Trigger Event</label>
                <select className="input-with-unit" style={{ background: 'var(--panel-glass)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '6px', borderRadius: '6px' }}>
                  <option value="click">On Click (Default)</option>
                  <option value="hover">While Hovering</option>
                  <option value="drag">On Drag</option>
                </select>
              </div>

              <div className="property-field">
                <label>Action Target</label>
                <select className="input-with-unit" style={{ background: 'var(--panel-glass)', color: 'var(--text-main)', border: '1px solid var(--panel-border)', padding: '6px', borderRadius: '6px' }}>
                  <option value="next_frame">Navigate to Next Artboard Frame</option>
                  <option value="overlay">Open Modal Overlay</option>
                  <option value="url">External URL Link</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* INSPECT / CODE GENERATOR TAB */}
        {activeTab === 'inspect' && (
          <div>
            <div className="inspector-section">
              <div className="section-title">Design-to-Code Transpiler</div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {['react', 'tailwind', 'css'].map(t => (
                  <button
                    key={t}
                    className={`tab-btn ${codeType === t ? 'active' : ''}`}
                    onClick={() => setCodeType(t)}
                    style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Code Snippet Box */}
              {(() => {
                const codeStr =
                  codeType === 'react'
                    ? CodeGenerator.generateReact(elem)
                    : codeType === 'tailwind'
                    ? CodeGenerator.generateTailwind(elem)
                    : CodeGenerator.generateCSS(elem);

                return (
                  <div>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <pre
                        style={{
                          background: '#0a0c10',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '8px',
                          padding: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          color: '#38bdf8',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          maxHeight: '260px',
                          overflowY: 'auto'
                        }}
                      >
                        {codeStr}
                      </pre>
                    </div>

                    <button
                      className="nav-btn primary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => copyCode(codeStr)}
                    >
                      {copied ? <Check width={14} height={14} /> : <Copy width={14} height={14} />}
                      <span>{copied ? 'Copied Code!' : 'Copy Code Snippet'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
