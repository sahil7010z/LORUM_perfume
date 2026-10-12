// AURUM — js/ui.js
// Motion agent. All non-scroll micro-interactions.
//
// API (exact):
//   export function initUI({ perfumes }) -> void
//
// Provides:
//   - IntersectionObserver reveals (.reveal -> .is-in, staggered)
//   - custom gold cursor ring (skips coarse/touch pointers)
//   - nav hide-on-down / show-on-up + .is-solid after hero
//   - animated counters (.counter[data-target])
//   - seamless infinite marquee of the 5 scent names
//   - magnetic .btn hover
//
// Hard rule: reveals only ENHANCE. Never permanently hide content. The safety
// net that force-shows everything lives in guards.js (installSafetyReveal).

export function initUI({ perfumes = [] } = {}) {
  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finePointer =
    window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  buildMarquee(perfumes);
  initReveals(reduceMotion);
  initCounters(reduceMotion);
  initNav();
  initBottleTilt();
  if (finePointer && !reduceMotion) {
    initCursor();
    initMagnetic();
  }
}

// ---------------------------------------------------------------------------
// 1. Scroll reveals — IntersectionObserver adds .is-in (staggered)
// ---------------------------------------------------------------------------
function initReveals(reduceMotion) {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  // Reduced motion or no IO support: just show everything immediately.
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;

        // Stagger: explicit via data-reveal index, else by sibling order.
        let delay = parseFloat(el.getAttribute('data-reveal'));
        if (Number.isNaN(delay)) {
          const sibs = el.parentElement
            ? Array.from(el.parentElement.querySelectorAll(':scope > .reveal'))
            : [el];
          const i = Math.max(0, sibs.indexOf(el));
          delay = i * 90; // ms
        } else {
          delay = delay * 1000; // data-reveal given in seconds
        }

        el.style.transitionDelay = `${Math.min(delay, 700)}ms`;
        el.classList.add('is-in');
        io.unobserve(el);
      });
    },
    { root: null, rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// 2. Custom gold cursor ring
// ---------------------------------------------------------------------------
function initCursor() {
  // Drive the existing .cursor element that the stylesheet styles
  // (.cursor / .cursor.is-active / .cursor.is-grow) and toggle html.cursor-on
  // so the native cursor is hidden only while the custom ring is live.
  let ring = document.querySelector('.cursor');
  if (!ring) {
    ring = document.createElement('div');
    ring.className = 'cursor';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(ring);
  }
  document.documentElement.classList.add('cursor-on');

  let rx = window.innerWidth / 2, ry = window.innerHeight / 2; // ring (lagged)
  let mx = rx, my = ry; // mouse (instant)
  let raf = null;
  let activated = false;

  const loop = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    if (Math.abs(mx - rx) > 0.3 || Math.abs(my - ry) > 0.3) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  };

  const onMove = (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!activated) {
      activated = true;
      ring.classList.add('is-active');
    }
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const grow = () => ring.classList.add('is-grow');
  const shrink = () => ring.classList.remove('is-grow');

  const interactiveSel = 'a, button, .btn, [data-cursor], input, textarea, [role="button"]';
  const onOver = (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) grow();
  };
  const onOut = (e) => {
    if (e.target.closest && e.target.closest(interactiveSel)) shrink();
  };

  window.addEventListener('mousemove', onMove, { passive: true });
  document.addEventListener('mouseover', onOver, { passive: true });
  document.addEventListener('mouseout', onOut, { passive: true });
  document.addEventListener('mouseleave', () => { ring.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { ring.style.opacity = ''; });
}

// ---------------------------------------------------------------------------
// 3. Nav — hide on scroll down, show on up, solidify after hero
// ---------------------------------------------------------------------------
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const hero = document.getElementById('hero');
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = window.scrollY;

    // Solid background once past hero (or 80vh as a fallback).
    const heroH = hero ? hero.offsetHeight : window.innerHeight * 0.8;
    nav.classList.toggle('is-solid', y > heroH * 0.6);

    // Hide on downward scroll past a threshold, show on upward.
    if (y > lastY && y > 160) {
      nav.classList.add('is-hidden');
    } else {
      nav.classList.remove('is-hidden');
    }
    lastY = y;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// ---------------------------------------------------------------------------
