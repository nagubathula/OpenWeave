'use client';

import { useEffect, useRef, useState } from 'react';
import HeaderNav from './HeaderNav';
import Toolbar from './Toolbar';
import InspectorPanel from './InspectorPanel';
import LayersPanel from './LayersPanel';
import ComponentLibrary from './ComponentLibrary';
import AIPromptBar from './AIPromptBar';
import PrototypeModal from './PrototypeModal';

import { CanvasState } from '../lib/engine/CanvasState';
import { CanvasRenderer } from '../lib/engine/CanvasRenderer';
import { InteractionHandler } from '../lib/engine/InteractionHandler';
import { Templates } from '../lib/utils/templates';

export default function PencilDrawWorkspace() {
  const canvasRef = useRef(null);
  const [engine, setEngine] = useState(null);
  const [activeTab, setActiveTab] = useState('layers');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isPrototypeOpen, setIsPrototypeOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('✨ OpenPencil AI Design Editor Ready (Press Ctrl+K for AI Prompt)');

  useEffect(() => {
    if (!canvasRef.current) return;

    const state = new CanvasState();
    const renderer = new CanvasRenderer(canvasRef.current, state);
    const interaction = new InteractionHandler(canvasRef.current, state, renderer);

    Templates.loadWireframeTemplate(state);
    renderer.render();

    setEngine({ state, renderer, interaction });

    const handleF5 = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        setIsPrototypeOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleF5);

    return () => {
      window.removeEventListener('keydown', handleF5);
    };
  }, []);

  const handleSaveApi = async () => {
    if (!engine) return;
    try {
      const response = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: engine.state.projectName,
          elements: engine.state.elements
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('✅ Saved canvas to Next.js API Route!');
      }
    } catch (err) {
      showToast('❌ Failed to save canvas API');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  return (
    <div id="app-workspace">
      {/* Top Header */}
      {engine && (
        <HeaderNav
          state={engine.state}
          renderer={engine.renderer}
          onSaveApi={handleSaveApi}
          onOpenAI={() => setIsAIOpen(true)}
          onOpenPrototype={() => setIsPrototypeOpen(true)}
        />
      )}

      {/* Main Workspace Layout */}
      <div className="workspace-body">
        {/* Left Sidebar */}
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-tabs">
            <button
              className={`tab-btn ${activeTab === 'layers' && !sidebarCollapsed ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'layers' && !sidebarCollapsed) setSidebarCollapsed(true);
                else {
                  setActiveTab('layers');
                  setSidebarCollapsed(false);
                }
              }}
            >
              Layers
            </button>
            <button
              className={`tab-btn ${activeTab === 'library' && !sidebarCollapsed ? 'active' : ''}`}
              onClick={() => {
                if (activeTab === 'library' && !sidebarCollapsed) setSidebarCollapsed(true);
                else {
                  setActiveTab('library');
                  setSidebarCollapsed(false);
                }
              }}
            >
              Assets
            </button>
          </div>
          <div className="sidebar-content">
            {activeTab === 'layers' ? (
              <LayersPanel state={engine?.state} renderer={engine?.renderer} />
            ) : (
              <ComponentLibrary state={engine?.state} renderer={engine?.renderer} />
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="canvas-container">
          <canvas ref={canvasRef} className="main-canvas" />
          <div id="canvas-overlay" className="canvas-overlay" />
        </main>

        {/* Right Sidebar Inspector (Triple Tab: Design, Prototype, Inspect) */}
        <aside className="sidebar right-sidebar">
          <InspectorPanel state={engine?.state} renderer={engine?.renderer} />
        </aside>
      </div>

      {/* Floating Toolbar */}
      {engine && <Toolbar state={engine.state} />}

      {/* OpenPencil AI Assistant Prompt Modal */}
      {engine && (
        <AIPromptBar
          state={engine.state}
          renderer={engine.renderer}
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
        />
      )}

      {/* Fullscreen Prototype Player Modal */}
      {engine && (
        <PrototypeModal
          state={engine.state}
          isOpen={isPrototypeOpen}
          onClose={() => setIsPrototypeOpen(false)}
        />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div id="toast-container">
          <div className="toast">
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
