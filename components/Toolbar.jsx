'use client';

import { useState, useEffect } from 'react';
import { MousePointer, Hand, Pencil, Eraser, Square, Circle, Diamond, ArrowRight, StickyNote, Type, Frame } from 'lucide-react';

export default function Toolbar({ state }) {
  const [activeTool, setActiveTool] = useState(state ? state.activeTool : 'select');

  useEffect(() => {
    if (!state) return;
    const unsub = state.subscribe(s => {
      setActiveTool(s.activeTool);
    });
    return () => unsub();
  }, [state]);

  const selectTool = (id) => {
    state.activeTool = id;
    setActiveTool(id);
    state.notify();
  };

  const tools = [
    { id: 'select', label: 'Select (V)', key: 'V', icon: <MousePointer width={18} height={18} /> },
    { id: 'hand', label: 'Hand (H)', key: 'H', icon: <Hand width={18} height={18} /> },
    { id: 'pencil', label: 'Pencil Brush (P)', key: 'P', icon: <Pencil width={18} height={18} /> },
    { id: 'eraser', label: 'Eraser (E)', key: 'E', icon: <Eraser width={18} height={18} /> },
    { type: 'divider' },
    { id: 'rectangle', label: 'Rectangle (R)', key: 'R', icon: <Square width={18} height={18} /> },
    { id: 'ellipse', label: 'Ellipse (O)', key: 'O', icon: <Circle width={18} height={18} /> },
    { id: 'diamond', label: 'Diamond (D)', key: 'D', icon: <Diamond width={18} height={18} /> },
    { id: 'arrow', label: 'Arrow Connector (A)', key: 'A', icon: <ArrowRight width={18} height={18} /> },
    { type: 'divider' },
    { id: 'note', label: 'Sticky Note (N)', key: 'N', icon: <StickyNote width={18} height={18} /> },
    { id: 'text', label: 'Text Box (T)', key: 'T', icon: <Type width={18} height={18} /> },
    { id: 'frame', label: 'Artboard Frame (F)', key: 'F', icon: <Frame width={18} height={18} /> }
  ];

  return (
    <nav className="floating-toolbar">
      {tools.map((t, idx) => {
        if (t.type === 'divider') {
          return <div key={`div-${idx}`} className="tool-divider" />;
        }

        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            className={`tool-btn ${isActive ? 'active' : ''}`}
            title={t.label}
            onClick={() => selectTool(t.id)}
          >
            {t.icon}
            <span className="shortcut-badge">{t.key}</span>
          </button>
        );
      })}
    </nav>
  );
}
