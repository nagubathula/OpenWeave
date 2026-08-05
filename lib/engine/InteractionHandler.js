/**
 * PencilDraw - Interactive Canvas & Event Handler for Next.js
 */

export class InteractionHandler {
  constructor(canvas, state, renderer) {
    this.canvas = canvas;
    this.state = state;
    this.renderer = renderer;

    this.isPanning = false;
    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.isMarquee = false;

    this.startPoint = { x: 0, y: 0 };
    this.currentPoint = { x: 0, y: 0 };
    this.activeResizeHandle = null;
    this.activeElement = null;
    this.pencilPoints = [];
    this.marqueeBox = null;
    this.spacePressed = false;

    this.initEvents();
  }

  initEvents() {
    const el = this.canvas;
    el.addEventListener('pointerdown', e => this.onPointerDown(e));
    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', e => this.onPointerMove(e));
      window.addEventListener('pointerup', e => this.onPointerUp(e));
      window.addEventListener('keydown', e => this.onKeyDown(e));
      window.addEventListener('keyup', e => this.onKeyUp(e));
    }
    el.addEventListener('wheel', e => this.onWheel(e), { passive: false });
    el.addEventListener('dblclick', e => this.onDoubleClick(e));
  }

  onPointerDown(e) {
    if (e.button === 2) return;

    const screenPt = { x: e.clientX, y: e.clientY };
    const canvasPt = this.state.screenToCanvas(screenPt.x, screenPt.y);

    this.startPoint = canvasPt;
    this.currentPoint = canvasPt;

    if (this.state.activeTool === 'hand' || this.spacePressed || e.button === 1) {
      this.isPanning = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (this.state.selectedIds.size > 0 && this.state.activeTool === 'select') {
      const handleHit = this.hitTestSelectionHandles(canvasPt);
      if (handleHit) {
        if (handleHit === 'rotate') this.isRotating = true;
        else {
          this.isResizing = true;
          this.activeResizeHandle = handleHit;
        }
        return;
      }
    }

    const hitElem = this.hitTestElements(canvasPt);

    if (this.state.activeTool === 'select') {
      if (hitElem) {
        if (!e.shiftKey && !this.state.selectedIds.has(hitElem.id)) {
          this.state.select(hitElem.id);
        } else if (e.shiftKey) {
          this.state.select(hitElem.id, true);
        }
        this.isDragging = true;
      } else {
        if (!e.shiftKey) this.state.clearSelection();
        this.isMarquee = true;
      }
    } else if (this.state.activeTool === 'eraser') {
      if (hitElem) {
        this.state.selectedIds.clear();
        this.state.selectedIds.add(hitElem.id);
        this.state.deleteSelected();
      }
    } else if (this.state.activeTool === 'pencil') {
      this.isDrawing = true;
      this.pencilPoints = [canvasPt];
      this.activeElement = this.state.addElement({
        type: 'pencil',
        x: canvasPt.x,
        y: canvasPt.y,
        width: 1,
        height: 1,
        points: this.pencilPoints
      });
    } else {
      this.isDrawing = true;
      this.createShapeOnPointerDown(canvasPt);
    }
  }

  onPointerMove(e) {
    const screenPt = { x: e.clientX, y: e.clientY };
    const canvasPt = this.state.screenToCanvas(screenPt.x, screenPt.y);
    const dx = canvasPt.x - this.currentPoint.x;
    const dy = canvasPt.y - this.currentPoint.y;

    if (this.isPanning) {
      this.state.setPan(this.state.pan.x + e.movementX, this.state.pan.y + e.movementY);
    } else if (this.isDragging) {
      this.state.selectedIds.forEach(id => {
        const elem = this.state.elements.find(el => el.id === id);
        if (elem && !elem.locked) {
          this.state.updateElement(id, { x: elem.x + dx, y: elem.y + dy });
        }
      });
    } else if (this.isDrawing) {
      if (this.state.activeTool === 'pencil' && this.activeElement) {
        this.pencilPoints.push(canvasPt);
        this.state.updateElement(this.activeElement.id, { points: [...this.pencilPoints] });
      } else if (this.activeElement) {
        this.state.updateElement(this.activeElement.id, {
          width: Math.max(10, canvasPt.x - this.startPoint.x),
          height: Math.max(10, canvasPt.y - this.startPoint.y)
        });
      }
    }

    this.currentPoint = canvasPt;
    this.renderer.render();
  }

  onPointerUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'default';
    }

    if (this.isDrawing || this.isDragging || this.isResizing || this.isRotating) {
      this.state.saveState();
    }

    this.isDrawing = false;
    this.isDragging = false;
    this.isResizing = false;
    this.isRotating = false;
    this.isMarquee = false;
    this.activeElement = null;

    if (['rectangle', 'ellipse', 'diamond', 'note', 'text', 'arrow', 'frame'].includes(this.state.activeTool)) {
      this.state.activeTool = 'select';
    }

    this.renderer.render();
  }

  onWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      this.state.setZoom(this.state.zoom * zoomFactor, { x: e.clientX, y: e.clientY });
    } else {
      this.state.setPan(this.state.pan.x - e.deltaX, this.state.pan.y - e.deltaY);
    }
    this.renderer.render();
  }

  onDoubleClick(e) {
    const screenPt = { x: e.clientX, y: e.clientY };
    const canvasPt = this.state.screenToCanvas(screenPt.x, screenPt.y);
    const hitElem = this.hitTestElements(canvasPt);

    if (hitElem) {
      this.spawnInlineTextEditor(hitElem);
    } else {
      const newNote = this.state.addElement({
        type: 'note',
        x: canvasPt.x - 90,
        y: canvasPt.y - 90,
        width: 180,
        height: 180,
        text: 'New Note'
      });
      this.state.select(newNote.id);
      this.spawnInlineTextEditor(newNote);
    }
  }

  spawnInlineTextEditor(elem) {
    const overlay = document.getElementById('canvas-overlay');
    if (!overlay) return;

    const screenPos = this.state.canvasToScreen(elem.x, elem.y);
    const screenW = elem.width * this.state.zoom;
    const screenH = elem.height * this.state.zoom;

    const textarea = document.createElement('textarea');
    textarea.className = 'canvas-text-editor';
    textarea.value = elem.text || '';
    textarea.style.left = `${screenPos.x}px`;
    textarea.style.top = `${screenPos.y}px`;
    textarea.style.width = `${screenW}px`;
    textarea.style.height = `${screenH}px`;
    textarea.style.fontSize = `${(elem.style.fontSize || 16) * this.state.zoom}px`;
    if (elem.type === 'note') textarea.style.fontFamily = "var(--font-caveat), cursive";

    overlay.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const saveAndClose = () => {
      this.state.updateElement(elem.id, { text: textarea.value });
      if (overlay.contains(textarea)) overlay.removeChild(textarea);
      this.renderer.render();
    };

    textarea.addEventListener('blur', saveAndClose);
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveAndClose();
      }
    });
  }

  createShapeOnPointerDown(canvasPt) {
    const tool = this.state.activeTool;
    const defaultW = tool === 'note' ? 180 : tool === 'frame' ? 375 : 140;
    const defaultH = tool === 'note' ? 180 : tool === 'frame' ? 667 : 80;

    let elemData = {
      type: tool,
      x: canvasPt.x,
      y: canvasPt.y,
      width: defaultW,
      height: defaultH,
      name: `${tool.toUpperCase()} ${this.state.elements.length + 1}`
    };

    if (tool === 'note') elemData.text = 'Sticky Note';
    else if (tool === 'text') elemData.text = 'Header Text';
    else if (tool === 'frame') elemData.name = 'iPhone 15 Frame';
    else if (tool === 'arrow') {
      elemData.start = { x: canvasPt.x, y: canvasPt.y };
      elemData.end = { x: canvasPt.x + 150, y: canvasPt.y + 100 };
    }

    this.activeElement = this.state.addElement(elemData);
    this.state.select(this.activeElement.id);
  }

  hitTestElements(pt) {
    for (let i = this.state.elements.length - 1; i >= 0; i--) {
      const elem = this.state.elements[i];
      if (!elem.visible) continue;
      if (pt.x >= elem.x && pt.x <= elem.x + elem.width && pt.y >= elem.y && pt.y <= elem.y + elem.height) {
        return elem;
      }
    }
    return null;
  }

  hitTestSelectionHandles(pt) {
    const selected = this.state.getSelectedElements();
    if (selected.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(e => {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + e.width);
      maxY = Math.max(maxY, e.y + e.height);
    });

    const w = maxX - minX;
    const h = maxY - minY;
    const tol = 10 / this.state.zoom;

    const handles = {
      nw: { x: minX, y: minY },
      n: { x: minX + w / 2, y: minY },
      ne: { x: maxX, y: minY },
      e: { x: maxX, y: minY + h / 2 },
      se: { x: maxX, y: maxY },
      s: { x: minX + w / 2, y: maxY },
      sw: { x: minX, y: maxY },
      w: { x: minX, y: minY + h / 2 }
    };

    for (const [key, pos] of Object.entries(handles)) {
      if (Math.abs(pt.x - pos.x) < tol && Math.abs(pt.y - pos.y) < tol) {
        return key;
      }
    }
    return null;
  }

  onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space') {
      this.spacePressed = true;
      this.canvas.style.cursor = 'grab';
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      this.state.deleteSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) this.state.redo();
      else this.state.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      this.state.redo();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      this.state.duplicateSelected();
    } else if (e.key.toLowerCase() === 'v') {
      this.state.activeTool = 'select';
    } else if (e.key.toLowerCase() === 'h') {
      this.state.activeTool = 'hand';
    } else if (e.key.toLowerCase() === 'p') {
      this.state.activeTool = 'pencil';
    } else if (e.key.toLowerCase() === 'e') {
      this.state.activeTool = 'eraser';
    } else if (e.key.toLowerCase() === 'r') {
      this.state.activeTool = 'rectangle';
    } else if (e.key.toLowerCase() === 'o') {
      this.state.activeTool = 'ellipse';
    } else if (e.key.toLowerCase() === 't') {
      this.state.activeTool = 'text';
    } else if (e.key.toLowerCase() === 'n') {
      this.state.activeTool = 'note';
    }

    this.state.notify();
    this.renderer.render();
  }

  onKeyUp(e) {
    if (e.code === 'Space') {
      this.spacePressed = false;
      this.canvas.style.cursor = 'default';
    }
  }
}
