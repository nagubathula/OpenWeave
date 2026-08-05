/**
 * PencilDraw - Inspector Property Panel Component
 */

export class InspectorPanel {
  constructor(container, state, renderer) {
    this.container = container;
    this.state = state;
    this.renderer = renderer;

    this.state.subscribe(() => this.render());
    this.render();
  }

  render() {
    const selected = this.state.getSelectedElements();

    if (selected.length === 0) {
      this.renderCanvasInspector();
    } else if (selected.length === 1) {
      this.renderSingleElementInspector(selected[0]);
    } else {
      this.renderMultiElementInspector(selected);
    }
  }

  renderCanvasInspector() {
    this.container.innerHTML = `
      <div class="inspector-section">
        <div class="section-title">Canvas Settings</div>
        <div class="property-grid">
          <div class="property-field">
            <label>Grid Mode</label>
            <select id="insp-grid-type" class="input-with-unit" style="background: var(--panel-glass); color: var(--text-main); border: 1px solid var(--panel-border); padding: 6px; border-radius: 6px;">
              <option value="dots" ${this.state.gridType === 'dots' ? 'selected' : ''}>Dots</option>
              <option value="lines" ${this.state.gridType === 'lines' ? 'selected' : ''}>Lines</option>
              <option value="none" ${this.state.gridType === 'none' ? 'selected' : ''}>None</option>
            </select>
          </div>
          <div class="property-field">
            <label>Grid Size</label>
            <div class="input-with-unit">
              <input type="number" id="insp-grid-size" value="${this.state.gridSize}" min="10" max="100" />
            </div>
          </div>
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-title">Canvas Statistics</div>
        <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">
          <div>Total Elements: <strong style="color: var(--text-main);">${this.state.elements.length}</strong></div>
          <div>Zoom Level: <strong style="color: var(--text-main);">${Math.round(this.state.zoom * 100)}%</strong></div>
          <div>Pan Position: <strong style="color: var(--text-main);">${Math.round(this.state.pan.x)}, ${Math.round(this.state.pan.y)}</strong></div>
        </div>
      </div>

      <div class="inspector-section">
        <div class="section-title">Quick Actions</div>
        <button id="btn-select-all" class="nav-btn" style="width: 100%; justify-content: center; margin-bottom: 6px;">Select All (Ctrl+A)</button>
        <button id="btn-clear-canvas" class="nav-btn" style="width: 100%; justify-content: center; color: #ef4444;">Clear Workspace</button>
      </div>
    `;

    this.bindCanvasEvents();
  }

