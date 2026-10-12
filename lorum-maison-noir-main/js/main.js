import { AURUM } from './config.js?v=10';
import { detectWebGL, installImageGuard, installSafetyReveal, noWebGLFallback } from './guards.js?v=10';
import { initScene } from './scene.js?v=10';
import { initScroll } from './scroll.js?v=10';
import { initUI } from './ui.js?v=10';

const html = document.documentElement;
html.classList.remove('no-js');
html.classList.add('js');

installImageGuard();
installSafetyReveal(4000);

// ---- Per-section background: distinct image per room, crossfaded (no loader gate) ----
const BG = {
  hero: '/assets/img/goddess-pose-5.jpg',      // goddess presenting the bottle, gold scent-trail
  manifesto: '/assets/img/goddess-pose-3.jpg',  // the Garden of AURUM (seated among columns)
  voices: '/assets/img/goddess-pose-4.jpg',     // perfume to the lips (testimonials)
  closing: '/assets/img/goddess-pose-1.jpg',    // the goddess, back view
  rooms: [
    '/assets/img/bg-1.jpg',
    '/assets/img/bg-2.jpg',
    '/assets/img/bg-3.jpg',
    '/assets/img/bg-4.jpg',
    '/assets/img/bg-5.jpg',
  ],
};
const layers = Array.from(document.querySelectorAll('.stage-bg-layer'));
let bgTop = 0;
let curBg = '';
function setBg(url) {
  if (!url || url === curBg || layers.length < 2) return;
  curBg = url;
  const incoming = layers[bgTop ^ 1];
  const outgoing = layers[bgTop];
  incoming.style.backgroundImage = 'url("' + url + '")';
  incoming.classList.add('is-on');
  outgoing.classList.remove('is-on');
  bgTop ^= 1;
}
// Prime the welcome background immediately (visible the instant the page loads).
if (layers[0]) { layers[0].style.backgroundImage = 'url("' + BG.hero + '")'; curBg = BG.hero; }

const canvas = document.getElementById('webgl');
let api = null;
if (detectWebGL()) {
  api = initScene({ canvas, perfumes: AURUM.perfumes, palette: AURUM.palette });
  if (api && api.setStage) api.setStage(0); // hero is the goddess; the 3D bottles only appear once the rooms enter
} else {
  noWebGLFallback();
}

// No loader gate: the experience starts immediately on a "Welcome to AURUM" intro.
initScroll({
  onProgress: (p) => { if (api) api.setProgress(p); },
  onChapter: (i) => {
    if (api) api.focusChapter(i);
    // Room names live inside the horizontally-translated track, so the illuminate
    // IntersectionObserver can never fire on them — light them once we're in the rooms.
    document.querySelectorAll('.scent-name').forEach((el) => el.classList.add('lit'));
  },
  onStage: (v) => { if (api && api.setStage) api.setStage(v); },
  onBg: (key) => {
    if (key === 'hero') setBg(BG.hero);
    else if (key === 'manifesto') setBg(BG.manifesto);
    else if (key === 'voices') setBg(BG.voices);
    else if (key === 'closing') setBg(BG.closing);
    else if (typeof key === 'number') setBg(BG.rooms[Math.max(0, Math.min(BG.rooms.length - 1, key))]);
  },
});
initUI({ perfumes: AURUM.perfumes });

// Scroll-illuminate: headings brighten + take a gold glow as they enter the viewport.
const ILLUME = '.hero-title, .hero-tagline, .section-title, .craft-title, .closing-line, .manifesto-body, .scent-name, .testimonial blockquote';
try {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('lit'); io.unobserve(e.target); } });
  }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll(ILLUME).forEach((el) => io.observe(el));
} catch (e) {
  document.querySelectorAll(ILLUME).forEach((el) => el.classList.add('lit'));
}

if (api) api.focusChapter(0);

window.addEventListener('resize', () => { if (api) api.resize(); });
