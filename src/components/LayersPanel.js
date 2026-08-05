/**
 * PencilDraw - Layers Hierarchy Panel Component
 */

export class LayersPanel {
  constructor(container, state, renderer) {
    this.container = container;
    this.state = state;
    this.renderer = renderer;

    this.state.subscribe(() => this.render());
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted);">Layers Tree</span>
        <div style="display: flex; gap: 4px;">
          <button class="icon-btn-tiny" id="btn-bring-fwd" title="Bring Forward"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button class="icon-btn-tiny" id="btn-send-bwd" title="Send Backward"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></button>
        </div>
      </div>
      <div class="layer-tree" id="layer-items-list"></div>
    `;

    const listEl = document.getElementById('layer-items-list');
    if (!listEl) return;

    if (this.state.elements.length === 0) {
      listEl.innerHTML = `<div style="font-size: 0.78rem; color: var(--text-dim); text-align: center; padding: 20px 0;">No elements on canvas</div>`;
      return;
    }

    // Display in reverse order (topmost z-index on top of tree)
    [...this.state.elements].reverse().forEach(elem => {
      const isSelected = this.state.selectedIds.has(elem.id);

      const item = document.createElement('div');
      item.className = `layer-item ${isSelected ? 'selected' : ''}`;
      item.innerHTML = `
        <div class="layer-info">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${this.getLayerIcon(elem.type)}
          </svg>
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${elem.name}</span>
        </div>
        <div class="layer-actions">
          <button class="icon-btn-tiny toggle-lock" data-id="${elem.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${elem.locked ? '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' : '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'}
            </svg>
          </button>
          <button class="icon-btn-tiny toggle-visible" data-id="${elem.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${elem.visible ? '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>' : '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>'}
            </svg>
          </button>
        </div>
      `;

      item.addEventListener('click', e => {
        if (!e.target.closest('.layer-actions')) {
          this.state.select(elem.id, e.shiftKey);
          this.renderer.render();
        }
      });

      listEl.appendChild(item);
    });

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-bring-fwd')?.addEventListener('click', () => {
      this.state.bringForward();
      this.renderer.render();
    });

    document.getElementById('btn-send-bwd')?.addEventListener('click', () => {
      this.state.sendBackward();
      this.renderer.render();
    });

    document.querySelectorAll('.toggle-lock').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = btn.dataset.id;
        const elem = this.state.elements.find(el => el.id === id);
        if (elem) {
          this.state.updateElement(id, { locked: !elem.locked });
          this.renderer.render();
        }
      });
    });

    document.querySelectorAll('.toggle-visible').forEach(btn => {
      btn.addEventListener('click', e => {
        const id = btn.dataset.id;
        const elem = this.state.elements.find(el => el.id === id);
        if (elem) {
          this.state.updateElement(id, { visible: !elem.visible });
          this.renderer.render();
        }
      });
    });
  }

  getLayerIcon(type) {
    switch (type) {
      case 'rectangle': return '<rect width="18" height="18" x="3" y="3" rx="2"/>';
      case 'ellipse': return '<circle cx="12" cy="12" r="9"/>';
      case 'pencil': return '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>';
      case 'note': return '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/>';
      case 'text': return '<polyline points="4 7 4 4 20 4 20 7"/><line x1="12" x2="12" y1="4" y2="20"/>';
      case 'frame': return '<rect width="14" height="18" x="5" y="3" rx="2"/>';
      case 'component': return '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>';
      default: return '<rect width="18" height="18" x="3" y="3" rx="2"/>';
    }
  }
}
