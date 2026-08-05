'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Wand2, X, Send } from 'lucide-react';
import { AIGenerator } from '../lib/utils/aiGenerator';

export default function AIPromptBar({ state, renderer, isOpen, onClose }) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerate = (customPrompt = null) => {
    const text = customPrompt || prompt;
    if (!text.trim() || !state) return;

    setIsGenerating(true);
    setTimeout(() => {
      const centerPt = state.screenToCanvas(
        typeof window !== 'undefined' ? window.innerWidth / 2 - 250 : 200,
        typeof window !== 'undefined' ? window.innerHeight / 2 - 150 : 150
      );

      AIGenerator.generateFromPrompt(text, state, centerPt);
      renderer?.render();
      setIsGenerating(false);
      setPrompt('');
      onClose();
    }, 400);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '560px',
        maxWidth: '90vw',
        background: 'var(--panel-bg)',
        backdropFilter: 'var(--blur-glass)',
        WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--accent-primary)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(99, 102, 241, 0.25)',
        padding: '16px',
        zIndex: 400
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.9rem' }}>
          <Wand2 width={18} height={18} />
          <span>OpenPencil AI Prompt-to-UI Assistant</span>
          <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.2)', padding: '2px 6px', borderRadius: '999px' }}>Ctrl + K</span>
        </div>
        <button className="icon-btn-tiny" onClick={onClose}>
          <X width={16} height={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="text"
          placeholder="Describe UI layout to generate (e.g. 'pricing table', 'login modal', 'hero section')..."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          style={{
            flex: 1,
            background: 'var(--panel-glass)',
            border: '1px solid var(--panel-border)',
            color: 'var(--text-main)',
            fontSize: '0.9rem',
            padding: '10px 14px',
            borderRadius: '8px',
            outline: 'none'
          }}
          autoFocus
        />
        <button
          className="nav-btn primary"
          onClick={() => handleGenerate()}
          disabled={isGenerating}
          style={{ gap: '6px' }}
        >
          {isGenerating ? <Sparkles className="animate-spin" width={16} height={16} /> : <Send width={16} height={16} />}
          <span>{isGenerating ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>

      {/* Preset Prompt Chips */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {[
          'SaaS Pricing Table',
          'Sign In Modal',
          'Hero Section',
          'Mobile App Screen'
        ].map(chip => (
          <button
            key={chip}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              padding: '4px 10px',
              borderRadius: '999px',
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            onClick={() => handleGenerate(chip)}
          >
            ✨ {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
