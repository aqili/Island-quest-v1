import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import '@babylonjs/loaders/glTF';

import { PlayerSystem } from '../systems/PlayerSystem.js';
import { NPCSystem } from '../systems/NPCSystem.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { HUD } from '../ui/HUD.js';

export class MainWorldScene {
  constructor(engine, canvas, sceneManager, selectedCharacter) {
    this.engine = engine;
    this.canvas = canvas;
    this.sceneManager = sceneManager;
    this.selectedCharacter = selectedCharacter;
    this.scene = null;
    this.playerSystem = null;
    this.npcSystem = null;
    this.interactionSystem = null;
    this.hud = null;
  }

  async init(progressCb = () => {}) {
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.4, 0.65, 0.9, 1);
    this.scene.gravity = new Vector3(0, -0.5, 0);
    this.scene.collisionsEnabled = true;

    // Create a bootstrap camera immediately so the render loop never hits "No camera defined"
    this._bootstrapCamera = new ArcRotateCamera(
      '_bootstrapCam', -Math.PI / 2, Math.PI / 3, 20,
      new Vector3(0, 1, 0), this.scene
    );
    this._bootstrapCamera.minZ = 0.1;
    this.scene.activeCamera = this._bootstrapCamera;

    progressCb(5, 'Setting up environment...');
    this._setupFog();
    this._setupLights();

    progressCb(15, 'Building terrain...');
    await this._buildTerrain();

    progressCb(35, 'Placing props...');
    await this._buildProps();

    progressCb(50, 'Spawning player...');
    this.playerSystem = new PlayerSystem(this.scene, this.canvas, this.selectedCharacter);
    await this.playerSystem.init();

    // Bootstrap camera no longer needed once the player camera is active
    if (this._bootstrapCamera) {
      this._bootstrapCamera.dispose();
      this._bootstrapCamera = null;
    }

    progressCb(65, 'Spawning NPCs...');
    this.npcSystem = new NPCSystem(this.scene);
    await this.npcSystem.init();

    progressCb(80, 'Setting up interactions...');
    this.interactionSystem = new InteractionSystem(this.scene, this.playerSystem);
    await this.interactionSystem.init();

    progressCb(90, 'Building HUD...');
    this.hud = new HUD(this.scene, this.playerSystem, this.interactionSystem, this.sceneManager);
    this.hud.init();

