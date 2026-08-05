/**
 * PencilDraw - Main Application Entry Point
 */

import { CanvasState } from './engine/CanvasState.js';
import { CanvasRenderer } from './engine/CanvasRenderer.js';
import { InteractionHandler } from './engine/InteractionHandler.js';
import { Toolbar } from './components/Toolbar.js';
import { HeaderNav } from './components/HeaderNav.js';
import { InspectorPanel } from './components/InspectorPanel.js';
import { LayersPanel } from './components/LayersPanel.js';
import { ComponentLibrary } from './components/ComponentLibrary.js';
import { Templates } from './utils/templates.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('main-canvas');
  if (!canvas) return;

  // Initialize Core Engines
  const state = new CanvasState();
  const renderer = new CanvasRenderer(canvas, state);
  const interaction = new InteractionHandler(canvas, state, renderer);

  // Initialize UI Components
  const header = new HeaderNav(document.getElementById('header-nav'), state, renderer);
  const toolbar = new Toolbar(document.getElementById('floating-toolbar'), state);
  const inspector = new InspectorPanel(document.getElementById('inspector-panel'), state, renderer);
  const layers = new LayersPanel(document.getElementById('layers-panel'), state, renderer);
  const library = new ComponentLibrary(document.getElementById('library-panel'), state, renderer);

  // Sidebar Tab Switching (Layers vs UI Stencils)
  const tabBtns = document.querySelectorAll('.tab-btn');
  const sidebar = document.getElementById('left-sidebar');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      if (btn.classList.contains('active') && !sidebar.classList.contains('collapsed')) {
        sidebar.classList.add('collapsed');
        btn.classList.remove('active');
        return;
      }

      sidebar.classList.remove('collapsed');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      document.getElementById(`${tabName}-panel`)?.classList.add('active');
    });
  });

  // Load initial starter template
  Templates.loadWireframeTemplate(state);
  renderer.render();

  // Initial toast notification
  showToast('✨ PencilDraw Ready: OpenPencil x tldraw Hybrid Workspace');
});

function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    if (container.contains(toast)) container.removeChild(toast);
  }, 4000);
}