// 4. Counters — animate .counter[data-target] when scrolled into view
// ---------------------------------------------------------------------------
function initCounters(reduceMotion) {
  const counters = Array.from(document.querySelectorAll('.counter[data-target]'));
  if (!counters.length) return;

  const run = (el) => {
    const target = parseFloat(el.getAttribute('data-target')) || 0;
    const decimals = (el.getAttribute('data-decimals') | 0) || 0;
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';

    if (reduceMotion) {
      el.textContent = prefix + target.toFixed(decimals) + suffix;
      return;
    }

    const dur = 1600;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const val = target * ease(p);
      el.textContent = prefix + val.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    };
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(run);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach((el) => io.observe(el));
}

// ---------------------------------------------------------------------------
// 5. Seamless infinite marquee of the 5 scent names
// ---------------------------------------------------------------------------
function buildMarquee(perfumes) {
  const host = document.querySelector('.marquee');
  if (!host) return;

  const names =
    perfumes && perfumes.length
      ? perfumes.map((p) => p.name)
      : ['Noctis Lorum', 'Ferrum Noir', 'Velours Or', 'Lume Vif', 'Soleil Clair'];

  // One logical sequence of the names with a diamond separator.
  const makeTrack = () => {
    const track = document.createElement('div');
    track.className = 'marquee-track';
    track.setAttribute('aria-hidden', 'false');
    names.forEach((name) => {
      const item = document.createElement('span');
      item.className = 'marquee-item';
      item.textContent = name;
      const sep = document.createElement('span');
      sep.className = 'marquee-sep';
      sep.textContent = '◈'; // ◈ diamond
      track.appendChild(item);
      track.appendChild(sep);
    });
    return track;
  };

  host.innerHTML = '';
  // Two identical tracks; CSS animates each by -50% for a seamless loop.
  const a = makeTrack();
  const b = makeTrack();
  b.setAttribute('aria-hidden', 'true');
  host.appendChild(a);
  host.appendChild(b);
}

// ---------------------------------------------------------------------------
// 6. Magnetic hover on .btn
// ---------------------------------------------------------------------------
function initMagnetic() {
  const btns = Array.from(document.querySelectorAll('.btn, [data-magnetic]'));
  if (!btns.length) return;

  const strength = 0.32;

  btns.forEach((btn) => {
    let raf = null;
    let tx = 0, ty = 0, cx = 0, cy = 0;

    const animate = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      btn.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(animate);
      } else {
        raf = null;
      }
    };

    const onMove = (e) => {
      const r = btn.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * strength;
      ty = (e.clientY - (r.top + r.height / 2)) * strength;
      if (!raf) raf = requestAnimationFrame(animate);
    };

    const onLeave = () => {
      tx = 0; ty = 0;
      if (!raf) raf = requestAnimationFrame(animate);
    };

    btn.addEventListener('mousemove', onMove);
    btn.addEventListener('mouseleave', onLeave);
  });
}

// ---------------------------------------------------------------------------
// 7. Interactive 3D Parallax Tilt on Custom Bottles
// ---------------------------------------------------------------------------
function initBottleTilt() {
  const holders = document.querySelectorAll('.room-bottle-holder');
  if (!holders.length) return;

  holders.forEach((holder) => {
    const img = holder.querySelector('.room-bottle-img');
    if (!img) return;

    let raf = null;
    let curRotX = 0, curRotY = 0, targetRotX = 0, targetRotY = 0;

    const update = () => {
      curRotX += (targetRotX - curRotX) * 0.12;
      curRotY += (targetRotY - curRotY) * 0.12;
      img.style.transform = `perspective(1000px) rotateX(${curRotX.toFixed(2)}deg) rotateY(${curRotY.toFixed(2)}deg) scale3d(1.03, 1.03, 1.03)`;
      if (Math.abs(targetRotX - curRotX) > 0.05 || Math.abs(targetRotY - curRotY) > 0.05) {
        raf = requestAnimationFrame(update);
      } else {
        raf = null;
      }
    };

    holder.addEventListener('mousemove', (e) => {
      const rect = holder.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetRotY = x * 22;
      targetRotX = -y * 18;
      if (!raf) raf = requestAnimationFrame(update);
    });

    holder.addEventListener('mouseleave', () => {
      targetRotX = 0;
      targetRotY = 0;
      if (!raf) raf = requestAnimationFrame(update);
    });
  });
}

