// Cursor SVG sources as string constants.
//
// These were previously imported via `./*.svg?raw`, but Turbopack (Next.js)
// applies its built-in image handling to `.svg` and ignores the `?raw` query,
// yielding an image object rather than the source string — so `.replace()` on
// them throws at runtime. Inlining the sources keeps them as plain strings that
// every bundler handles identically. Keep these in sync with the sibling
// resize-cursor.svg / rotate-cursor.svg files.

export const resizeCursorSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">' +
  '<path d="M781.33 239.94 781.33 381.12 600.77 381.12 600.77 381.12 238.68 381.12 239.94 242.00 58.93 422.94 239.94 603.94 239.94 462.75 758.89 462.75 783.77 462.75 783.77 604.80 964.77 423.80Z" fill="black" stroke="white" stroke-width="33.33"/>' +
  '</svg>'

export const rotateCursorSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="680 1800 640 620">' +
  '<path d="M1113.142,1956.331C1008.608,1982.71 887.611,2049.487 836.035,2213.487L891.955,2219.403L779,2396L705.496,2199.678L772.745,2206.792C832.051,1999.958 984.143,1921.272 1110.63,1892.641L1107.952,1824.711L1299,1911L1115.34,2012.065L1113.142,1956.331Z" fill="black" stroke="white" stroke-width="33.33"/>' +
  '</svg>'
