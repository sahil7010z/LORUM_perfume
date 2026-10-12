// models.js — AURUM Engine Agent
// Loads the 5 perfume bottle GLBs with GLTFLoader + MeshoptDecoder.
// Recentres, uniform-scales to ~2.6 units tall, seats each bottle near y=0,
// enhances materials (envMapIntensity, correct color space), reports progress.
// A single model failing to load NEVER rejects — it substitutes a glass-ish
// placeholder Group so the experience always shows 5 stations.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const TARGET_HEIGHT = 1.6; // world units tall — compact and perfectly proportioned

// ---------------------------------------------------------------------------
// Material enhancement — make every bottle read EXPENSIVE.
// ---------------------------------------------------------------------------
function enhanceMaterials(root, perfume) {
  const liquid = new THREE.Color(perfume?.liquidColor || '#a86a28');
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      if (!mat) return;

      // Correct color space on any base/emissive maps.
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if (mat.emissiveMap) mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;

      // Reflections from the scene environment.
      if ('envMapIntensity' in mat) mat.envMapIntensity = 1.3;

      // Heuristic: a near-transparent / glassy material gets liquid warmth.
      const looksGlassy =
        ('transmission' in mat && mat.transmission > 0) ||
        (mat.transparent && mat.opacity < 1) ||
        (mat.name && /glass|liquid|juice|bottle/i.test(mat.name));

      if (looksGlassy && 'transmission' in mat) {
        mat.transmission = Math.max(mat.transmission, 0.85);
        mat.thickness = mat.thickness || 1.2;
        mat.ior = mat.ior || 1.45;
        mat.roughness = Math.min(mat.roughness ?? 0.1, 0.12);
        mat.metalness = 0.0;
        mat.attenuationColor = liquid;
        mat.attenuationDistance = mat.attenuationDistance || 1.6;
        mat.transparent = true;
        mat.clearcoat = mat.clearcoat ?? 1.0;
        mat.clearcoatRoughness = 0.06;
      } else if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        // Caps / collars / metal trim: polish them.
        if (mat.metalness > 0.4) {
          mat.roughness = Math.min(mat.roughness ?? 0.3, 0.28);
        }
      }
      mat.needsUpdate = true;
    });
  });
}

// ---------------------------------------------------------------------------
// Recentre to origin, uniform-scale to ~TARGET_HEIGHT tall, seat base at y=0,
// and wrap in a pivot container so scene rotation preserves vertical uprightness.
// ---------------------------------------------------------------------------
function normalizeGroup(rawModel) {
  rawModel.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(rawModel);
  if (box.isEmpty()) return rawModel;
  let size = box.getSize(new THREE.Vector3());

  // Orient upright: if depth Z is larger than height Y, rotate -90 deg on X.
  // If width X is larger than height Y, rotate +90 deg on Z.
  if (size.z > size.y * 1.15) {
    rawModel.rotation.x = -Math.PI / 2;
  } else if (size.x > size.y * 1.15) {
    rawModel.rotation.z = Math.PI / 2;
  }
  rawModel.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(rawModel);
  size = box.getSize(new THREE.Vector3());

  const height = size.y || 1;
  const scale = TARGET_HEIGHT / height;
  rawModel.scale.setScalar(scale);

  // Re-measure after scaling, then recentre X/Z to origin and seat base at y=0
  rawModel.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(rawModel);
  const center = box.getCenter(new THREE.Vector3());
  rawModel.position.x -= center.x;
  rawModel.position.z -= center.z;
  rawModel.position.y -= box.min.y; // base sits on the floor plane
  rawModel.updateMatrixWorld(true);

  // Wrap in a dedicated pivot group so scene.js can freely animate pivot.rotation.y (yaw)
  // and pivot.rotation.x (user pitch) without ever flattening or overriding the bottle's upright orientation!
  const pivot = new THREE.Group();
  pivot.add(rawModel);
  return pivot;
}

// ---------------------------------------------------------------------------
// Glassy placeholder used when a GLB fails — never a blank station.
// ---------------------------------------------------------------------------
function makePlaceholder(perfume) {
  const group = new THREE.Group();
  const accent = new THREE.Color(perfume?.accent || '#c8a14e');
  const liquid = new THREE.Color(perfume?.liquidColor || '#a86a28');

  // Glass body.
  const bodyGeo = new THREE.BoxGeometry(1.25, 1.9, 0.7);
  bodyGeo.translate(0, 0.95, 0);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.9,
    thickness: 1.2,
    ior: 1.45,
    roughness: 0.06,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    attenuationColor: liquid,
    attenuationDistance: 1.4,
    envMapIntensity: 1.3,
    transparent: true
  });
  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Liquid core (slightly smaller, warm).
  const coreGeo = new THREE.BoxGeometry(1.05, 1.35, 0.52);
  coreGeo.translate(0, 0.72, 0);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: liquid,
    roughness: 0.25,
    metalness: 0,
    transmission: 0.5,
    thickness: 0.8,
    ior: 1.4,
    transparent: true,
    envMapIntensity: 1.1
  });
  group.add(new THREE.Mesh(coreGeo, coreMat));

  // Gold cap.
  const capGeo = new THREE.CylinderGeometry(0.42, 0.5, 0.55, 48);
  capGeo.translate(0, 2.18, 0);
  const capMat = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 1,
    roughness: 0.22,
    envMapIntensity: 1.3
  });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.castShadow = true;
  group.add(cap);

  group.userData.isPlaceholder = true;
  return normalizeGroup(group);
}

// ---------------------------------------------------------------------------
// Public API: loadModels(perfumes, onProgress)
//   -> resolves to [{ group:THREE.Group, perfume }] in perfumes order.
// ---------------------------------------------------------------------------
export async function loadModels(perfumes, onProgress) {
  const loader = new GLTFLoader();
  try {
    loader.setMeshoptDecoder(MeshoptDecoder);
  } catch (e) {
    // MeshoptDecoder optional — uncompressed GLBs still load.
    console.warn('AURUM: MeshoptDecoder unavailable, continuing.', e);
  }

  const total = perfumes.length;
  let completed = 0;
  const report = () => {
    if (typeof onProgress === 'function') {
      onProgress(Math.round((completed / total) * 100));
    }
  };
  report(); // emit 0%

  const loadOne = (perfume) =>
    new Promise((resolve) => {
      let group;
      loader.load(
        perfume.model + '?b=11',
        (gltf) => {
          try {
            const rawScene = gltf.scene || gltf.scenes?.[0] || new THREE.Group();
            enhanceMaterials(rawScene, perfume);
            group = normalizeGroup(rawScene);
          } catch (err) {
            console.warn('AURUM: post-process failed for', perfume.id, err);
            group = makePlaceholder(perfume);
          }
          completed += 1;
          report();
          resolve({ group, perfume });
        },
        undefined, // per-file progress is coarse; we report on completion
        (err) => {
          console.warn('AURUM: failed to load', perfume.model, '-> placeholder.', err);
          group = makePlaceholder(perfume);
          completed += 1;
          report();
          resolve({ group, perfume });
        }
      );
    });

  // Load in parallel; order is preserved because we map perfumes -> promises.
  const results = await Promise.all(perfumes.map(loadOne));

  // Guarantee 100% even if rounding left us short.
  completed = total;
  report();

  return results;
}
