/**
 * PencilDraw - Starter Preset Templates (Wireframes, Flowcharts, Mindmaps)
 */

export class Templates {
  static loadWireframeTemplate(state) {
    state.elements = [];
    state.selectedIds.clear();

    // 1. Mobile iPhone Frame
    const frame = state.addElement({
      type: 'frame',
      name: 'iPhone 15 Wireframe',
      x: 100,
      y: 80,
      width: 375,
      height: 667
    });

    // 2. Navbar inside Frame
    state.addElement({
      type: 'component',
      subType: 'navbar',
      name: 'Top Navigation',
      label: 'OpenPencil App',
      x: 100,
      y: 80,
      width: 375,
      height: 54,
      parentId: frame.id
    });

    // 3. Search Bar
    state.addElement({
      type: 'component',
      subType: 'input',
      name: 'Search Bar',
      label: 'Search components...',
      x: 116,
      y: 154,
      width: 343,
      height: 42,
      parentId: frame.id
    });

    // 4. Analytics Card
    state.addElement({
      type: 'component',
      subType: 'card',
      name: 'Analytics Card',
      label: 'Weekly Active Users',
      x: 116,
      y: 212,
      width: 343,
      height: 140,
      parentId: frame.id
    });

    // 5. Settings Toggle
    state.addElement({
      type: 'component',
      subType: 'toggle',
      name: 'Dark Mode Switch',
      checked: true,
      x: 390,
      y: 372,
      width: 50,
      height: 26,
      parentId: frame.id
    });

    state.addElement({
      type: 'text',
      text: 'Enable Dark Glassmorphism',
      x: 116,
      y: 375,
      width: 250,
      height: 24,
      style: { fontSize: 14, textColor: '#f8fafc' },
      parentId: frame.id
    });

    // 6. Action Button
    state.addElement({
      type: 'component',
      subType: 'button',
      name: 'Primary CTA Button',
      label: 'Create New Canvas Project',
      x: 116,
      y: 420,
      width: 343,
      height: 46,
      style: { fill: '#6366f1' },
      parentId: frame.id
    });

    // 7. Whiteboard Sticky Notes next to frame
    state.addElement({
      type: 'note',
      name: 'Design Notes',
      x: 520,
      y: 100,
      width: 200,
      height: 200,
      text: '💡 OpenPencil + tldraw Hybrid Idea:\n- Instant vector editing\n- Freehand pencil ink\n- Sticky notes & wireframes',
      style: { stickyBg: '#fef08a' }
    });

    state.addElement({
      type: 'note',
      name: 'Feedback Note',
      x: 520,
      y: 330,
      width: 200,
      height: 200,
      text: '🚀 High performance infinite canvas with zero lag!',
      style: { stickyBg: '#bae6fd' }
    });

    // 8. Connecting arrow
    state.addElement({
      type: 'arrow',
      name: 'Connector Arrow',
      start: { x: 475, y: 200 },
      end: { x: 520, y: 200 },
      text: 'Wireframe Spec'
    });

    state.saveState();
    state.notify();
  }
}
