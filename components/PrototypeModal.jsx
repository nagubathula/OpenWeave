'use client';

import { useState } from 'react';
import { X, Play, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PrototypeModal({ state, isOpen, onClose }) {
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);

  if (!isOpen || !state) return null;

  const frames = state.elements.filter(e => e.type === 'frame');

  if (frames.length === 0) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--panel-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
          <h3 style={{ marginBottom: '12px', color: 'var(--text-main)' }}>No Artboard Frames Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Add a Frame (`F`) to canvas to preview interactive prototypes.</p>
          <button className="nav-btn primary" onClick={onClose}>Close Prototype Player</button>
        </div>
      </div>
    );
  }

  const currentFrame = frames[activeFrameIndex] || frames[0];
  const children = state.elements.filter(e => e.parentId === currentFrame.id);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0c10', zIndex: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Player Header */}
      <div style={{ height: '48px', background: 'rgba(22, 26, 38, 0.9)', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 600 }}>
          <Play width={16} height={16} fill="var(--accent-primary)" color="var(--accent-primary)" />
          <span>Prototype Presentation — {currentFrame.name}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({activeFrameIndex + 1} of {frames.length})</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="icon-btn-tiny" onClick={() => setActiveFrameIndex((activeFrameIndex - 1 + frames.length) % frames.length)}>
            <ChevronLeft width={18} height={18} />
          </button>
          <button className="icon-btn-tiny" onClick={() => setActiveFrameIndex((activeFrameIndex + 1) % frames.length)}>
            <ChevronRight width={18} height={18} />
          </button>
          <button className="icon-btn-tiny" onClick={() => setActiveFrameIndex(0)} title="Reset Presentation">
            <RefreshCw width={16} height={16} />
          </button>
          <button className="nav-btn" onClick={onClose} style={{ padding: '4px 10px' }}>
            <X width={16} height={16} /> Exit
          </button>
        </div>
      </div>

      {/* Frame Screen Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '20px' }}>
        <div
          style={{
            position: 'relative',
            width: `${currentFrame.width}px`,
            height: `${currentFrame.height}px`,
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            overflow: 'hidden'
          }}
        >
          {children.map(child => (
            <div
              key={child.id}
              style={{
                position: 'absolute',
                left: `${child.x - currentFrame.x}px`,
                top: `${child.y - currentFrame.y}px`,
                width: `${child.width}px`,
                height: `${child.height}px`,
                backgroundColor: child.style?.fill || 'transparent',
                color: child.style?.textColor || '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: `${child.style?.cornerRadius || 0}px`,
                fontFamily: 'var(--font-sans)',
                fontSize: `${child.style?.fontSize || 14}px`,
                cursor: 'pointer'
              }}
              onClick={() => {
                // Advance frame on click
                setActiveFrameIndex((activeFrameIndex + 1) % frames.length);
              }}
            >
              {child.text || child.label || child.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
