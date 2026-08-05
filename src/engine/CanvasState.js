/**
 * PencilDraw - Central State Management Engine
 * Manages canvas elements, view transform, active tool state, selection, and undo/redo stacks.
 */

export class CanvasState {
  constructor() {
    this.elements = [];
    this.selectedIds = new Set();
    this.activeTool = 'select'; // select, hand, pencil, eraser, rectangle, ellipse, diamond, arrow, note, text, frame
    
    // Viewport transform
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    
    // Canvas settings
    this.gridType = 'dots'; // dots, lines, none
    this.gridSize = 20;
    this.snapToGrid = false;
    this.projectName = 'Untitled Wireframe';

    // History stacks for Undo / Redo
    this.undoStack = [];
    this.redoStack = [];

    // Subscribers for state changes
    this.listeners = [];

    // Active tool default styles
    this.currentStyle = {
      fill: '#1e293b',
      stroke: '#6366f1',
      strokeWidth: 2,
      opacity: 1,
      fontSize: 16,
      fontFamily: 'Inter',
      textAlign: 'left',
      textColor: '#f8fafc',
      cornerRadius: 8,
      shadow: false,
      stickyBg: '#fef08a' // yellow sticky default
    };

    // Save initial state snapshot
    this.saveState();
  }

  // Subscribe to state updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => cb(this));
  }

  // Snapshot saving for Undo / Redo
  saveState() {
    // Limit stack size to 50
    if (this.undoStack.length >= 50) this.undoStack.shift();
    this.undoStack.push(JSON.stringify(this.elements));
    this.redoStack = [];
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    const previous = this.undoStack[this.undoStack.length - 1];
    this.elements = JSON.parse(previous);
    this.selectedIds.clear();
    this.notify();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop();
    this.undoStack.push(next);
    this.elements = JSON.parse(next);
    this.selectedIds.clear();
    this.notify();
  }

  // Element CRUD Operations
  addElement(element) {
    const defaultElem = {
      id: element.id || 'elem_' + Math.random().toString(36).substr(2, 9),
      type: element.type,
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 100,
      height: element.height || 100,
      rotation: element.rotation || 0,
      name: element.name || `${element.type.toUpperCase()} ${this.elements.length + 1}`,
      visible: true,
      locked: false,
      parentId: element.parentId || null,
      style: { ...this.currentStyle, ...(element.style || {}) },
      ...element
    };

    this.elements.push(defaultElem);
    this.saveState();
    this.notify();
    return defaultElem;
  }

  updateElement(id, props) {
    const index = this.elements.findIndex(e => e.id === id);
    if (index !== -1) {
      this.elements[index] = { ...this.elements[index], ...props };
      this.notify();
    }
  }

  updateSelectedElements(props) {
    let changed = false;
    this.selectedIds.forEach(id => {
      const index = this.elements.findIndex(e => e.id === id);
      if (index !== -1 && !this.elements[index].locked) {
        this.elements[index] = {
          ...this.elements[index],
          ...props,
          style: { ...this.elements[index].style, ...(props.style || {}) }
        };
        changed = true;
      }
    });
    if (changed) {
      this.saveState();
      this.notify();
    }
  }

  deleteSelected() {
    if (this.selectedIds.size === 0) return;
    this.elements = this.elements.filter(e => !this.selectedIds.has(e.id));
    this.selectedIds.clear();
    this.saveState();
    this.notify();
  }

  duplicateSelected() {
    if (this.selectedIds.size === 0) return;
    const newSelected = new Set();
    const toAdd = [];

    this.selectedIds.forEach(id => {
      const orig = this.elements.find(e => e.id === id);
      if (orig) {
        const copy = JSON.parse(JSON.stringify(orig));
        copy.id = 'elem_' + Math.random().toString(36).substr(2, 9);
        copy.x += 20;
        copy.y += 20;
        copy.name += ' Copy';
        toAdd.push(copy);
        newSelected.add(copy.id);
      }
    });

    this.elements.push(...toAdd);
    this.selectedIds = newSelected;
    this.saveState();
    this.notify();
  }

  // Selection Handling
  select(id, multi = false) {
    if (!multi) {
      this.selectedIds.clear();
    }
    if (id) {
      this.selectedIds.add(id);
    }
    this.notify();
  }

  clearSelection() {
    this.selectedIds.clear();
    this.notify();
  }

  getSelectedElements() {
    return this.elements.filter(e => this.selectedIds.has(e.id));
  }

  // Grouping
  groupSelected() {
    const selected = this.getSelectedElements();
    if (selected.length < 2) return;

    const groupId = 'group_' + Math.random().toString(36).substr(2, 9);
    
    // Calculate bounding box of group
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(e => {
      minX = Math.min(minX, e.x);
      minY = Math.min(minY, e.y);
      maxX = Math.max(maxX, e.x + e.width);
      maxY = Math.max(maxY, e.y + e.height);
    });

    const groupElement = {
      id: groupId,
      type: 'group',
      name: 'Group ' + groupId.substr(-4),
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      rotation: 0,
      visible: true,
      locked: false,
      childrenIds: selected.map(e => e.id),
      style: {}
    };

    selected.forEach(e => {
      e.groupId = groupId;
    });

    this.elements.push(groupElement);
    this.selectedIds.clear();
    this.selectedIds.add(groupId);
    this.saveState();
    this.notify();
  }

  ungroupSelected() {
    this.selectedIds.forEach(id => {
      const elem = this.elements.find(e => e.id === id);
      if (elem && elem.type === 'group') {
        if (elem.childrenIds) {
          elem.childrenIds.forEach(childId => {
            const child = this.elements.find(c => c.id === childId);
            if (child) delete child.groupId;
          });
        }
        this.elements = this.elements.filter(e => e.id !== id);
      }
    });
    this.selectedIds.clear();
    this.saveState();
    this.notify();
  }

  // Layer Ordering
  bringForward() {
    this.selectedIds.forEach(id => {
      const idx = this.elements.findIndex(e => e.id === id);
      if (idx < this.elements.length - 1) {
        const temp = this.elements[idx];
        this.elements[idx] = this.elements[idx + 1];
        this.elements[idx + 1] = temp;
      }
    });
    this.saveState();
    this.notify();
  }

  sendBackward() {
    this.selectedIds.forEach(id => {
      const idx = this.elements.findIndex(e => e.id === id);
      if (idx > 0) {
        const temp = this.elements[idx];
        this.elements[idx] = this.elements[idx - 1];
        this.elements[idx - 1] = temp;
      }
    });
    this.saveState();
    this.notify();
  }

  // Viewport transforms (Pan/Zoom)
  setPan(x, y) {
    this.pan = { x, y };
    this.notify();
  }

  setZoom(zoom, center = null) {
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.1, Math.min(5, zoom));
    
    if (center) {
      // Zoom centered around cursor
      this.pan.x = center.x - (center.x - this.pan.x) * (newZoom / oldZoom);
      this.pan.y = center.y - (center.y - this.pan.y) * (newZoom / oldZoom);
    }
    
    this.zoom = newZoom;
    this.notify();
  }

  // Coordinate Conversion Helpers
  screenToCanvas(screenX, screenY) {
    return {
      x: (screenX - this.pan.x) / this.zoom,
      y: (screenY - this.pan.y) / this.zoom
    };
  }

  canvasToScreen(canvasX, canvasY) {
    return {
      x: canvasX * this.zoom + this.pan.x,
      y: canvasY * this.zoom + this.pan.y
    };
  }
}
