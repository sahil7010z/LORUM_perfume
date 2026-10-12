// scene.js — AURUM Engine Agent
// The cinematic WebGL stage: black void, warm gold key light, gold rim, bloom,
// real env reflections, glossy reflective floor, soft contact shadows.
// Five bottles arranged as stations receding into -Z. Camera dollies along the
// path on scroll; focusChapter eases to a station and tints light + background
// toward that perfume's accent. NO gsap dependency — pure per-frame lerp.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { loadModels } from './models.js?v=6';

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Station spacing along the receding path.
const STATION_GAP = 7.0; // units between bottles along -Z
const STATION_X = 0.9; // alternating X stagger amplitude
const CAM_BACK = 7.7; // how far the camera sits in front of a station (+Z) — pulled back so the bottle is smaller and clears the side panels
const CAM_HEIGHT = 1.35; // camera eye height framed for compact vertical bottle
const CAM_LOOK_Y = 0.95; // look-at centered on the vertical bottle body
const FRAME_PAN_X = 1.9; // horizontal pan so the bottle clears the side text column

function stationPosition(i) {
  // Horizontal gallery: bottles in a row along +X so the camera pans sideways, room to room.
  return new THREE.Vector3(i * STATION_GAP, 0, 0);
}

// Vertical gradient CanvasTexture for scene.background (near-black -> faint warm).
function makeGradientTexture() {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#06060a');
  g.addColorStop(0.55, '#0a0705');
  g.addColorStop(1, '#140d06');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Soft radial contact-shadow sprite texture (dark blob, transparent edges).
function makeContactShadowTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function initScene({ canvas, perfumes, palette, onLoadProgress }) {
  // -------------------------------------------------------------------------
  // Renderer
  // -------------------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0); // transparent: each room's own DOM background shows behind the bottle
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // -------------------------------------------------------------------------
  // Scene + camera
  // -------------------------------------------------------------------------
  const scene = new THREE.Scene();
  const bgTexture = makeGradientTexture(); // retained only as a harmless ref; not shown
  scene.background = null; // transparent canvas; each room supplies its own distinct DOM background
  // no fog: it would tint the bottle silhouette against the transparent backdrop

  const camera = new THREE.PerspectiveCamera(
    38,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, CAM_HEIGHT, CAM_BACK);

  // -------------------------------------------------------------------------
  // Environment reflections (PMREM + RoomEnvironment)
  // -------------------------------------------------------------------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;
  try {
    envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
  } catch (e) {
    console.warn('AURUM: RoomEnvironment failed, reflections degraded.', e);
  }

  // -------------------------------------------------------------------------
  // Lighting — dramatic, warm, gold.
  // -------------------------------------------------------------------------
  const goldKey = new THREE.SpotLight(0xffd590, 28, 0, Math.PI / 6, 0.55, 1.2);
  goldKey.position.set(6, 9, 6); // upper-right
  goldKey.castShadow = true;
  goldKey.shadow.mapSize.set(2048, 2048);
  goldKey.shadow.bias = -0.0006;
  goldKey.shadow.camera.near = 1;
  goldKey.shadow.camera.far = 60;
  scene.add(goldKey);
  scene.add(goldKey.target);

  const rimLight = new THREE.DirectionalLight(0xffd9a0, 0.9); // warm gold rim behind
  rimLight.position.set(-4, 5, -8);
  scene.add(rimLight);

  const hemi = new THREE.HemisphereLight(0x2a1f12, 0x0a0705, 0.35); // low fill
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x140e08, 0.4);
  scene.add(ambient);

  // -------------------------------------------------------------------------
  // Reflective glossy floor.
  // -------------------------------------------------------------------------
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0806,
    metalness: 0.85,
    roughness: 0.4,
    envMapIntensity: 0.65
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  // floor NOT added: on a transparent canvas it would cover each room's background image
  // and recreate the half-black / half-gold split.

  // -------------------------------------------------------------------------
  // Post-processing: bloom on highlights.
  // -------------------------------------------------------------------------
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42, // strength
    0.5, // radius
    0.9 // threshold
  );
  composer.addPass(bloom);

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  const count = perfumes.length;
  const contactShadowTex = makeContactShadowTexture();
  const bottles = []; // { group, perfume, basePos, shadow, targetScale, curScale }
  let modelsLoaded = false;
  let firstRendered = false;

  // Scroll/focus targets (smoothed each frame).
  let scrollProgress = 0; // 0..1 across all stations
  let targetProgress = 0;
  let activeChapter = 0;
  let focusF = 0; // smoothed float easing toward activeChapter (drives camera + bottle visibility)
  let stageTarget = 0; // hero is goddess-only: bottles stay hidden until a room enters (scroll sets stage 1)
  let stageCur = 0;
  // Drag-to-rotate the active bottle (mouse interactive).
  let elapsed = 0;
  let dragging = false, lastPX = 0, lastPY = 0, userYaw = 0, userPitch = 0, autoSpin = 0, lastDragT = -1e9;

  // Background + key-light color lerp targets.
  const bgBase = new THREE.Color(0x140d06);
  const bgTargetColor = new THREE.Color(perfumes[0]?.accent || palette?.amber || '#c8772f');
  const bgCurColor = bgTargetColor.clone();
  const keyBase = new THREE.Color(0xffd590);
  const keyTargetColor = new THREE.Color(perfumes[0]?.accent || '#ffd590');
  const keyCurColor = keyTargetColor.clone();

  // Smoothed camera helpers.
  const camTarget = new THREE.Vector3().copy(camera.position);
  const lookCur = new THREE.Vector3(0, CAM_LOOK_Y, 0);
  const lookTarget = new THREE.Vector3(0, CAM_LOOK_Y, 0);

  // Background canvas top color we tint (recreate texture cheaply on change).
  function tintBackground(accentColor) {
    const c = bgTexture.image;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    const warm = bgBase.clone().lerp(accentColor, 0.5);
    g.addColorStop(0, '#06060a');
    g.addColorStop(0.55, '#0a0705');
    g.addColorStop(1, `#${warm.getHexString()}`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    bgTexture.needsUpdate = true;
  }

  // -------------------------------------------------------------------------
  // Build station scaffolding immediately (placeholders swapped when loaded).
  // -------------------------------------------------------------------------
  function addContactShadow(pos) {
    const mat = new THREE.SpriteMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.4, 3.4, 1);
    sprite.position.set(pos.x, 0.02, pos.z);
    // Lay the sprite flat on the floor.
    sprite.material.rotation = 0;
    sprite.center.set(0.5, 0.5);
    // Use a plane instead for flat orientation.
    return sprite;
  }

  // Flat shadow plane (more reliable than a billboard sprite on the floor).
  function addShadowPlane(pos) {
    const mat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
      blending: THREE.NormalBlending
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.015, pos.z);
    scene.add(mesh);
    return mesh;
  }

  // -------------------------------------------------------------------------
  // ready: load models, seat them, do first render.
  // -------------------------------------------------------------------------
  const ready = (async () => {
    let loaded;
    try {
      loaded = await loadModels(perfumes, (pct) => {
        if (typeof onLoadProgress === 'function') onLoadProgress(pct);
      });
    } catch (e) {
      console.warn('AURUM: loadModels rejected unexpectedly.', e);
      loaded = perfumes.map((p) => ({ group: new THREE.Group(), perfume: p }));
    }

    loaded.forEach(({ group, perfume }, i) => {
      const pos = stationPosition(i);
      group.position.x += pos.x;
      group.position.z += pos.z;
      // base already seated at y=0 by normalizeGroup
      group.rotation.y = (i % 2 === 0 ? -0.35 : 0.35);
      scene.add(group);

      // Collect materials so non-active bottles can fade fully out — one clean
      // bottle on stage at a time, never a neighbor bleeding into the active chapter.
      const mats = [];
      group.traverse((o) => {
        if (o.isMesh && o.material) {
          const list = Array.isArray(o.material) ? o.material : [o.material];
          list.forEach((m) => { m.transparent = true; mats.push(m); });
        }
      });

      const shadow = addShadowPlane(pos);

      bottles.push({
        group,
        perfume,
        basePos: pos.clone(),
        shadow,
        mats,
        targetScale: 1,
        curScale: 1,
        curOpacity: i === 0 ? 1 : 0,
        spin: 0
      });
    });

    modelsLoaded = true;

    // Prime camera + colors to chapter 0.
    focusChapter(0);
    focusF = 0;
    updateCameraFromFocus();
    // Hard-set the smoothed values so the first frame is composed, not mid-lerp.
    camera.position.copy(camTarget);
    lookCur.copy(lookTarget);
    camera.lookAt(lookCur);

    // First render.
    renderer.render(scene, camera);
    firstRendered = true;
    return true;
  })();

  // -------------------------------------------------------------------------
  // Public: setProgress(p 0..1) — dolly along the path.
  // -------------------------------------------------------------------------
  function setProgress(p) {
    targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  // setStage(v): 1 = bottles on stage (hero + horizontal rooms), 0 = fade out (vertical outro).
  function setStage(v) {
    stageTarget = THREE.MathUtils.clamp(typeof v === 'number' ? v : (v ? 1 : 0), 0, 1);
  }

  // -------------------------------------------------------------------------
  // Public: focusChapter(i) — ease camera to station i, tint light + bg.
  // -------------------------------------------------------------------------
  function focusChapter(i) {
    const idx = THREE.MathUtils.clamp(Math.round(i), 0, count - 1);
    activeChapter = idx;

    const accent = new THREE.Color(perfumes[idx]?.accent || '#c8a14e');
    bgTargetColor.copy(accent);
    keyTargetColor.copy(keyBase).lerp(accent, 0.5);

    // Per-bottle emphasis.
    bottles.forEach((b, bi) => {
      b.targetScale = bi === idx ? 1.08 : 0.98;
    });

    // Camera station target (used when not scroll-driven; setProgress overrides
    // smoothly via the continuous path in the render loop).
    const station = stationPosition(idx);
    camTarget.set(station.x * 0.5, CAM_HEIGHT, station.z + CAM_BACK);
    lookTarget.set(station.x, CAM_LOOK_Y, station.z);
  }

  // -------------------------------------------------------------------------
  // Continuous camera path from scrollProgress (smooth across stations).
  // -------------------------------------------------------------------------
  function updateCameraFromProgress() {
    // Map global progress 0..1 onto a continuous Z that travels past all stations.
    const lastZ = -(count - 1) * STATION_GAP;
    const camZ = THREE.MathUtils.lerp(CAM_BACK, lastZ + CAM_BACK, scrollProgress);

    // Gentle X sway following the staggered stations.
    const fStation = scrollProgress * (count - 1);
    const swayX = Math.sin(fStation * Math.PI) * STATION_X * 0.5;

    camTarget.set(swayX * 0.5, CAM_HEIGHT, camZ);

    // Look at the nearest station ahead.
    const lookZ = camZ - CAM_BACK;
    const nearStation = Math.round(scrollProgress * (count - 1));
    const sx = stationPosition(THREE.MathUtils.clamp(nearStation, 0, count - 1)).x;
    lookTarget.set(sx, CAM_LOOK_Y, lookZ);
  }

  // Camera framing driven by the focused chapter (section-aligned), not raw global
  // scroll, so the bottle on stage always matches the centered scent's copy.
  function focusStation(f) {
    const a = Math.max(0, Math.floor(f));
    const b = Math.min(count - 1, Math.ceil(f));
    const t = f - Math.floor(f);
    return stationPosition(a).lerp(stationPosition(b), t);
  }
  function updateCameraFromFocus() {
    const st = focusStation(focusF);
    // Camera slides sideways with the focused room; bottle stays centred in the gap
    // between the room's left copy and its right-hand image plate.
    camTarget.set(st.x, CAM_HEIGHT, CAM_BACK);
    lookTarget.set(st.x, CAM_LOOK_Y, 0);
  }

  // -------------------------------------------------------------------------
  // Render loop — pure lerp smoothing, render via composer.
  // -------------------------------------------------------------------------
  let rafId = null;
  let disposed = false;
  const clock = new THREE.Clock();
  const spinSpeed = REDUCED_MOTION ? 0 : 0.22;

  function frame() {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    // Smooth scroll progress (kept for subtle effects), then ease the focus float
    // toward the section-aligned active chapter and frame the camera on it.
    scrollProgress += (targetProgress - scrollProgress) * Math.min(1, dt * 4);
    focusF += (activeChapter - focusF) * Math.min(1, dt * 3.5);
    updateCameraFromFocus();

    // Single smoothing source is focusF (eased above); copy straight through so the
    // camera glides with it instead of chasing a moving target (no compounding lag).
    camera.position.copy(camTarget);
    lookCur.copy(lookTarget);
    camera.lookAt(lookCur);

    // Smooth background + key light color.
    bgCurColor.lerp(bgTargetColor, Math.min(1, dt * 2.5));
    keyCurColor.lerp(keyTargetColor, Math.min(1, dt * 2.5));
    goldKey.color.copy(keyCurColor);

    // Aim the key light at the focused station (smoothly follows the camera).
    const aim = focusStation(focusF);
    goldKey.target.position.lerp(
      new THREE.Vector3(aim.x, CAM_LOOK_Y, aim.z),
      Math.min(1, dt * 2.5)
    );
    goldKey.target.updateMatrixWorld();

    // Per-bottle: slow rotation on the active one + scale emphasis + visibility falloff.
    const fStation = focusF;
    // Stage visibility comes from the scroll module: 1 across hero + rooms, 0 in the
    // vertical outro, so bottles never collide with the craft / closing sections.
    stageCur += (stageTarget - stageCur) * Math.min(1, dt * 3);
    const stageOpacity = stageCur;
    // Auto-spin resumes ~2.5s after the user stops dragging the bottle.
    if (!dragging && (elapsed - lastDragT) > 2.5) autoSpin += spinSpeed * dt;
    bottles.forEach((b, i) => {
      b.curScale += (b.targetScale - b.curScale) * Math.min(1, dt * 4);
      const base = b.group.userData.__baseScale || (b.group.userData.__baseScale = b.group.scale.x);
      b.group.scale.setScalar(base * b.curScale);

      // Only the bottle near the camera's current station is visible; neighbors fade.
      const dist = Math.abs(i - fStation);
      const targetOpacity = THREE.MathUtils.clamp(1 - (dist - 0.4) / 0.5, 0, 1);
      b.curOpacity += (targetOpacity - b.curOpacity) * Math.min(1, dt * 5);
      const op = b.curOpacity * stageOpacity;
      for (let mi = 0; mi < b.mats.length; mi += 1) b.mats[mi].opacity = op;
      b.group.visible = i !== 0 && i !== 1 && i !== 2 && i !== 3 && (op > 0.02);
      if (b.shadow) { b.shadow.material.opacity = (i === 0 || i === 1 || i === 2 || i === 3 ? 0 : 0.85 * op); b.shadow.visible = i !== 0 && i !== 1 && i !== 2 && i !== 3 && (op > 0.02); }

      if (i === activeChapter) {
        b.group.rotation.y = autoSpin + userYaw;
        b.group.rotation.x += (userPitch - b.group.rotation.x) * Math.min(1, dt * 8);
      }
    });

    renderer.render(scene, camera);
    if (!firstRendered && modelsLoaded) firstRendered = true;
  }
  frame();

  // -------------------------------------------------------------------------
  // Resize.
  // -------------------------------------------------------------------------
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  window.addEventListener('resize', resize);

  // ---- Drag-to-rotate the active bottle (mouse interactive) ----
  function onPointerDown(e) {
    if (stageCur < 0.4) return; // only when a bottle is on stage (in the rooms)
    if (e.pointerType && e.pointerType !== 'mouse') return; // touch must scroll the page, not hijack into a drag-rotate
    if (e.target && e.target.closest && e.target.closest('a, button, input, .room-side, #nav')) return; // let UI take its clicks
    dragging = true; lastPX = e.clientX; lastPY = e.clientY; lastDragT = elapsed;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
    lastPX = e.clientX; lastPY = e.clientY;
    userYaw += dx * 0.01;
    userPitch = THREE.MathUtils.clamp(userPitch + dy * 0.008, -0.6, 0.6);
    lastDragT = elapsed;
  }
  function onPointerUp() { dragging = false; lastDragT = elapsed; }
  window.addEventListener('pointerdown', onPointerDown, true); // capture: catches the bottle area regardless of any overlay
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  // -------------------------------------------------------------------------
  // Dispose.
  // -------------------------------------------------------------------------
  function dispose() {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          Object.values(m).forEach((v) => {
            if (v && v.isTexture) v.dispose?.();
          });
          m.dispose?.();
        });
      }
    });
    bgTexture.dispose?.();
    contactShadowTex.dispose?.();
    if (envRT) envRT.dispose?.();
    pmrem.dispose?.();
    composer.dispose?.();
    renderer.dispose?.();
  }

  // -------------------------------------------------------------------------
  // window.__aurum hook for Playwright / integrator.
  // -------------------------------------------------------------------------
  const api = {
    ready,
    setProgress,
    setStage,
    focusChapter,
    resize,
    dispose,
    isWebGL: true,
    count,
    getCameraPos: () => [camera.position.x, camera.position.y, camera.position.z],
    getActiveChapter: () => activeChapter,
    getStage: () => stageCur,
    getYaw: () => userYaw,
    loaded: () => modelsLoaded && firstRendered
  };

  window.__aurum = {
    setProgress,
    setStage,
    focusChapter,
    getCameraPos: api.getCameraPos,
    getActiveChapter: api.getActiveChapter,
    getStage: api.getStage,
    getYaw: api.getYaw,
    count,
    isWebGL: true,
    loaded: api.loaded
  };

  return api;
}
