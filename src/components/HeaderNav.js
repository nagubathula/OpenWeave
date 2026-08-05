/**
 * PencilDraw - Header Navigation Bar Component
 */

import { Exporter } from '../utils/exporter.js';
import { Templates } from '../utils/templates.js';

export class HeaderNav {
  constructor(container, state, renderer) {
    this.container = container;
    this.state = state;
    this.renderer = renderer;

    this.state.subscribe(() => this.updateZoomLabel());
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="brand-section">
        <div class="brand-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
        </div>
        <div class="brand-title">
          PencilDraw
          <span class="brand-badge">Hybrid</span>
        </div>
        <input type="text" class="project-name-input" value="${this.state.projectName}" id="project-name" />
      </div>

      <div class="nav-actions">
        <!-- Grid Style Switcher -->
        <button class="nav-btn" id="btn-grid-toggle" title="Toggle Grid Mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
          <span id="grid-mode-label">Grid: Dots</span>
        </button>

        <!-- Zoom Level Controls -->
        <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
          <button class="icon-btn-tiny" id="btn-zoom-out" title="Zoom Out (-)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" x2="19" y1="12" y2="12"/></svg>
          </button>
          <span id="zoom-percentage" style="font-family: var(--font-mono); font-size: 0.75rem; min-width: 45px; text-align: center;">100%</span>
          <button class="icon-btn-tiny" id="btn-zoom-in" title="Zoom In (+)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          </button>
          <button class="icon-btn-tiny" id="btn-zoom-reset" title="Reset Zoom (100%)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>

        <!-- Templates Dropdown -->
        <button class="nav-btn" id="btn-templates">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Z"/><path d="M14 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5Z"/><path d="M4 15a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Z"/><path d="M14 12a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-7Z"/></svg>
          Templates
        </button>

        <!-- Save / Export Menu -->
        <button class="nav-btn" id="btn-export-png">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export PNG
        </button>

        <button class="nav-btn primary" id="btn-export-svg">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          Export SVG
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Project Name change
    const nameInput = document.getElementById('project-name');
    if (nameInput) {
      nameInput.addEventListener('input', e => {
        this.state.projectName = e.target.value;
      });
    }

    // Grid Toggle
    const gridBtn = document.getElementById('btn-grid-toggle');
    const gridLabel = document.getElementById('grid-mode-label');
    if (gridBtn) {
      gridBtn.addEventListener('click', () => {
        const modes = ['dots', 'lines', 'none'];
        const curIdx = modes.indexOf(this.state.gridType);
        this.state.gridType = modes[(curIdx + 1) % modes.length];
        gridLabel.textContent = `Grid: ${this.state.gridType.charAt(0).toUpperCase() + this.state.gridType.slice(1)}`;
        this.renderer.render();
      });
    }

    // Zoom buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.state.setZoom(this.state.zoom * 1.15);
      this.renderer.render();
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.state.setZoom(this.state.zoom * 0.85);
      this.renderer.render();
    });

    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      this.state.setZoom(1);
      this.state.setPan(0, 0);
      this.renderer.render();
    });

    // Exports
    document.getElementById('btn-export-png')?.addEventListener('click', () => {
      Exporter.exportPNG(this.renderer.canvas, this.state.projectName);
    });

    document.getElementById('btn-export-svg')?.addEventListener('click', () => {
      Exporter.exportSVG(this.state);
    });

    // Templates
    document.getElementById('btn-templates')?.addEventListener('click', () => {
      Templates.loadWireframeTemplate(this.state);
      this.renderer.render();
    });
  }

  updateZoomLabel() {
    const lbl = document.getElementById('zoom-percentage');
    if (lbl) {
      lbl.textContent = `${Math.round(this.state.zoom * 100)}%`;
    }
  }
}
