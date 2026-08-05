/**
 * PencilDraw - Floating Dock Toolbar Component
 */

export class Toolbar {
  constructor(container, state) {
    this.container = container;
    this.state = state;

    this.tools = [
      { id: 'select', label: 'Select', key: 'V', icon: '<path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/>' },
      { id: 'hand', label: 'Hand / Pan', key: 'H', icon: '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v6"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 0 1 2 2v4a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>' },
      { id: 'pencil', label: 'Pencil Brush', key: 'P', icon: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>' },
      { id: 'eraser', label: 'Eraser', key: 'E', icon: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/>' },
      { type: 'divider' },
      { id: 'rectangle', label: 'Rectangle', key: 'R', icon: '<rect width="18" height="18" x="3" y="3" rx="2"/>' },
      { id: 'ellipse', label: 'Ellipse', key: 'O', icon: '<circle cx="12" cy="12" r="9"/>' },
      { id: 'diamond', label: 'Diamond', key: 'D', icon: '<path d="M12 2 2 12l10 10 10-10L12 2z"/>' },
      { id: 'arrow', label: 'Arrow Connector', key: 'A', icon: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>' },
      { type: 'divider' },
      { id: 'note', label: 'Sticky Note', key: 'N', icon: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>' },
      { id: 'text', label: 'Text Box', key: 'T', icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/>' },
      { id: 'frame', label: 'Artboard Frame', key: 'F', icon: '<rect width="14" height="18" x="5" y="3" rx="2"/><path d="M12 18h.01"/>' }
    ];

    this.state.subscribe(() => this.render());
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const active = this.state.activeTool;

    this.tools.forEach(tool => {
      if (tool.type === 'divider') {
        const div = document.createElement('div');
        div.className = 'tool-divider';
        this.container.appendChild(div);
        return;
      }

      const btn = document.createElement('button');
      btn.className = `tool-btn ${active === tool.id ? 'active' : ''}`;
      btn.dataset.tooltip = `${tool.label} (${tool.key})`;
      btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${tool.icon}
        </svg>
        <span class="shortcut-badge">${tool.key}</span>
      `;

      btn.addEventListener('click', () => {
        this.state.activeTool = tool.id;
        this.state.notify();
      });

      this.container.appendChild(btn);
    });
  }
}
