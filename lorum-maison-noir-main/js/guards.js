// guards.js — AURUM
// Bulletproof safety layer: WebGL detection, broken-image fallback, safety reveal,
// and the no-WebGL noir+gold stage toggle. Nothing here may ever leave a blank screen.

import { bgDataURI } from './backgrounds.js?v=5';

/**
 * detectWebGL() -> boolean
 * True only if a real WebGL (or WebGL2) context can be created.
 */
export function detectWebGL() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    if (!window.WebGLRenderingContext) return false;
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // Guard against software/null contexts that exist but cannot render.
    const ok = typeof gl.getParameter === 'function' && !!gl.getParameter(gl.VERSION);
    // Best-effort cleanup.
    const lose = gl.getExtension && gl.getExtension('WEBGL_lose_context');
    if (lose && lose.loseContext) {
      try { lose.loseContext(); } catch (e) { /* noop */ }
    }
    return ok;
  } catch (e) {
    return false;
  }
}

// Per-image guard so we never loop forever if even the data-URI somehow fails.
const GUARD_FLAG = '__aurumGuarded';

function brandedFallbackFor(img) {
  // Derive a chapter accent from a data attribute if present, else house gold.
  const accent =
    (img && img.getAttribute && img.getAttribute('data-accent')) || '#c8a14e';
  return bgDataURI({ from: '#0d0907', to: '#070504', accent: accent });
}

function fixImage(img) {
  if (!img || img[GUARD_FLAG]) return;
  // naturalWidth 0 after load (or a fired error) means broken.
  const broken =
    img.complete && img.naturalWidth === 0 ? true : false;
  if (!broken) return;
  img[GUARD_FLAG] = true;
  try {
    img.removeAttribute('srcset');
    img.src = brandedFallbackFor(img);
  } catch (e) { /* noop */ }
}

/**
 * installImageGuard()
 * Swaps any broken <img> (error event OR naturalWidth==0) to a branded gradient data-URI.
 * Covers images present now and any added later (capturing error listener + observer).
 */
export function installImageGuard() {
  if (typeof document === 'undefined') return;

  // 1) Capture error events for all images (capture phase: error does not bubble).
  document.addEventListener(
    'error',
    function (ev) {
      const t = ev && ev.target;
      if (t && t.tagName === 'IMG' && !t[GUARD_FLAG]) {
        t[GUARD_FLAG] = true;
        try {
          t.removeAttribute('srcset');
          t.src = brandedFallbackFor(t);
        } catch (e) { /* noop */ }
      }
    },
    true
  );

  // 2) Sweep current images (handles already-broken / cached-broken cases).
  const sweep = function () {
    const imgs = document.querySelectorAll('img');
    for (let i = 0; i < imgs.length; i += 1) fixImage(imgs[i]);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sweep, { once: true });
  } else {
    sweep();
  }
  // One more pass after full load to catch late failures.
  window.addEventListener('load', sweep, { once: true });

  // 3) Watch for dynamically inserted images.
  if (window.MutationObserver) {
    const mo = new MutationObserver(function (mutations) {
      for (let m = 0; m < mutations.length; m += 1) {
        const added = mutations[m].addedNodes;
        for (let n = 0; n < added.length; n += 1) {
          const node = added[n];
          if (!node || node.nodeType !== 1) continue;
          if (node.tagName === 'IMG') {
            node.addEventListener(
              'error',
              function () { fixImage(node); },
              { once: true }
            );
            // If it loaded broken before we attached, catch it.
            if (node.complete) fixImage(node);
          } else if (node.querySelectorAll) {
            const inner = node.querySelectorAll('img');
            for (let q = 0; q < inner.length; q += 1) fixImage(inner[q]);
          }
        }
      }
    });
    try {
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) { /* noop */ }
  }
}

/**
 * installSafetyReveal(ms=5000)
 * Last-resort: after ms, force every .reveal visible (in case observers misfired),
 * and if the loader is still present, force-reveal it out and remove it so the
 * page is never trapped behind a stuck preloader.
 */
export function installSafetyReveal(ms) {
  if (typeof document === 'undefined') return;
  const delay = typeof ms === 'number' ? ms : 4000;
  const vh = () => window.innerHeight || 800;

  // Reveal only what is on (or near) the screen, so off-screen content keeps its
  // scroll-reveal animation. This mirrors the IntersectionObserver in ui.js so the
  // page is never trapped invisible even if that observer never fires.
  function revealVisible() {
    try {
      const els = document.querySelectorAll('.reveal:not(.is-in)');
      for (let i = 0; i < els.length; i += 1) {
        if (els[i].getBoundingClientRect().top < vh() * 1.15) els[i].classList.add('is-in');
      }
    } catch (e) { /* noop */ }
  }
  function revealEverything() {
    try {
      const els = document.querySelectorAll('.reveal:not(.is-in)');
      for (let i = 0; i < els.length; i += 1) els[i].classList.add('is-in');
    } catch (e) { /* noop */ }
  }

  function arm() {
    revealVisible();                          // anything already on screen at load
    window.setTimeout(revealVisible, delay);  // catch on-screen content the observer missed
    let t;
    const onScroll = () => { clearTimeout(t); t = window.setTimeout(revealVisible, 80); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // Absolute last resort: nothing is ever permanently hidden.
    window.setTimeout(revealEverything, 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm, { once: true });
  } else {
    arm();
  }
}

/**
 * noWebGLFallback()
 * Adds html.no-webgl (CSS hides #webgl and shows the noir+gold stage + .scent-fallback
 * images + all copy) and best-effort hides the canvas inline as a belt-and-braces.
 */
export function noWebGLFallback() {
  if (typeof document === 'undefined') return;
  try {
    document.documentElement.classList.add('no-webgl');
    const canvas = document.getElementById('webgl');
    if (canvas) {
      canvas.style.display = 'none';
      canvas.setAttribute('aria-hidden', 'true');
    }
  } catch (e) { /* noop */ }
}

export default {
  detectWebGL,
  installImageGuard,
  installSafetyReveal,
  noWebGLFallback,
};