    progressCb(100, 'Done!');
    return this.scene;
  }

  _setupFog() {
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogColor = new Color3(0.6, 0.75, 0.95);
    this.scene.fogDensity = 0.008;
  }

  _setupLights() {
    const ambient = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.7;
    ambient.diffuse = new Color3(0.9, 0.95, 1.0);
    ambient.groundColor = new Color3(0.3, 0.4, 0.2);
    ambient.specular = new Color3(0.1, 0.1, 0.1);

    this.sun = new DirectionalLight('sun', new Vector3(-1, -2, -1).normalize(), this.scene);
    this.sun.intensity = 1.2;
    this.sun.diffuse = new Color3(1.0, 0.95, 0.8);
    this.sun.specular = new Color3(0.5, 0.45, 0.3);
    this.sun.position = new Vector3(50, 80, 50);
  }

  async _buildTerrain() {
    const groundMat = new StandardMaterial('groundMat', this.scene);
    groundMat.diffuseColor = new Color3(0.35, 0.6, 0.25);
    groundMat.specularColor = new Color3(0.1, 0.1, 0.1);

    const ground = MeshBuilder.CreateGround('ground', { width: 200, height: 200, subdivisions: 8 }, this.scene);
    ground.material = groundMat;
    ground.checkCollisions = true;
    ground.receiveShadows = true;

    const waterMat = new StandardMaterial('waterMat', this.scene);
    waterMat.diffuseColor = new Color3(0.1, 0.4, 0.8);
    waterMat.specularColor = new Color3(0.6, 0.7, 1.0);
    waterMat.specularPower = 128;
    waterMat.alpha = 0.85;
    const water = MeshBuilder.CreateGround('water', { width: 250, height: 250 }, this.scene);
    water.position.y = -0.8;
    water.material = waterMat;

    const sandMat = new StandardMaterial('sandMat', this.scene);
    sandMat.diffuseColor = new Color3(0.85, 0.78, 0.55);
    const beach = MeshBuilder.CreateGround('beach', { width: 220, height: 220 }, this.scene);
    beach.position.y = -0.3;
    beach.material = sandMat;
    beach.checkCollisions = true;

    const pathMat = new StandardMaterial('pathMat', this.scene);
    pathMat.diffuseColor = new Color3(0.7, 0.65, 0.45);

    const pathConfigs = [
      { w: 4, h: 60, x: 0, y: 0.02, z: 0 },
      { w: 60, h: 4, x: 0, y: 0.02, z: 0 },
      { w: 4, h: 40, x: 30, y: 0.02, z: 30, rx: 0.3 },
      { w: 4, h: 30, x: -30, y: 0.02, z: -20 },
    ];
    for (const c of pathConfigs) {
      const p = MeshBuilder.CreateGround(`path_${Math.random()}`, { width: c.w, height: c.h }, this.scene);
      p.position = new Vector3(c.x, c.y, c.z);
      p.material = pathMat;
      if (c.rx) p.rotation.y = c.rx;
    }

    const hillConfigs = [
      { x: 25, z: 25, r: 14, h: 5 },
      { x: -30, z: 30, r: 12, h: 4 },
      { x: -25, z: -25, r: 10, h: 3.5 },
      { x: 30, z: -20, r: 11, h: 4.5 },
      { x: 0, z: 50, r: 16, h: 6 },
      { x: 0, z: -50, r: 15, h: 5.5 },
    ];
    for (const c of hillConfigs) {
      const hillMat = new StandardMaterial(`hillMat_${c.x}`, this.scene);
      hillMat.diffuseColor = new Color3(0.3, 0.55, 0.22);
      const hill = MeshBuilder.CreateSphere(`hill_${c.x}`, { diameterX: c.r * 2, diameterY: c.h * 2, diameterZ: c.r * 2, segments: 8 }, this.scene);
      hill.position = new Vector3(c.x, -c.h * 0.7, c.z);
      hill.material = hillMat;
      hill.checkCollisions = true;
    }

    const platformPositions = [
      { x: 25, y: 3, z: 25, w: 10, d: 10 },
      { x: -28, y: 2.5, z: 28, w: 8, d: 8 },
      { x: -20, y: 2, z: -25, w: 6, d: 6 },
      { x: 30, y: 3, z: -18, w: 8, d: 8 },
      { x: 0, y: 4, z: 50, w: 12, d: 10 },
    ];
    const platMat = new StandardMaterial('platMat', this.scene);
    platMat.diffuseColor = new Color3(0.55, 0.5, 0.4);
    for (const p of platformPositions) {
      const plat = MeshBuilder.CreateBox(`plat_${p.x}`, { width: p.w, height: 0.5, depth: p.d }, this.scene);
      plat.position = new Vector3(p.x, p.y, p.z);
      plat.material = platMat;
      plat.checkCollisions = true;
      plat.receiveShadows = true;
    }

    try {
      await SceneLoader.ImportMeshAsync('', '', '/assets/world/terrain_main.gltf', this.scene);
      await SceneLoader.ImportMeshAsync('', '', '/assets/world/spawn_area.gltf', this.scene);
    } catch (e) {
      // use procedural terrain
    }
  }

  async _buildProps() {
    const propMat = new StandardMaterial('propMat', this.scene);
    propMat.diffuseColor = new Color3(0.4, 0.7, 0.3);

    const treePositions = [
      [5, 0, 15], [-8, 0, 12], [12, 0, -5], [-15, 0, -8],
      [20, 0, 20], [-20, 0, 20], [20, 0, -20], [-20, 0, -20],
      [35, 0, 10], [-35, 0, 10], [10, 0, 35], [-10, 0, -35],
      [40, 0, 0], [-40, 0, 0], [0, 0, 40], [0, 0, -40],
      [45, 0, 30], [-45, 0, -30], [30, 0, 45], [-30, 0, -45],
      [50, 0, 15], [-50, 0, -15], [15, 0, 50], [-15, 0, -50],
      [8, 0, -18], [-12, 0, 22], [18, 0, 8], [-22, 0, -12],
    ];

    let treeLoaded = false;
    let tree2Loaded = false;
    let treeTemplate = null;
    let tree2Template = null;

    try {
      const r = await SceneLoader.ImportMeshAsync('', '', '/assets/props/tree.gltf', this.scene);
      if (r.meshes.length > 0) {
        treeTemplate = r.meshes[0];
        treeTemplate.isVisible = false;
        r.meshes.forEach(m => { m.isVisible = false; });
        treeLoaded = true;
      }
    } catch (e) {}

    try {
      const r = await SceneLoader.ImportMeshAsync('', '', '/assets/props/tree2.gltf', this.scene);
      if (r.meshes.length > 0) {
        tree2Template = r.meshes[0];
        tree2Template.isVisible = false;
        r.meshes.forEach(m => { m.isVisible = false; });
        tree2Loaded = true;
      }
    } catch (e) {}

    for (let i = 0; i < treePositions.length; i++) {
      const [x, , z] = treePositions[i];
      this._createTree(x, z, i % 3 === 0);
    }

    const rockPositions = [
      [6, 0, -10], [-6, 0, 10], [14, 0, 5], [-14, 0, -5],
      [22, 0, -12], [-22, 0, 12], [28, 0, 8], [-28, 0, -8],
      [32, 0, 25], [-32, 0, -25], [18, 0, -30], [-18, 0, 30],
    ];
    for (const [x, , z] of rockPositions) {
      this._createRock(x, z, Math.random() > 0.5);
    }

    const housePositions = [
      { x: 15, z: 15, rot: 0 },
      { x: -15, z: 15, rot: Math.PI / 4 },
      { x: -15, z: -15, rot: Math.PI / 2 },
      { x: 30, z: -30, rot: Math.PI / 3 },
    ];
    for (const hp of housePositions) {
      this._createHouse(hp.x, hp.z, hp.rot);
    }

    const towerPositions = [
      { x: 0, z: 50 },
      { x: 50, z: 0 },
      { x: -50, z: -50 },
    ];
    for (const tp of towerPositions) {
      this._createTower(tp.x, tp.z);
    }

    this._createBridge(0, 0, 8);

    try {
      const results = [
        SceneLoader.ImportMeshAsync('', '', '/assets/world/hill.gltf', this.scene),
        SceneLoader.ImportMeshAsync('', '', '/assets/world/platform_large.gltf', this.scene),
        SceneLoader.ImportMeshAsync('', '', '/assets/world/platform_small.gltf', this.scene),
      ];
      await Promise.allSettled(results);
    } catch (e) {}
  }

  _createTree(x, z, variant = false) {
    const trunkMat = new StandardMaterial(`trunkMat_${x}_${z}`, this.scene);
    trunkMat.diffuseColor = new Color3(0.5, 0.3, 0.1);
    const foliageMat = new StandardMaterial(`foliageMat_${x}_${z}`, this.scene);
    foliageMat.diffuseColor = variant
      ? new Color3(0.2, 0.6, 0.2)
      : new Color3(0.1, 0.5, 0.15);

    const h = 2 + Math.random() * 2;
    const trunk = MeshBuilder.CreateCylinder(`trunk_${x}_${z}`, { height: h, diameterBottom: 0.3, diameterTop: 0.2 }, this.scene);
    trunk.position = new Vector3(x, h / 2, z);
    trunk.material = trunkMat;
    trunk.checkCollisions = true;

    const foliage = MeshBuilder.CreateSphere(`foliage_${x}_${z}`, { diameter: 2 + Math.random() * 1.5, segments: 6 }, this.scene);
    foliage.position = new Vector3(x, h + 0.8, z);
    foliage.material = foliageMat;
    foliage.checkCollisions = false;
  }

  _createRock(x, z, variant = false) {
    const rockMat = new StandardMaterial(`rockMat_${x}_${z}`, this.scene);
    rockMat.diffuseColor = variant ? new Color3(0.5, 0.5, 0.55) : new Color3(0.45, 0.42, 0.38);
    const s = 0.5 + Math.random() * 1.2;
    const rock = MeshBuilder.CreatePolyhedron(`rock_${x}_${z}`, { type: 1, size: s }, this.scene);
    rock.position = new Vector3(x, s * 0.3, z);
    rock.rotation = new Vector3(Math.random(), Math.random() * Math.PI, Math.random());
    rock.material = rockMat;
    rock.checkCollisions = true;
  }

  _createHouse(x, z, rot = 0) {
    const wallMat = new StandardMaterial(`wallMat_${x}`, this.scene);
    wallMat.diffuseColor = new Color3(0.9, 0.85, 0.75);
    const roofMat = new StandardMaterial(`roofMat_${x}`, this.scene);
    roofMat.diffuseColor = new Color3(0.7, 0.25, 0.1);

    const walls = MeshBuilder.CreateBox(`houseWall_${x}`, { width: 5, height: 3, depth: 5 }, this.scene);
    walls.position = new Vector3(x, 1.5, z);
    walls.rotation.y = rot;
    walls.material = wallMat;
    walls.checkCollisions = true;

    const roof = MeshBuilder.CreateCylinder(`houseRoof_${x}`, { diameterBottom: 7, diameterTop: 0, height: 3, tessellation: 4 }, this.scene);
    roof.position = new Vector3(x, 4.5, z);
    roof.rotation.y = rot + Math.PI / 4;
    roof.material = roofMat;

    const doorMat = new StandardMaterial(`doorMat_${x}`, this.scene);
    doorMat.diffuseColor = new Color3(0.4, 0.25, 0.1);
    const door = MeshBuilder.CreateBox(`houseDoor_${x}`, { width: 1, height: 2, depth: 0.1 }, this.scene);
    door.position = new Vector3(
      x + Math.sin(rot) * 2.55,
      1,
      z + Math.cos(rot) * 2.55
    );
    door.material = doorMat;
  }

  _createTower(x, z) {
    const stoneMat = new StandardMaterial(`towerMat_${x}`, this.scene);
    stoneMat.diffuseColor = new Color3(0.55, 0.52, 0.48);
    const tower = MeshBuilder.CreateCylinder(`tower_${x}`, { height: 12, diameter: 4, tessellation: 8 }, this.scene);
    tower.position = new Vector3(x, 6, z);
    tower.material = stoneMat;
    tower.checkCollisions = true;

    const roofMat = new StandardMaterial(`towerRoofMat_${x}`, this.scene);
    roofMat.diffuseColor = new Color3(0.3, 0.2, 0.15);
    const roof = MeshBuilder.CreateCylinder(`towerRoof_${x}`, { diameterBottom: 5, diameterTop: 0, height: 4, tessellation: 8 }, this.scene);
    roof.position = new Vector3(x, 14, z);
    roof.material = roofMat;
  }

  _createBridge(x, z, len) {
    const bridgeMat = new StandardMaterial(`bridgeMat`, this.scene);
    bridgeMat.diffuseColor = new Color3(0.6, 0.5, 0.35);
    const bridge = MeshBuilder.CreateBox('bridge', { width: 3, height: 0.3, depth: len }, this.scene);
    bridge.position = new Vector3(x, 0.1, z);
    bridge.material = bridgeMat;
    bridge.checkCollisions = true;

    for (let i = 0; i < 4; i++) {
      const post = MeshBuilder.CreateBox(`bridgePost_${i}`, { width: 0.2, height: 1.2, depth: 0.2 }, this.scene);
      post.position = new Vector3(
        x + (i < 2 ? -1.2 : 1.2),
        0.7,
        z - len / 2 + (i % 2) * len
      );
      post.material = bridgeMat;
    }

    try {
      SceneLoader.ImportMeshAsync('', '', '/assets/props/bridge.gltf', this.scene).then(r => {
        if (r.meshes.length > 0) {
          r.meshes.forEach(m => m.position = new Vector3(x, 0, z));
        }
      });
    } catch (e) {}
  }

  dispose() {
    if (this._bootstrapCamera) {
      this._bootstrapCamera.dispose();
      this._bootstrapCamera = null;
    }
    if (this.playerSystem) this.playerSystem.dispose();
    if (this.npcSystem) this.npcSystem.dispose();
    if (this.interactionSystem) this.interactionSystem.dispose();
    if (this.hud) this.hud.dispose();
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
  }
}
