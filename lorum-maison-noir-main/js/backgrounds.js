// backgrounds.js — AURUM
// On-brand SVG gradient data-URIs: warm gold glow on noir, faint grain, thin gold ring.
// Used by the image guard (broken <img> fallback) and the no-WebGL stage.

const PALETTE = {
  bg: '#070504',
  bg2: '#0d0907',
  gold: '#c8a14e',
  goldBright: '#ecc878',
  amber: '#c8772f',
};

// Deterministic-ish id so multiple gradients in the DOM never collide.
let __uid = 0;
function nextId() {
  __uid += 1;
  return 'a' + __uid.toString(36) + Math.random().toString(36).slice(2, 6);
}

/**
 * bgDataURI({from, to, accent}) -> encodeURIComponent SVG data-URI.
 * Radial warm glow + linear noir base + faint grain + thin gold hairline ring.
 * All args optional; falls back to the house palette.
 */
export function bgDataURI(opts = {}) {
  const from = opts.from || PALETTE.bg2;
  const to = opts.to || PALETTE.bg;
  const accent = opts.accent || PALETTE.gold;

  const w = 1200;
  const h = 1500;
  const id = nextId();

  // Faint film grain via fractal noise, kept low-opacity so it reads as texture not noise.
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" ' +
    'viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' +
        '<linearGradient id="lin' + id + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + from + '"/>' +
          '<stop offset="1" stop-color="' + to + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="glow' + id + '" cx="50%" cy="38%" r="62%">' +
          '<stop offset="0" stop-color="' + accent + '" stop-opacity="0.42"/>' +
          '<stop offset="0.34" stop-color="' + accent + '" stop-opacity="0.16"/>' +
          '<stop offset="0.7" stop-color="' + to + '" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<radialGradient id="floor' + id + '" cx="50%" cy="92%" r="55%">' +
          '<stop offset="0" stop-color="' + accent + '" stop-opacity="0.12"/>' +
          '<stop offset="1" stop-color="' + to + '" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<filter id="grain' + id + '">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch"/>' +
          '<feColorMatrix type="saturate" values="0"/>' +
          '<feComponentTransfer><feFuncA type="linear" slope="0.05"/></feComponentTransfer>' +
        '</filter>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#lin' + id + ')"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#glow' + id + ')"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#floor' + id + ')"/>' +
      '<rect width="' + w + '" height="' + h + '" filter="url(#grain' + id + ')" opacity="0.5"/>' +
      // thin gold hairline ring, slightly off-centre toward the glow
      '<ellipse cx="' + (w / 2) + '" cy="' + (h * 0.41) + '" rx="' + (w * 0.27) + '" ry="' + (w * 0.27) + '" ' +
        'fill="none" stroke="' + accent + '" stroke-opacity="0.5" stroke-width="1.4"/>' +
      '<ellipse cx="' + (w / 2) + '" cy="' + (h * 0.41) + '" rx="' + (w * 0.205) + '" ry="' + (w * 0.205) + '" ' +
        'fill="none" stroke="' + PALETTE.goldBright + '" stroke-opacity="0.22" stroke-width="0.8"/>' +
    '</svg>';

  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export default { bgDataURI };
