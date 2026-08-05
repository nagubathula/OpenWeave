'use client';

import { MousePointer, Search, ToggleLeft, Sliders, CreditCard, User, Layout } from 'lucide-react';

export default function ComponentLibrary({ state, renderer }) {
  const stencils = [
    { id: 'btn_primary', name: 'Primary Button', subType: 'button', label: 'Submit Order', width: 140, height: 42, icon: <MousePointer width={20} height={20} /> },
    { id: 'input_search', name: 'Search Input', subType: 'input', label: 'Search components...', width: 220, height: 40, icon: <Search width={20} height={20} /> },
    { id: 'toggle_switch', name: 'Toggle Switch', subType: 'toggle', label: 'Enable Setting', width: 50, height: 26, icon: <ToggleLeft width={20} height={20} /> },
    { id: 'range_slider', name: 'Range Slider', subType: 'slider', value: 70, width: 180, height: 24, icon: <Sliders width={20} height={20} /> },
    { id: 'card_widget', name: 'UI Card', subType: 'card', label: 'Analytics Overview', width: 240, height: 160, icon: <CreditCard width={20} height={20} /> },
    { id: 'user_avatar', name: 'User Avatar', subType: 'avatar', width: 64, height: 64, icon: <User width={20} height={20} /> },
    { id: 'app_navbar', name: 'App Header Bar', subType: 'navbar', label: 'OpenPencil App', width: 360, height: 50, icon: <Layout width={20} height={20} /> }
  ];

  const spawnStencil = (st) => {
    if (!state) return;
    const centerCanvas = state.screenToCanvas(
      typeof window !== 'undefined' ? window.innerWidth / 2 - 100 : 300,
      typeof window !== 'undefined' ? window.innerHeight / 2 - 50 : 300
    );

    const newComp = state.addElement({
      type: 'component',
      subType: st.subType,
      name: st.name,
      x: centerCanvas.x,
      y: centerCanvas.y,
      width: st.width,
      height: st.height,
      label: st.label,
      value: st.value
    });

    state.select(newComp.id);
    renderer?.render();
  };

  return (
    <div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
        UI Component Stencils
      </div>
      <div className="stencil-grid">
        {stencils.map(st => (
          <div key={st.id} className="stencil-card" onClick={() => spawnStencil(st)}>
            <div className="stencil-icon">{st.icon}</div>
            <div className="stencil-name">{st.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
