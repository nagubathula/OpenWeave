/**
 * PencilDraw - OpenPencil UI Stencil Library Component
 */

export class ComponentLibrary {
  constructor(container, state, renderer) {
    this.container = container;
    this.state = state;
    this.renderer = renderer;

    this.stencils = [
      { id: 'btn_primary', name: 'Primary Button', subType: 'button', label: 'Submit Order', width: 140, height: 42, icon: '<rect x="3" y="6" width="18" height="12" rx="3" fill="#6366f1"/>' },
      { id: 'input_search', name: 'Search Input', subType: 'input', label: 'Search products...', width: 220, height: 40, icon: '<rect x="3" y="6" width="18" height="12" rx="2" stroke="#64748b" fill="none"/>' },
      { id: 'toggle_switch', name: 'Toggle Switch', subType: 'toggle', label: 'Enable Setting', width: 50, height: 26, icon: '<rect x="2" y="6" width="20" height="12" rx="6" fill="#10b981"/>' },
      { id: 'range_slider', name: 'Range Slider', subType: 'slider', value: 70, width: 180, height: 24, icon: '<line x1="3" y1="12" x2="21" y2="12" stroke="#6366f1" stroke-width="3"/><circle cx="15" cy="12" r="4" fill="#fff"/>' },
      { id: 'card_widget', name: 'UI Card', subType: 'card', label: 'Analytics Overview', width: 240, height: 160, icon: '<rect x="3" y="3" width="18" height="18" rx="3" fill="#1e293b"/>' },
      { id: 'user_avatar', name: 'User Avatar', subType: 'avatar', width: 64, height: 64, icon: '<circle cx="12" cy="12" r="9" fill="#475569"/>' },
      { id: 'app_navbar', name: 'App Header Bar', subType: 'navbar', label: 'OpenPencil App', width: 360, height: 50, icon: '<rect x="2" y="5" width="20" height="14" fill="#0f172a"/>' }
    ];

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px;">
        UI Component Stencils
      </div>
      <div class="stencil-grid" id="stencils-list"></div>
    `;

    const grid = document.getElementById('stencils-list');
    if (!grid) return;

    this.stencils.forEach(st => {
      const card = document.createElement('div');
      card.className = 'stencil-card';
      card.innerHTML = `
        <div class="stencil-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            ${st.icon}
          </svg>
        </div>
        <div class="stencil-name">${st.name}</div>
      `;

      card.addEventListener('click', () => {
        // Spawn stencil at center of canvas view
        const centerCanvas = this.state.screenToCanvas(
          window.innerWidth / 2 - 100,
          window.innerHeight / 2 - 50
        );

        const newComp = this.state.addElement({
          type: 'component',
          subType: st.subType,
          name: st.name,
          x: centerCanvas.x,
          y: centerCanvas.y,
          width: st.width,
          height: st.height,
          label: st.label,
          value: st.value
        });

        this.state.select(newComp.id);
        this.renderer.render();
      });

      grid.appendChild(card);
    });
  }
}
