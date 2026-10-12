// AURUM — js/scroll.js
// Pinned HORIZONTAL room gallery. Vertical scroll translates the content track
// sideways (room to room). Each room drives a distinct background + its bottle.
// Bottles are only "on stage" inside the rooms (hero + outro are bottle-free).
//
// API: initScroll({ onProgress, onChapter, onStage, onBg }) -> { destroy }
//   onProgress(0..1) across rooms ; onChapter(i) active room ;
//   onStage(0|1) bottle stage on/off ; onBg('hero'|'closing'|number) section background.
// Degrades to a vertical fallback (html.no-gsap) on any import failure.

const noop = () => {};

export function initScroll({ onProgress = noop, onChapter = noop, onStage = noop, onBg = noop } = {}) {
  let destroyed = false;
  const cleanups = [];
  let activeChapter = -1;
  let stageState = -1;
  let bgKey = null;

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const roomEls = () => Array.from(document.querySelectorAll('.room-content'));

  function emitChapter(i) { if (i === activeChapter) return; activeChapter = i; try { onChapter(i); } catch (e) {} }
  function emitProgress(p) { try { onProgress(Math.min(1, Math.max(0, p || 0))); } catch (e) {} }
  function emitStage(v) { if (v === stageState) return; stageState = v; try { onStage(v); } catch (e) {} }
  function emitBg(k) { if (k === bgKey) return; bgKey = k; try { onBg(k); } catch (e) {} }

  // Only the large, fine-pointer (desktop) view gets the pinned horizontal gallery.
  // On phones/tablets the pin's shift collapses and rooms 2..n become unreachable, so
  // route touch/narrow viewports to the vertical fallback where every room is scrollable.
  const DESKTOP_MQ = '(min-width:901px) and (pointer:fine)';

  async function bootEnhanced() {
    if (!window.matchMedia(DESKTOP_MQ).matches) { bootNative(); return true; }
    const [{ default: Lenis }, gsapMod, stMod] = await Promise.all([
      import('lenis'),
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ]);
    const gsap = gsapMod.gsap || gsapMod.default || gsapMod;
    const ScrollTrigger = stMod.ScrollTrigger || stMod.default || stMod;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: reduceMotion ? 0.1 : 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: !reduceMotion,
      smoothTouch: false,
      touchMultiplier: 1.4,
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;

    const section = document.getElementById('rooms');
    const track = section.querySelector('.rooms-content-track');
    const rooms = roomEls();
    const n = rooms.length || 1;
    const shift = () => Math.max(0, track.scrollWidth - window.innerWidth);

    // Baseline: hero is bottle-free, welcome background on.
    emitStage(0);
    emitBg('hero');
    emitProgress(0);

    const tween = gsap.to(track, {
      x: () => -shift(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + shift(),
        pin: true,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // Snap to the nearest room so the scroll never rests BETWEEN bottles (which
        // leaves the 3D model off-centre / mid-fade and reads as "no bottle"). Each
        // room is at progress k/(n-1); settle to it ~0.06s after the wheel stops.
        snap: {
          snapTo: (value) => Math.round(value * (n - 1)) / (n - 1),
          duration: { min: 0.2, max: 0.6 },
          delay: 0.06,
          ease: 'power2.inOut',
        },
        onEnter: () => emitStage(1),
        onEnterBack: () => emitStage(1),
        onLeaveBack: () => { emitStage(0); emitBg('hero'); },
        onUpdate: (self) => {
          emitStage(1);
          emitProgress(self.progress);
          const idx = Math.max(0, Math.min(n - 1, Math.round(self.progress * (n - 1))));
          emitBg(idx);
          emitChapter(idx);
        },
      },
    });
    const hST = tween.scrollTrigger;

    // Closing: bottle-free, dedicated background.
    const closing = document.getElementById('closing');
    let closeST = null;
    if (closing) {
      closeST = ScrollTrigger.create({
        trigger: closing,
        start: 'top center',
        end: 'bottom top',
        onEnter: () => { emitStage(0); emitBg('closing'); },
      });
    }

    // Bottle-free vertical sections each get a distinct goddess backdrop.
    const sectionBg = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return null;
      return ScrollTrigger.create({
        trigger: el, start: 'top center', end: 'bottom center',
        onEnter: () => { emitStage(0); emitBg(key); },
        onEnterBack: () => { emitStage(0); emitBg(key); },
      });
    };
    const manifestoST = sectionBg('manifesto', 'manifesto');
    const voicesST = sectionBg('testimonials', 'voices');

    // Click a fragrance -> glide to its room.
    function scrollToRoom(i) {
      if (!hST) return;
      const total = hST.end - hST.start;
      const frac = n > 1 ? (i / (n - 1)) : 0;
      // Nudge off the exact pin boundaries: landing precisely at progress 0 (or 1) skips
      // the pin's onUpdate, so the bottle stage + room background never engage. A tiny
      // inset puts us inside the pin where onUpdate authoritatively sets stage/bg/chapter.
      const eps = 0.014;
      const clamped = Math.min(1 - eps, Math.max(eps, frac));
      const target = hST.start + clamped * total;
      lenis.scrollTo(target, { duration: reduceMotion ? 0 : 1.5 });
    }
    const onRoomClick = (e) => {
      const a = e.target.closest && e.target.closest('a[data-room]');
      if (!a) return;
      e.preventDefault();
      scrollToRoom(parseInt(a.getAttribute('data-room'), 10) || 0);
    };
    document.addEventListener('click', onRoomClick);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    let rt;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(refresh, 200); };
    window.addEventListener('resize', onResize);
    setTimeout(refresh, 300);

    cleanups.push(() => {
      gsap.ticker.remove(tick);
      window.removeEventListener('load', refresh);
      window.removeEventListener('resize', onResize);
      clearTimeout(rt);
      document.removeEventListener('click', onRoomClick);
      try { hST.kill(); tween.kill(); } catch (e) {}
      try { closeST && closeST.kill(); } catch (e) {}
      try { lenis.destroy(); } catch (e) {}
    });
    return true;
  }

  // ---- Vertical fallback (no GSAP) ----
  function bootNative() {
    document.documentElement.classList.add('no-gsap');
    const rooms = roomEls();
    const n = rooms.length || 1;
    let ticking = false;
    const measure = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best = 0, bd = Infinity;
      rooms.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs((r.top + r.height / 2) - mid);
        if (d < bd) { bd = d; best = i; }
      });
      const anyRoom = rooms.some((el) => {
        const r = el.getBoundingClientRect();
        return r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
      });
      const hero = document.getElementById('hero');
      const heroVisible = hero ? hero.getBoundingClientRect().bottom > window.innerHeight * 0.4 : false;
      const closing = document.getElementById('closing');
      const closingVisible = closing ? closing.getBoundingClientRect().top < window.innerHeight * 0.6 : false;
      if (heroVisible) { emitStage(0); emitBg('hero'); }
      else if (closingVisible) { emitStage(0); emitBg('closing'); }
      else if (anyRoom) { emitStage(1); emitBg(best); emitChapter(best); }
      emitProgress(n > 1 ? best / (n - 1) : 0);
    };
    const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(measure); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    const onRoomClick = (e) => {
      const a = e.target.closest && e.target.closest('a[data-room]');
      if (!a) return;
      e.preventDefault();
      const el = rooms[parseInt(a.getAttribute('data-room'), 10) || 0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    document.addEventListener('click', onRoomClick);
    requestAnimationFrame(measure);
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('click', onRoomClick);
    });
  }

  (async () => {
    try {
      // Crossing the desktop/mobile breakpoint swaps scroll modes; re-init cleanly.
      const mq = window.matchMedia(DESKTOP_MQ);
      const onMqChange = () => { try { window.location.reload(); } catch (e) {} };
      if (mq.addEventListener) mq.addEventListener('change', onMqChange);
      else if (mq.addListener) mq.addListener(onMqChange);
      await bootEnhanced();
    }
    catch (err) {
      if (destroyed) return;
      cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) {} });
      try { console.warn('[AURUM] horizontal scroll failed, vertical fallback.', err); } catch (e) {}
      bootNative();
    }
  })();

  return { destroy() { destroyed = true; cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) {} }); } };
}

export default { initScroll };
