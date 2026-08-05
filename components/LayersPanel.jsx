'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Square, Circle, Pencil, StickyNote, Type, Frame, Box } from 'lucide-react';

export default function LayersPanel({ state, renderer }) {
  const [elements, setElements] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (!state) return;
    const unsub = state.subscribe(s => {
      setElements([...s.elements]);
      setSelectedIds(new Set(s.selectedIds));
    });
    return () => unsub();
  }, [state]);

  if (!state) return null;

  const getLayerIcon = (type) => {
    switch (type) {
      case 'rectangle': return <Square width={14} height={14} />;
      case 'ellipse': return <Circle width={14} height={14} />;
      case 'pencil': return <Pencil width={14} height={14} />;
      case 'note': return <StickyNote width={14} height={14} />;
      case 'text': return <Type width={14} height={14} />;
      case 'frame': return <Frame width={14} height={14} />;
      default: return <Box width={14} height={14} />;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Layers Tree</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="icon-btn-tiny" title="Bring Forward" onClick={() => { state.bringForward(); renderer?.render(); }}>
            <ArrowUp width={14} height={14} />
          </button>
          <button className="icon-btn-tiny" title="Send Backward" onClick={() => { state.sendBackward(); renderer?.render(); }}>
            <ArrowDown width={14} height={14} />
          </button>
        </div>
      </div>

      <div className="layer-tree">
        {elements.length === 0 ? (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>No elements on canvas</div>
        ) : (
          [...elements].reverse().map(elem => {
            const isSelected = selectedIds.has(elem.id);
            return (
              <div
                key={elem.id}
                className={`layer-item ${isSelected ? 'selected' : ''}`}
                onClick={e => {
                  state.select(elem.id, e.shiftKey);
                  renderer?.render();
                }}
              >
                <div className="layer-info">
                  {getLayerIcon(elem.type)}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                    {elem.name}
                  </span>
                </div>
                <div className="layer-actions">
                  <button
                    className="icon-btn-tiny"
                    onClick={e => {
                      e.stopPropagation();
                      state.updateElement(elem.id, { locked: !elem.locked });
                      renderer?.render();
                    }}
                  >
                    {elem.locked ? <Lock width={12} height={12} /> : <Unlock width={12} height={12} />}
                  </button>
                  <button
                    className="icon-btn-tiny"
                    onClick={e => {
                      e.stopPropagation();
                      state.updateElement(elem.id, { visible: !elem.visible });
                      renderer?.render();
                    }}
                  >
                    {elem.visible ? <Eye width={12} height={12} /> : <EyeOff width={12} height={12} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