  bindCanvasEvents() {
    document.getElementById('insp-grid-type')?.addEventListener('change', e => {
      this.state.gridType = e.target.value;
      this.renderer.render();
    });

    document.getElementById('insp-grid-size')?.addEventListener('input', e => {
      this.state.gridSize = parseInt(e.target.value) || 20;
      this.renderer.render();
    });

    document.getElementById('btn-select-all')?.addEventListener('click', () => {
      this.state.elements.forEach(e => this.state.selectedIds.add(e.id));
      this.state.notify();
    });

    document.getElementById('btn-clear-canvas')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        this.state.elements = [];
        this.state.selectedIds.clear();
        this.state.saveState();
        this.state.notify();
      }
    });
  }

  renderSingleElementInspector(elem) {
    const s = elem.style || {};

    this.container.innerHTML = `
      <!-- Alignment Toolbar -->
      <div class="inspector-section">
        <div class="section-title">Alignment</div>
        <div class="align-group">
          <button class="align-btn" id="align-left" title="Align Left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="4" y1="4" y2="20"/><rect width="10" height="6" x="8" y="6" rx="1"/><rect width="6" height="6" x="8" y="14" rx="1"/></svg></button>
          <button class="align-btn" id="align-center" title="Align Center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="4" y2="20"/><rect width="12" height="6" x="6" y="6" rx="1"/><rect width="8" height="6" x="8" y="14" rx="1"/></svg></button>
          <button class="align-btn" id="align-right" title="Align Right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="20" x2="20" y1="4" y2="20"/><rect width="10" height="6" x="6" y="6" rx="1"/><rect width="6" height="6" x="10" y="14" rx="1"/></svg></button>
          <button class="align-btn" id="align-top" title="Align Top"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="4" y2="4"/><rect width="6" height="10" x="6" y="8" rx="1"/><rect width="6" height="6" x="14" y="8" rx="1"/></svg></button>
          <button class="align-btn" id="align-middle" title="Align Middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="12" y2="12"/><rect width="6" height="12" x="6" y="6" rx="1"/><rect width="6" height="8" x="14" y="8" rx="1"/></svg></button>
          <button class="align-btn" id="align-bottom" title="Align Bottom"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="20" y1="20" y2="20"/><rect width="6" height="10" x="6" y="6" rx="1"/><rect width="6" height="6" x="14" y="10" rx="1"/></svg></button>
        </div>
      </div>

      <!-- Transform Position & Size -->
      <div class="inspector-section">
        <div class="section-title">Transform</div>
        <div class="property-grid">
          <div class="property-field">
            <label>X Position</label>
            <div class="input-with-unit"><input type="number" id="prop-x" value="${Math.round(elem.x)}" /></div>
          </div>
          <div class="property-field">
            <label>Y Position</label>
            <div class="input-with-unit"><input type="number" id="prop-y" value="${Math.round(elem.y)}" /></div>
          </div>
          <div class="property-field">
            <label>Width</label>
            <div class="input-with-unit"><input type="number" id="prop-w" value="${Math.round(elem.width)}" /></div>
          </div>
          <div class="property-field">
            <label>Height</label>
            <div class="input-with-unit"><input type="number" id="prop-h" value="${Math.round(elem.height)}" /></div>
          </div>
          <div class="property-field">
            <label>Rotation (°)</label>
            <div class="input-with-unit"><input type="number" id="prop-rot" value="${Math.round(elem.rotation || 0)}" /></div>
          </div>
          <div class="property-field">
            <label>Corner Radius</label>
            <div class="input-with-unit"><input type="number" id="prop-radius" value="${s.cornerRadius || 0}" /></div>
          </div>
        </div>
      </div>

      <!-- Fill & Colors -->
      <div class="inspector-section">
        <div class="section-title">Fill & Colors</div>
        <div class="color-picker-row">
          <input type="color" id="prop-fill" class="color-swatch-input" value="${s.fill || '#1e293b'}" />
          <input type="text" class="input-with-unit" id="prop-fill-hex" value="${s.fill || '#1e293b'}" style="flex:1;" />
        </div>
        <div class="preset-swatches">
          <div class="swatch-item" style="background:#6366f1;" data-color="#6366f1"></div>
          <div class="swatch-item" style="background:#ec4899;" data-color="#ec4899"></div>
          <div class="swatch-item" style="background:#10b981;" data-color="#10b981"></div>
          <div class="swatch-item" style="background:#f59e0b;" data-color="#f59e0b"></div>
          <div class="swatch-item" style="background:#3b82f6;" data-color="#3b82f6"></div>
          <div class="swatch-item" style="background:#1e293b;" data-color="#1e293b"></div>
          <div class="swatch-item" style="background:#fef08a;" data-color="#fef08a"></div>
        </div>
      </div>

      <!-- Stroke -->
      <div class="inspector-section">
        <div class="section-title">Stroke</div>
        <div class="color-picker-row" style="margin-bottom: 8px;">
          <input type="color" id="prop-stroke" class="color-swatch-input" value="${s.stroke || '#6366f1'}" />
          <input type="text" class="input-with-unit" id="prop-stroke-hex" value="${s.stroke || '#6366f1'}" style="flex:1;" />
        </div>
        <div class="property-field">
          <label>Stroke Width</label>
          <div class="input-with-unit"><input type="number" id="prop-stroke-width" value="${s.strokeWidth || 2}" min="0" max="20" /></div>
        </div>
      </div>

      <!-- Typography -->
      <div class="inspector-section">
        <div class="section-title">Text Properties</div>
        <div class="property-field" style="margin-bottom: 8px;">
          <label>Content</label>
          <input type="text" id="prop-text" class="input-with-unit" value="${elem.text || ''}" placeholder="Enter text..." />
        </div>
        <div class="property-grid">
          <div class="property-field">
            <label>Font Size</label>
            <div class="input-with-unit"><input type="number" id="prop-font-size" value="${s.fontSize || 16}" /></div>
          </div>
          <div class="property-field">
            <label>Font Family</label>
            <select id="prop-font-family" style="background: var(--panel-glass); color: var(--text-main); border: 1px solid var(--panel-border); padding: 6px; border-radius: 6px;">
              <option value="Inter" ${s.fontFamily === 'Inter' ? 'selected' : ''}>Inter</option>
              <option value="Outfit" ${s.fontFamily === 'Outfit' ? 'selected' : ''}>Outfit</option>
              <option value="Caveat" ${s.fontFamily === 'Caveat' ? 'selected' : ''}>Caveat</option>
              <option value="Fira Code" ${s.fontFamily === 'Fira Code' ? 'selected' : ''}>Fira Code</option>
            </select>
          </div>
        </div>
      </div>
    `;

    this.bindElementEvents(elem);
  }

  renderMultiElementInspector(selected) {
    this.container.innerHTML = `
      <div class="inspector-section">
        <div class="section-title">${selected.length} Elements Selected</div>
        <div class="align-group" style="margin-bottom: 12px;">
          <button class="align-btn" id="align-left" title="Align Left"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="4" y1="4" y2="20"/><rect width="10" height="6" x="8" y="6" rx="1"/><rect width="6" height="6" x="8" y="14" rx="1"/></svg></button>
          <button class="align-btn" id="align-center" title="Align Center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" x2="12" y1="4" y2="20"/><rect width="12" height="6" x="6" y="6" rx="1"/><rect width="8" height="6" x="8" y="14" rx="1"/></svg></button>
          <button class="align-btn" id="align-right" title="Align Right"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="20" x2="20" y1="4" y2="20"/><rect width="10" height="6" x="6" y="6" rx="1"/><rect width="6" height="6" x="10" y="14" rx="1"/></svg></button>
        </div>
        <button id="btn-group" class="nav-btn" style="width: 100%; justify-content: center; margin-bottom: 6px;">Group Elements (Ctrl+G)</button>
        <button id="btn-delete-multi" class="nav-btn" style="width: 100%; justify-content: center; color: #ef4444;">Delete Selected</button>
      </div>
    `;

    document.getElementById('btn-group')?.addEventListener('click', () => this.state.groupSelected());
    document.getElementById('btn-delete-multi')?.addEventListener('click', () => this.state.deleteSelected());
  }

  bindElementEvents(elem) {
    const update = (props) => {
      this.state.updateElement(elem.id, props);
      this.renderer.render();
    };

    document.getElementById('prop-x')?.addEventListener('input', e => update({ x: parseFloat(e.target.value) || 0 }));
    document.getElementById('prop-y')?.addEventListener('input', e => update({ y: parseFloat(e.target.value) || 0 }));
    document.getElementById('prop-w')?.addEventListener('input', e => update({ width: parseFloat(e.target.value) || 10 }));
    document.getElementById('prop-h')?.addEventListener('input', e => update({ height: parseFloat(e.target.value) || 10 }));
    document.getElementById('prop-rot')?.addEventListener('input', e => update({ rotation: parseFloat(e.target.value) || 0 }));
    document.getElementById('prop-text')?.addEventListener('input', e => update({ text: e.target.value }));

    // Color Swatch pickers
    document.getElementById('prop-fill')?.addEventListener('input', e => {
      update({ style: { fill: e.target.value } });
    });

    document.getElementById('prop-stroke')?.addEventListener('input', e => {
      update({ style: { stroke: e.target.value } });
    });

    document.querySelectorAll('.swatch-item').forEach(sw => {
      sw.addEventListener('click', () => {
        const color = sw.dataset.color;
        update({ style: { fill: color } });
      });
    });
  }
}
