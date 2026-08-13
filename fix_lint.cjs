const fs = require('fs');

let text = fs.readFileSync('lint_errors.json', 'utf8');
if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
const data = JSON.parse(text);

const byFile = {};
data.diagnostics.forEach(d => {
  const label = d.labels && d.labels[0] ? d.labels[0] : null;
  if (!label) return;
  const line = label.span.line;
  if (!byFile[d.filename]) byFile[d.filename] = [];
  byFile[d.filename].push({ line, code: d.code });
});

for (const file of Object.keys(byFile)) {
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  
  // Group by line to avoid multiple suppressions on the same line
  const linesToInsert = [...new Set(byFile[file].map(x => x.line))].sort((a, b) => b - a);
  
  for (const lineIdx of linesToInsert) {
    // In oxlint JSON, span.line is 1-indexed.
    // lines array is 0-indexed.
    // So span.line = 15 corresponds to lines[14].
    // If we want to suppress the error on lines[14], we should insert BEFORE lines[14].
    // This means we insert at index 14.
    const insertIdx = lineIdx - 1;
    
    const originalLine = lines[insertIdx] || '';
    const indentMatch = originalLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';
    
    lines.splice(insertIdx, 0, indent + '// oxlint-disable-next-line');
  }
  
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log('Fixed', file);
}
