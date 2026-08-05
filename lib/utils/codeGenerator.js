/**
 * OpenPencil Code Generator
 * Transpiles canvas design nodes into clean React JSX, Tailwind CSS, and Raw CSS.
 */

export class CodeGenerator {
  static generateReact(element) {
    if (!element) return '// Select an element on canvas to generate React JSX code';

    const { type, subType, name, width, height, text, style = {}, label } = element;
    const tag = element.type === 'text' ? 'p' : element.type === 'frame' ? 'div' : 'div';
    const fill = style.fill || '#1e293b';

    if (type === 'component') {
      if (subType === 'button') {
        return `export default function ${this.toPascalCase(name || 'Button')}() {
  return (
    <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all">
      ${label || text || 'Button'}
    </button>
  );
}`;
      }
      if (subType === 'input') {
        return `export default function ${this.toPascalCase(name || 'Input')}() {
  return (
    <div className="relative w-full max-w-sm">
      <input
        type="text"
        placeholder="${label || 'Search...'}"
        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}`;
      }
      if (subType === 'card') {
        return `export default function ${this.toPascalCase(name || 'Card')}() {
  return (
    <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-lg text-slate-100">
      <h3 className="text-lg font-bold mb-2">${label || 'Card Title'}</h3>
      <p className="text-sm text-slate-400">Card content and metrics description.</p>
    </div>
  );
}`;
      }
    }

    if (type === 'frame') {
      return `export default function ${this.toPascalCase(name || 'Frame')}() {
  return (
    <div className="w-[${Math.round(width)}px] h-[${Math.round(height)}px] bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
      {/* Nested Frame Components */}
      <h2 className="text-xl font-bold text-white mb-4">${name}</h2>
    </div>
  );
}`;
    }

    if (type === 'note') {
      return `export default function StickyNote() {
  return (
    <div className="w-[${Math.round(width)}px] h-[${Math.round(height)}px] p-4 bg-yellow-200 text-slate-900 font-handwriting shadow-md rounded-md transform -rotate-1">
      <p className="text-base font-semibold">${text || 'Sticky Note Content'}</p>
    </div>
  );
}`;
    }

    return `export default function ${this.toPascalCase(name || 'Component')}() {
  return (
    <${tag}
      style={{
        width: '${Math.round(width)}px',
        height: '${Math.round(height)}px',
        backgroundColor: '${fill}',
        borderRadius: '${style.cornerRadius || 0}px',
        color: '${style.textColor || '#ffffff'}'
      }}
    >
      ${text || name}
    </${tag}>
  );
}`;
  }

  static generateTailwind(element) {
    if (!element) return 'select-element';
    const { width, height, style = {} } = element;
    const w = Math.round(width);
    const h = Math.round(height);
    const radius = style.cornerRadius ? `rounded-[${style.cornerRadius}px]` : 'rounded-none';

    return `w-[${w}px] h-[${h}px] bg-[${style.fill || '#1e293b'}] border border-[${style.stroke || '#6366f1'}] ${radius} transition-all shadow-md`;
  }

  static generateCSS(element) {
    if (!element) return '/* Select an element on canvas */';
    const { name, x, y, width, height, rotation, style = {} } = element;
    const className = (name || 'element').toLowerCase().replace(/\s+/g, '-');

    return `.${className} {
  position: absolute;
  left: ${Math.round(x)}px;
  top: ${Math.round(y)}px;
  width: ${Math.round(width)}px;
  height: ${Math.round(height)}px;
  background-color: ${style.fill || '#1e293b'};
  border: ${style.strokeWidth || 1}px solid ${style.stroke || '#6366f1'};
  border-radius: ${style.cornerRadius || 0}px;
  transform: rotate(${rotation || 0}deg);
  color: ${style.textColor || '#f8fafc'};
}`;
  }

  static toPascalCase(str) {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }
}
