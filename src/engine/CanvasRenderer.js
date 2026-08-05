/**
 * PencilDraw - Canvas Rendering Engine
 * Handles rendering grid, vector shapes, UI components, pencil paths, sticky notes, connectors, and bounding box controls.
 */

export class CanvasRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dpr = window.devicePixelRatio || 1;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.width = parent.clientWidth;
    this.height = parent.clientHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.render();
  }

  render() {
    const { ctx, width, height, dpr } = this;
    const { zoom, pan, gridType, gridSize, elements, selectedIds } = this.state;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear Canvas
    ctx.fillStyle = '#161822';
    ctx.fillRect(0, 0, width, height);

    // Render Grid Background
    this.renderGrid(ctx, width, height, zoom, pan, gridType, gridSize);

    // Apply Viewport Transform (Pan & Zoom)
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Render All Elements in z-order
    elements.forEach(elem => {
      if (!elem.visible) return;
      ctx.save();
      this.renderElement(ctx, elem);
      ctx.restore();
    });

    // Render Selection Handles & Bounding Box
    if (selectedIds.size > 0) {
      this.renderSelectionBounds(ctx, selectedIds, elements);
    }

    ctx.restore(); // Restore Viewport transform
    ctx.restore(); // Restore DPR scale
  }

  renderGrid(ctx, width, height, zoom, pan, gridType, gridSize) {
    if (gridType === 'none') return;

    const scaledGridSize = gridSize * zoom;
    const startX = pan.x % scaledGridSize;
    const startY = pan.y % scaledGridSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    if (gridType === 'dots') {
      for (let x = startX; x < width; x += scaledGridSize) {
        for (let y = startY; y < height; y += scaledGridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1 * Math.min(1.5, Math.max(0.5, zoom)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridType === 'lines') {
      ctx.beginPath();
      for (let x = startX; x < width; x += scaledGridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += scaledGridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
  }

  renderElement(ctx, elem) {
    const { type, x, y, width, height, rotation, style = {} } = elem;

    // Apply Rotation around element center
    if (rotation) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Set Common Canvas Styles
    ctx.globalAlpha = style.opacity !== undefined ? style.opacity : 1;
    ctx.fillStyle = style.fill || '#1e293b';
    ctx.strokeStyle = style.stroke || '#6366f1';
    ctx.lineWidth = style.strokeWidth !== undefined ? style.strokeWidth : 2;

    if (style.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
    } else {
      ctx.shadowColor = 'transparent';
    }

    switch (type) {
      case 'rectangle':
        this.renderRectangle(ctx, elem);
        break;

      case 'ellipse':
        this.renderEllipse(ctx, elem);
        break;

      case 'diamond':
        this.renderDiamond(ctx, elem);
        break;

      case 'pencil':
        this.renderPencilPath(ctx, elem);
        break;

      case 'note':
        this.renderStickyNote(ctx, elem);
        break;

      case 'arrow':
      case 'connector':
        this.renderConnector(ctx, elem);
        break;

      case 'text':
        this.renderText(ctx, elem);
        break;

      case 'frame':
        this.renderArtboardFrame(ctx, elem);
        break;

      case 'component':
        this.renderUIComponent(ctx, elem);
        break;

      default:
        this.renderRectangle(ctx, elem);
        break;
    }
  }

  renderRectangle(ctx, elem) {
    const { x, y, width, height, style } = elem;
    const radius = style.cornerRadius || 0;

    ctx.beginPath();
    if (radius > 0 && ctx.roundRect) {
      ctx.roundRect(x, y, width, height, radius);
    } else {
      ctx.rect(x, y, width, height);
    }

    if (style.fill && style.fill !== 'transparent') ctx.fill();
    if (style.stroke && style.strokeWidth > 0) ctx.stroke();

    if (elem.text) {
      this.renderCenteredText(ctx, elem.text, x, y, width, height, style);
    }
  }

  renderEllipse(ctx, elem) {
    const { x, y, width, height, style } = elem;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = Math.max(0, width / 2);
    const ry = Math.max(0, height / 2);

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);

    if (style.fill && style.fill !== 'transparent') ctx.fill();
    if (style.stroke && style.strokeWidth > 0) ctx.stroke();

    if (elem.text) {
      this.renderCenteredText(ctx, elem.text, x, y, width, height, style);
    }
  }

  renderDiamond(ctx, elem) {
    const { x, y, width, height, style } = elem;
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(cx, y + height);
    ctx.lineTo(x, cy);
    ctx.closePath();

    if (style.fill && style.fill !== 'transparent') ctx.fill();
    if (style.stroke && style.strokeWidth > 0) ctx.stroke();

    if (elem.text) {
      this.renderCenteredText(ctx, elem.text, x, y, width, height, style);
    }
  }

  renderPencilPath(ctx, elem) {
    const { points = [], style } = elem;
    if (points.length < 2) return;

    ctx.strokeStyle = style.stroke || '#6366f1';
    ctx.lineWidth = style.strokeWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  }

  renderStickyNote(ctx, elem) {
    const { x, y, width, height, style, text } = elem;
    const foldSize = 20;

    ctx.fillStyle = style.stickyBg || '#fef08a';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Body with Dog-Eared Folded Corner
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - foldSize, y);
    ctx.lineTo(x + width, y + foldSize);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    // Dog-Ear Fold Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + width - foldSize, y);
    ctx.lineTo(x + width - foldSize, y + foldSize);
    ctx.lineTo(x + width, y + foldSize);
    ctx.closePath();
    ctx.fill();

    // Sticky Note Text
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = style.textColor || '#1e293b';
    ctx.font = `600 ${style.fontSize || 18}px 'Caveat', cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = (text || 'Double click to edit').split(' ');
    let line = '';
    const lines = [];
    const maxW = width - 24;

    words.forEach(w => {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line !== '') {
        lines.push(line);
        line = w + ' ';
      } else {
        line = test;
      }
    });
    lines.push(line);

    const lineHeight = (style.fontSize || 18) * 1.2;
    const startY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((l, i) => {
      ctx.fillText(l.trim(), x + width / 2, startY + i * lineHeight);
    });
  }

  renderConnector(ctx, elem) {
    const { start, end, style, text } = elem;
    if (!start || !end) return;

    ctx.strokeStyle = style.stroke || '#6366f1';
    ctx.lineWidth = style.strokeWidth || 2;
    ctx.fillStyle = style.stroke || '#6366f1';

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    // Elbow orthogonal connection if distance is large
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const midX = start.x + dx / 2;

    ctx.lineTo(midX, start.y);
    ctx.lineTo(midX, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw Arrowhead at End
    const angle = Math.atan2(end.y - start.y, end.x - midX);
    const headLen = 10;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    if (text) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, midX, (start.y + end.y) / 2 - 8);
    }
  }

  renderText(ctx, elem) {
    const { x, y, width, height, text, style } = elem;
    ctx.fillStyle = style.textColor || '#f8fafc';
    ctx.font = `${style.fontWeight || 500} ${style.fontSize || 16}px ${style.fontFamily || 'Inter'}, sans-serif`;
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = 'top';

    const textX = style.textAlign === 'center' ? x + width / 2 : style.textAlign === 'right' ? x + width : x;
    ctx.fillText(text || 'Type text here...', textX, y + 4);
  }

  renderArtboardFrame(ctx, elem) {
    const { x, y, width, height, name = 'Frame' } = elem;

    // Frame Header Label
    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, x, y - 6);

    // Frame Canvas Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }

  renderUIComponent(ctx, elem) {
    const { subType, x, y, width, height, style, label } = elem;

    ctx.save();
    switch (subType) {
      case 'button':
        this.renderUIButton(ctx, x, y, width, height, label || 'Click Me', style);
        break;
      case 'input':
        this.renderUIInput(ctx, x, y, width, height, label || 'Search or type...', style);
        break;
      case 'toggle':
        this.renderUIToggle(ctx, x, y, width, height, elem.checked !== false);
        break;
      case 'slider':
        this.renderUISlider(ctx, x, y, width, height, elem.value || 65);
        break;
      case 'card':
        this.renderUICard(ctx, x, y, width, height, label || 'Card Title', style);
        break;
      case 'avatar':
        this.renderUIAvatar(ctx, x, y, width, height);
        break;
      case 'navbar':
        this.renderUINavbar(ctx, x, y, width, height, label || 'App Header');
        break;
      default:
        this.renderUIButton(ctx, x, y, width, height, label || 'Component', style);
        break;
    }
    ctx.restore();
  }

  // Individual UI Stencil Component Renderers
  renderUIButton(ctx, x, y, w, h, label, style) {
    ctx.fillStyle = style.fill || '#6366f1';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, style.cornerRadius || 8);
    else ctx.rect(x, y, w, h);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  renderUIInput(ctx, x, y, w, h, placeholder, style) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
    else ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(placeholder, x + 12, y + h / 2);
  }

  renderUIToggle(ctx, x, y, w, h, checked) {
    const radius = h / 2;
    ctx.fillStyle = checked ? '#10b981' : '#334155';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, radius);
    else ctx.rect(x, y, w, h);
    ctx.fill();

    // Knob
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const knobX = checked ? x + w - radius : x + radius;
    ctx.arc(knobX, y + radius, radius - 3, 0, Math.PI * 2);
    ctx.fill();
  }

  renderUISlider(ctx, x, y, w, h, value) {
    const trackH = 6;
    const trackY = y + h / 2 - trackH / 2;

    // Track Background
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, trackY, w, trackH, 3);
    ctx.fill();

    // Filled Track
    const fillW = (w * value) / 100;
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, trackY, fillW, trackH, 3);
    ctx.fill();

    // Thumb Knob
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + fillW, y + h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  renderUICard(ctx, x, y, w, h, title) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();

    // Card Header Banner Placeholder
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, 44, [12, 12, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 16, y + 22);

    // Card Placeholder Text lines
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x + 16, y + 60, w - 32, 10);
    ctx.fillRect(x + 16, y + 78, w * 0.6, 10);
  }

  renderUIAvatar(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r = Math.min(w, h) / 2;

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Head & Shoulders Icon
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.2, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.7, r * 0.6, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  renderUINavbar(ctx, x, y, w, h, title) {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Brand Logo
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.arc(x + 24, y + h / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 15px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, x + 44, y + h / 2);

    // Nav Links Placeholders
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Dashboard', x + w - 210, y + h / 2);
    ctx.fillText('Settings', x + w - 120, y + h / 2);
  }

  renderCenteredText(ctx, text, x, y, w, h, style) {
    ctx.fillStyle = style.textColor || '#ffffff';
    ctx.font = `${style.fontWeight || 500} ${style.fontSize || 14}px ${style.fontFamily || 'Inter'}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

  // Selection Bounding Box & Handles
  renderSelectionBounds(ctx, selectedIds, elements) {
    const selected = elements.filter(e => selectedIds.has(e.id));
    if (selected.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    selected.forEach(e => {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + e.width);
      maxY = Math.max(maxY, e.y + e.height);
    });

    const padding = 4;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Bounding Box Outline
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(minX, minY, width, height);

    // Dimension Label
    ctx.fillStyle = '#6366f1';
    ctx.font = '600 11px Fira Code, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.round(width)} × ${Math.round(height)}`, minX + width / 2, maxY + 8);

    // 8 Resize Handles
    const handleSize = 8;
    const handles = [
      { x: minX, y: minY }, // NW
      { x: minX + width / 2, y: minY }, // N
      { x: maxX, y: minY }, // NE
      { x: maxX, y: minY + height / 2 }, // E
      { x: maxX, y: maxY }, // SE
      { x: minX + width / 2, y: maxY }, // S
      { x: minX, y: maxY }, // SW
      { x: minX, y: minY + height / 2 } // W
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;

    handles.forEach(h => {
      ctx.beginPath();
      ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });

    // Rotation Handle Line & Knob
    const rotX = minX + width / 2;
    const rotY = minY - 24;
    ctx.beginPath();
    ctx.moveTo(rotX, minY);
    ctx.lineTo(rotX, rotY);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotX, rotY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
