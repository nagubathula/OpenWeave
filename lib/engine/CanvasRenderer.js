/**
 * PencilDraw - Canvas Rendering Engine for Next.js
 */

export class CanvasRenderer {
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = state;
    this.dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

    this.resizeCanvas();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resizeCanvas());
    }
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

    ctx.fillStyle = '#161822';
    ctx.fillRect(0, 0, width, height);

    this.renderGrid(ctx, width, height, zoom, pan, gridType, gridSize);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    elements.forEach(elem => {
      if (!elem.visible) return;
      ctx.save();
      this.renderElement(ctx, elem);
      ctx.restore();
    });

    if (selectedIds.size > 0) {
      this.renderSelectionBounds(ctx, selectedIds, elements);
    }

    ctx.restore();
    ctx.restore();
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

    if (rotation) {
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.globalAlpha = style.opacity !== undefined ? style.opacity : 1;
    ctx.fillStyle = style.fill || '#1e293b';
    ctx.strokeStyle = style.stroke || '#6366f1';
    ctx.lineWidth = style.strokeWidth !== undefined ? style.strokeWidth : 2;

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

    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(0, width / 2), Math.max(0, height / 2), 0, 0, Math.PI * 2);

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
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width - foldSize, y);
    ctx.lineTo(x + width, y + foldSize);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + width - foldSize, y);
    ctx.lineTo(x + width - foldSize, y + foldSize);
    ctx.lineTo(x + width, y + foldSize);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = style.textColor || '#1e293b';
    ctx.font = `600 ${style.fontSize || 18}px var(--font-caveat), cursive`;
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
    const midX = start.x + (end.x - start.x) / 2;
    ctx.lineTo(midX, start.y);
    ctx.lineTo(midX, end.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

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
      ctx.font = '12px var(--font-inter), sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, midX, (start.y + end.y) / 2 - 8);
    }
  }

  renderText(ctx, elem) {
    const { x, y, width, text, style } = elem;
    ctx.fillStyle = style.textColor || '#f8fafc';
    ctx.font = `${style.fontWeight || 500} ${style.fontSize || 16}px var(--font-inter), sans-serif`;
    ctx.textAlign = style.textAlign || 'left';
    ctx.textBaseline = 'top';

    const textX = style.textAlign === 'center' ? x + width / 2 : style.textAlign === 'right' ? x + width : x;
    ctx.fillText(text || 'Type text here...', textX, y + 4);
  }

  renderArtboardFrame(ctx, elem) {
    const { x, y, width, height, name = 'Frame' } = elem;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
    ctx.font = '600 12px var(--font-inter), sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(name, x, y - 6);

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  }

  renderUIComponent(ctx, elem) {
    const { subType, x, y, width, height, style, label } = elem;
    switch (subType) {
      case 'button':
        ctx.fillStyle = style.fill || '#6366f1';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, width, height, 8);
        else ctx.rect(x, y, width, height);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 14px var(--font-inter), sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label || 'Button', x + width / 2, y + height / 2);
        break;
      case 'input':
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, width, height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '14px var(--font-inter), sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label || 'Search...', x + 12, y + height / 2);
        break;
      case 'toggle':
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, width, height, height / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + width - height / 2, y + height / 2, height / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      default:
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, width, height, 8);
        ctx.fill();
        ctx.stroke();
        break;
    }
  }

  renderCenteredText(ctx, text, x, y, w, h, style) {
    ctx.fillStyle = style.textColor || '#ffffff';
    ctx.font = `${style.fontWeight || 500} ${style.fontSize || 14}px var(--font-inter), sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
  }

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
    const w = maxX - minX;
    const h = maxY - minY;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(minX, minY, w, h);

    const handleSize = 8;
    const handles = [
      { x: minX, y: minY }, { x: minX + w / 2, y: minY }, { x: maxX, y: minY },
      { x: maxX, y: minY + h / 2 }, { x: maxX, y: maxY }, { x: minX + w / 2, y: maxY },
      { x: minX, y: maxY }, { x: minX, y: minY + h / 2 }
    ];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;

    handles.forEach(pos => {
      ctx.beginPath();
      ctx.rect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
      ctx.fill();
      ctx.stroke();
    });
  }
}
