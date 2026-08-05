/**
 * PencilDraw - Starter Preset Templates for Next.js
 */

export class Templates {
  static loadWireframeTemplate(state) {
    state.elements = [];
    state.selectedIds.clear();

    const frame = state.addElement({
      type: 'frame',
      name: 'Next.js App Frame',
      x: 100,
      y: 80,
      width: 375,
      height: 667
    });

    state.addElement({
      type: 'component',
      subType: 'navbar',
      name: 'Top Navigation',
      label: 'Next.js App Router',
      x: 100,
      y: 80,
      width: 375,
      height: 54,
      parentId: frame.id
    });

    state.addElement({
      type: 'component',
      subType: 'input',
      name: 'Search Bar',
      label: 'Search Next.js components...',
      x: 116,
      y: 154,
      width: 343,
      height: 42,
      parentId: frame.id
    });

    state.addElement({
      type: 'component',
      subType: 'card',
      name: 'Analytics Card',
      label: 'Server API Status',
      x: 116,
      y: 212,
      width: 343,
      height: 140,
      parentId: frame.id
    });

    state.addElement({
      type: 'component',
      subType: 'button',
      name: 'Primary CTA Button',
      label: 'Save Canvas via API',
      x: 116,
      y: 380,
      width: 343,
      height: 46,
      style: { fill: '#6366f1' },
      parentId: frame.id
    });

    state.addElement({
      type: 'note',
      name: 'Design Notes',
      x: 520,
      y: 100,
      width: 210,
      height: 210,
      text: '⚡ Next.js 14 App Router + React:\n- Full SSR metadata\n- Client-side Canvas rendering\n- API Routes for persistence!',
      style: { stickyBg: '#fef08a' }
    });

    state.addElement({
      type: 'arrow',
      name: 'Connector Arrow',
      start: { x: 475, y: 200 },
      end: { x: 520, y: 200 },
      text: 'SSR Wireframe'
    });

    state.saveState();
    state.notify();
  }
}
