/**
 * PencilDraw - Export Utilities (PNG, SVG, JSON)
 */

export class Exporter {
  static exportPNG(canvas, projectName = 'PencilDraw-Export') {
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  static exportSVG(state) {
    const { elements, projectName } = state;
    
    // Compute bounding box of all elements
    let minX = 0, minY = 0, maxX = 800, maxY = 600;
    if (elements.length > 0) {
      minX = Math.min(...elements.map(e => e.x)) - 40;
      minY = Math.min(...elements.map(e => e.y)) - 40;
      maxX = Math.max(...elements.map(e => e.x + e.width)) + 40;
      maxY = Math.max(...elements.map(e => e.y + e.height)) + 40;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">\n`;
    svgContent += `  <style>\n    .text { font-family: Inter, sans-serif; }\n    .note-text { font-family: Caveat, cursive; }\n  </style>\n`;
    svgContent += `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#161822"/>\n`;

    elements.forEach(e => {
      if (!e.visible) return;
      const s = e.style || {};
      const fill = s.fill || '#1e293b';
      const stroke = s.stroke || '#6366f1';
      const strokeWidth = s.strokeWidth || 2;

      if (e.type === 'rectangle') {
        svgContent += `  <rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="${s.cornerRadius || 0}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`;
      } else if (e.type === 'ellipse') {
        svgContent += `  <ellipse cx="${e.x + e.width / 2}" cy="${e.y + e.height / 2}" rx="${e.width / 2}" ry="${e.height / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>\n`;
      } else if (e.type === 'note') {
        svgContent += `  <rect x="${e.x}" y="${e.y}" width="${e.width}" height="${e.height}" rx="6" fill="${s.stickyBg || '#fef08a'}"/>\n`;
        if (e.text) {
          svgContent += `  <text x="${e.x + e.width / 2}" y="${e.y + e.height / 2}" font-size="${s.fontSize || 18}" fill="#1e293b" text-anchor="middle" dominant-baseline="middle" class="note-text">${e.text}</text>\n`;
        }
      } else if (e.type === 'text') {
        svgContent += `  <text x="${e.x}" y="${e.y + 16}" font-size="${s.fontSize || 16}" fill="${s.textColor || '#f8fafc'}" class="text">${e.text || ''}</text>\n`;
      }
    });

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
  }
}
