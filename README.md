# 🏝️ Island Quest v1

A browser-based 3D open-world exploration game built with [Babylon.js](https://www.babylonjs.com/) and [Vite](https://vitejs.dev/). Choose your hero, explore a richly detailed island, collect items, talk to NPCs, and discover hidden teleport portals — all running natively in the browser with full desktop and mobile support.

---

## 📸 Screenshots

> Launch the game with `npm run dev` and open [http://localhost:3000](http://localhost:3000) to see it in action.

---

## 🎮 Gameplay

### Game Flow
1. **Character Selection** — Pick one of 5 unique heroes, each with their own name, colour, and personality.
2. **Open-World Exploration** — Roam a 200 × 200 unit island with varied terrain: hills, platforms, paths, beaches, and water.
3. **Collectibles** — Find and collect 10 glowing pickups scattered across the island. Progress is tracked in the HUD.
4. **NPCs** — Encounter 8 characters (Villager, Merchant, Guard, Elder, Wanderer) who each have their own dialog.
5. **Checkpoints** — Activate checkpoint flags at the cardinal points of the island to save your respawn location.
6. **Portals & Teleport Pads** — Step into portals or onto glowing teleport pads to jump between distant areas instantly.
7. **Signs** — Read informational signs placed around the world.

### Heroes
| # | Name | Colour |
|---|------|--------|
| 1 | Azure Knight | Blue |
| 2 | Ember Rogue | Red/Orange |
| 3 | Forest Druid | Green |
| 4 | Shadow Mage | Purple |
| 5 | Sun Warrior | Yellow/Gold |

---

## 🕹️ Controls

### Desktop
| Action | Input |
|--------|-------|
| Move | `W A S D` or Arrow Keys |
| Jump | `Space` |
| Rotate Camera | Right-click + drag |
| Zoom Camera | Scroll wheel |
| Lock Camera | Right-click (pointer lock) |

### Mobile
| Action | Input |
|--------|-------|
| Move | Left virtual joystick |
| Jump | `JUMP` button |
| Rotate Camera | Touch-drag on the right half of the screen |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

### Installation
```bash
# Clone the repository
git clone https://github.com/aqili/Island-quest-v1.git
cd Island-quest-v1

# Install dependencies
npm install
```

### Development
```bash
npm run dev
```
Opens the game automatically at [http://localhost:3000](http://localhost:3000) with hot-module reloading.

### Production Build
```bash
npm run build       # Outputs to dist/
npm run preview     # Preview the production build locally
```

---

## 🗂️ Project Structure

```
Island-quest-v1/
├── public/
│   └── assets/
│       ├── characters/
│       │   ├── playable/        # hero1–5.gltf — selectable heroes
│       │   └── npcs/            # npc1–5.gltf  — NPC models
│       ├── props/               # tree, rock, house, tower, bridge (.gltf)
│       ├── world/               # terrain_main, spawn_area, hills, platforms (.gltf)
│       └── interactions/        # portal, pickup, sign, checkpoint, teleport_pad (.gltf)
├── src/
│   ├── main.js                  # Entry point — engine init & scene management
│   ├── scenes/
│   │   ├── CharacterSelectionScene.js  # Hero picker with 3D stage
│   │   └── MainWorldScene.js           # Open-world game scene
│   ├── systems/
│   │   ├── PlayerSystem.js      # Movement, camera, input, jump physics
│   │   ├── NPCSystem.js         # NPC placement, animation, dialog
│   │   └── InteractionSystem.js # Pickups, portals, signs, checkpoints, teleports
│   ├── ui/
│   │   ├── HUD.js               # Score, messages, minimap, controls panel
│   │   └── MobileControls.js    # DOM-based virtual joystick & jump button
│   └── loaders/
│       └── AssetLoader.js       # Async GLTF loading utility
├── index.html                   # App shell with loading screen
├── vite.config.js               # Vite + Rollup build config
└── vercel.json                  # Vercel deployment config
```

---

## 🏗️ Architecture

### Scene Manager
`main.js` owns a central `sceneManager` that handles scene transitions with a loading-screen overlay. When switching scenes the old scene is disposed before the new one initialises.

### System Architecture
Each gameplay domain is isolated into its own system class:

| System | Responsibility |
|--------|---------------|
| `PlayerSystem` | Input, physics, camera, character mesh |
| `NPCSystem` | NPC meshes, placement, idle animation, dialog |
| `InteractionSystem` | Proximity detection, pickups, portals, signs, checkpoints |

Systems hook into the Babylon.js render loop and communicate back to the scene via callbacks (e.g. `onMessageChange`, `onCollectiblesChange`).

### Asset Strategy
- All 3D models are GLTF files with no embedded materials; materials are applied in code for easy colour variation.
- Each system tries to load its GLTF assets first and falls back to procedurally generated meshes (capsules, spheres, cylinders) so the game is always playable even without asset files.
- Mesh *instances* are used wherever the same geometry appears multiple times (trees, rocks, etc.) to minimise GPU memory usage.

### Build Optimisation
Vite is configured to split Babylon.js into its own Rollup chunk so the engine can be cached independently from game code:

```js
// vite.config.js
manualChunks: {
  babylonjs: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui', '@babylonjs/materials']
}
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@babylonjs/core` | ^7.26.2 | 3D engine, scene, physics |
| `@babylonjs/gui` | ^7.26.2 | In-game UI (HUD) |
| `@babylonjs/loaders` | ^7.26.2 | GLTF model loading |
| `@babylonjs/materials` | ^7.26.2 | Extended material library |
| `vite` *(dev)* | ^5.4.11 | Dev server & bundler |

---

## ☁️ Deployment

The project is pre-configured for [Vercel](https://vercel.com/):

```json
// vercel.json — key settings
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

To deploy, push to your Vercel-linked repository or run `vercel --prod` from the project root.

---

## 🗺️ Roadmap Ideas

- Quest & objective system
- Inventory and item equipping
- Combat mechanics
- Multiplayer support
- More island biomes and dungeons
- Save/load via `localStorage`

---

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details (if present).
