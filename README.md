<div align="center">

  <img src="assets/img/lorum-logo-transparent.png" alt="LORUM Maison Noir Logo" width="120" style="margin-bottom: 16px;" />

  # LORUM &middot; MAISON NOIR

  ### *Haute Parfumerie &middot; Immersive 3D Experience*

  <p align="center">
    A luxury, scroll-driven WebGL digital maison sculpted in deep noir and liquid gold.<br/>
    Inspired by high-fashion editorial aesthetics, tactile materials, and butter-smooth motion.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Three.js-r160-c8a14e?style=for-the-badge&logo=three.js&logoColor=white" alt="Three.js" />
    <img src="https://img.shields.io/badge/GSAP-3.12%20ScrollTrigger-ecc878?style=for-the-badge&logo=greensock&logoColor=black" alt="GSAP" />
    <img src="https://img.shields.io/badge/Lenis-Smooth%20Scroll-black?style=for-the-badge" alt="Lenis" />
    <img src="https://img.shields.io/badge/Stack-No%20Build%20Step-7c5e26?style=for-the-badge" alt="No Build Step" />
  </p>

  <br />

  <a href="#quick-start"><strong>Quick Start</strong></a> &bull;
  <a href="#experience-features"><strong>Experience Features</strong></a> &bull;
  <a href="#the-collection"><strong>The Collection</strong></a> &bull;
  <a href="#architecture"><strong>Architecture</strong></a> &bull;
  <a href="#deployment"><strong>Deployment</strong></a>

</div>

<br />

---

## Overview

**LORUM Maison Noir** is a cinematic, web-native digital showcase built for a high-luxury fragrance house. It fuses neoclassical marble sculpture with contemporary WebGL rendering, smooth momentum scrolling, and bespoke interactive bottle displays.

Built completely **without bundlers, build steps, or frameworks** — running entirely on standard HTML5, CSS custom properties, and native ES modules with CDN import maps.

---

## Experience Features

- 🏛️ **Classical Goddess Hero:** Dramatic opening stage with cinematic golden smoke trails and responsive editorial typography.
- 🧴 **Pinned Horizontal Gallery:** Vertical scroll translates seamlessly into a horizontal gallery walk through the five fragrance chambers (`#rooms`).
- 💎 **Bespoke 3D & Parallax Bottles:** 
  - Real-time 3D models with procedural transmission, bloom, and `RoomEnvironment` specular reflections.
  - Bespoke haute parfumerie bottles featuring interactive **cursor-tracked 3D perspective parallax tilt** and atmospheric colored halos.
- ✨ **Scroll-Illuminated Typography:** Headings dynamically catch ambient golden light and specular glints as they enter the viewport.
- 🧈 **Buttered Inertia Scrolling:** Studio-grade momentum scrolling driven by **Lenis** synced with **GSAP ScrollTrigger**.
- 🛡️ **Graceful Fallback Resilience:**
  - Automatic WebGL detection with an elegant noir-gradient CSS stage fallback.
  - Built-in broken-image guard replacing missing assets with deterministic branded SVG gradients.
  - IntersectionObserver safety timers ensuring content never remains hidden.
- ⚡ **Zero-Dependency Architecture:** Opens instantly with any static server. No `node_modules`, no compile times, no hydration delays.

---

## The Collection

| # | Fragrance | Olfactory Accord | Character & Profile | Visual Presentation |
| :-: | :--- | :--- | :--- | :--- |
| **01** | **Noctis Lorum** | Amber Oriental Opulence | Black Saffron, Turkish Rose, Aged Amber | Faceted Amber Crystal & Gold Shield |
| **02** | **Ferrum Noir** | Woody Aromatic Power | Black Pepper, Haitian Vetiver, Smoked Leather | Royal Sapphire Glass & Baroque Filigree |
| **03** | **Velours Or** | Refined Classic Luxury | Honeyed Tobacco, Orris Suede, Bourbon Vanilla | Ruby Crystal Diamond & Gold Tracery |
| **04** | **Lume Vif** | Fresh Spicy Modern | Calabrian Bergamot, Sichuan Pepper, Ambroxan | Ivory Porcelain & Sculpted Silver Wings |
| **05** | **Soleil Clair** | Radiant Citrus Opener | Bitter Orange, Neroli, White Musk | Sunlit Golden Crystal Flacon |

---

## Quick Start

Run locally with zero installation. All dependencies are loaded dynamically via browser import maps.

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/lorum-maison-noir.git
cd lorum-maison-noir
```

### 2. Launch the local server
```bash
python serve.py
```
> `serve.py` sends `no-store` headers to ensure GLB models, shaders, and ES modules refresh immediately during development without aggressive browser caching.

Alternatively, use any static file server:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

### 3. Open in Browser
Visit [http://localhost:8000](http://localhost:8000) to view the experience.

---

## Architecture & File Tree

```
lorum-maison-noir/
├── assets/
│   ├── bottles/             # High-res SVG and PNG bottle artwork
│   ├── img/                 # Atmospheric backdrops, goddess plates & LORUM logos
│   │   ├── lorum-logo.png   # 1024x1024 master logo (pure black #000 for screen-blend)
│   │   ├── lorum-logo-transparent.png # Cutout alpha logo for headers & navigation
│   │   ├── bottle-01.png    # Noctis Lorum transparent presentation asset
│   │   ├── bottle-02.png    # Ferrum Noir transparent presentation asset
│   │   ├── bottle-03.png    # Velours Or transparent presentation asset
│   │   └── bottle-04.png    # Lume Vif transparent presentation asset
│   ├── models/              # Active Three.js GLTF/GLB models (bottle-01..05.glb)
│   └── og/                  # Social share card & vector assets
├── css/
│   └── styles.css           # Complete design system: fluid clamp typography, pills, glows
├── js/
│   ├── backgrounds.js       # Fallback on-brand SVG gradient generators
│   ├── config.js            # Single source of truth: brand copy, notes, palette & metadata
│   ├── guards.js            # WebGL detection, broken image recovery & safety reveal nets
│   ├── main.js              # Application orchestrator, dynamic crossfades & scroll illuminate
│   ├── models.js            # Three.js GLTFLoader + Meshopt decoder & material enhancement
│   ├── scene.js             # WebGL engine: cameras, spotlight arrays & drag-to-rotate
│   ├── scroll.js            # Lenis smooth scroll & GSAP horizontal track pinning
│   └── ui.js                # Custom cursor, magnetic CTAs, counters & 3D bottle tilt
├── .gitignore               # Clean git exclusions
├── index.html               # Semantic markup, importmap configuration & chapter layout
├── README.md                # Project documentation
└── serve.py                 # Development HTTP server with hard no-store caching headers
```

---

## Customization

The entire maison's brand identity, color scheme, and fragrance catalog is centralized in [`js/config.js`](js/config.js):

```javascript
export const AURUM = {
  brand: {
    name: 'LORUM',
    tagline: 'The Weight of Gold',
    intro: 'Enter the house where gold is poured, not worn.',
    // ...
  },
  palette: {
    bg: '#070504',
    gold: '#c8a14e',
    goldBright: '#ecc878',
    // ...
  },
  perfumes: [
    // Modify titles, note pyramids, and accent colors here
  ]
};
```

---

## Deployment

Because this project is 100% static with no build requirements, it deploys instantly to any modern edge host:

### Netlify
```bash
netlify deploy --prod --dir="."
```

### Vercel
```bash
vercel --prod
```

### GitHub Pages / Cloudflare Pages
Simply point the root deployment directory to `/` with no build command.
