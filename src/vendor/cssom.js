// Local shim for @acemir/cssom.
//
// The package's "browser" field points to build/CSSOM.js, a global-var script
// with no module exports. Its "main" (lib/index.js) is the declared entry, so a
// string `browser` field makes bundlers remap main -> build/CSSOM.js, which then
// exposes nothing to ESM consumers ("module has no exports at all").
//
// Import the explicit subpath files instead: they carry proper CJS exports and
// are never remapped by the string browser field. dom-css only consumes `parse`
// and `CSSFontFaceRule`, so those are all we re-export.
export { parse } from '@acemir/cssom/lib/parse.js'
export { CSSFontFaceRule } from '@acemir/cssom/lib/CSSFontFaceRule.js'
