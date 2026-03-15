import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

const INTERACTION_CONFIGS = [
  {
    type: 'portal',
    path: '/assets/interactions/portal.gltf',
    positions: [
      new Vector3(25, 0.5, 25),
      new Vector3(-25, 0.5, -25),
    ],
    color: new Color3(0.4, 0.2, 1.0),
    label: '🌀 Portal',
    radius: 2.5,
  },
  {
    type: 'pickup',
    path: '/assets/interactions/pickup.gltf',
    positions: [
      new Vector3(5, 1, 5),
      new Vector3(-5, 1, -5),
      new Vector3(10, 1, -10),
      new Vector3(-10, 1, 10),
      new Vector3(20, 1, 0),
      new Vector3(-20, 1, 0),
      new Vector3(0, 1, 20),
      new Vector3(0, 1, -20),
      new Vector3(8, 1, 15),
      new Vector3(-8, 1, -15),
    ],
    color: new Color3(1.0, 0.85, 0.1),
    label: '⭐ Pickup',
    radius: 1.5,
  },
  {
    type: 'sign',
    path: '/assets/interactions/sign.gltf',
    positions: [
      new Vector3(2, 0, 0),
      new Vector3(-8, 0, 5),
      new Vector3(12, 0, -8),
    ],
    color: new Color3(0.6, 0.4, 0.1),
    label: '📋 Sign',
    radius: 2.0,
  },
  {
    type: 'checkpoint',
    path: '/assets/interactions/checkpoint.gltf',
    positions: [
      new Vector3(0, 0, 25),
      new Vector3(25, 0, 0),
      new Vector3(-25, 0, 0),
      new Vector3(0, 0, -25),
    ],
    color: new Color3(0.2, 0.9, 0.4),
    label: '🚩 Checkpoint',
    radius: 2.5,
  },
  {
    type: 'teleport_pad',
    path: '/assets/interactions/teleport_pad.gltf',
    positions: [
      new Vector3(-25, 0, 25),
      new Vector3(30, 0, -30),
    ],
    color: new Color3(0.1, 0.8, 1.0),
    label: '✨ Teleport',
    radius: 2.0,
  },
];

const SIGN_MESSAGES = [
  'Welcome to Island Quest! Explore freely.',
  'Danger ahead! Tread carefully.',
  'The ancient tower holds great power.',
];

const PORTAL_DESTINATIONS = [
  new Vector3(-25, 1, -25),
  new Vector3(25, 1, 25),
];

const TELEPORT_DESTINATIONS = [
  new Vector3(30, 1, -30),
  new Vector3(-25, 1, 25),
];

export class InteractionSystem {
  constructor(scene, playerSystem) {
    this.scene = scene;
    this.playerSystem = playerSystem;
    this.objects = [];
    this.activeMessage = null;
    this.collectiblesCount = 0;
    this.onMessageChange = null;
    this.onCollectiblesChange = null;
  }

  async init() {
    let signIdx = 0;
    let portalIdx = 0;
    let teleIdx = 0;

    for (const config of INTERACTION_CONFIGS) {
      for (let i = 0; i < config.positions.length; i++) {
        const pos = config.positions[i];

        let extraData = {};
        if (config.type === 'sign') {
          extraData.message = SIGN_MESSAGES[signIdx % SIGN_MESSAGES.length];
          signIdx++;
        }
        if (config.type === 'portal') {
          extraData.destination = PORTAL_DESTINATIONS[portalIdx % PORTAL_DESTINATIONS.length];
          portalIdx++;
        }
        if (config.type === 'teleport_pad') {
          extraData.destination = TELEPORT_DESTINATIONS[teleIdx % TELEPORT_DESTINATIONS.length];
          teleIdx++;
        }

        const obj = await this._createInteractionObject(
          `${config.type}_${i}`,
          config.type,
          pos,
          config.color,
          config.label,
          config.radius,
          extraData
        );
        this.objects.push(obj);
      }
    }

    this.scene.registerBeforeRender(() => this._update());
    return this;
  }

  async _createInteractionObject(id, type, position, color, label, radius, extraData = {}) {
    const root = new TransformNode(`interact_${id}`, this.scene);
    root.position = position.clone();

    const mat = new StandardMaterial(`interactMat_${id}`, this.scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.4);

    let mesh;
    switch (type) {
      case 'portal': {
        mesh = MeshBuilder.CreateTorus(`portal_mesh_${id}`, {
          diameter: 2.4,
          thickness: 0.3,
          tessellation: 24,
        }, this.scene);
        mesh.material = mat;
        const innerMat = new StandardMaterial(`portalInner_${id}`, this.scene);
        innerMat.diffuseColor = color;
        innerMat.emissiveColor = color.scale(0.8);
        innerMat.alpha = 0.6;
        const innerDisc = MeshBuilder.CreateDisc(`portalInner_${id}`, { radius: 1.1, tessellation: 24 }, this.scene);
        innerDisc.material = innerMat;
        innerDisc.parent = root;
        innerDisc.position.y = 1.5;
        break;
      }
      case 'pickup': {
        mesh = MeshBuilder.CreateSphere(`pickup_${id}`, { diameter: 0.5 }, this.scene);
        mat.emissiveColor = color.scale(0.7);
        mesh.material = mat;
        break;
      }
      case 'sign': {
        const postMat = new StandardMaterial(`signPost_${id}`, this.scene);
        postMat.diffuseColor = new Color3(0.5, 0.3, 0.1);
        const post = MeshBuilder.CreateBox(`signPost_${id}`, { width: 0.1, height: 1.5, depth: 0.1 }, this.scene);
        post.parent = root;
        post.position.y = 0.75;
        post.material = postMat;

        mesh = MeshBuilder.CreateBox(`sign_${id}`, { width: 1.2, height: 0.6, depth: 0.05 }, this.scene);
        mesh.material = mat;
        mesh.position.y = 1.5;
        break;
      }
      case 'checkpoint': {
        const baseMat = new StandardMaterial(`cpBase_${id}`, this.scene);
        baseMat.diffuseColor = new Color3(0.4, 0.4, 0.4);
        const base = MeshBuilder.CreateCylinder(`cpBase_${id}`, { height: 0.2, diameter: 1.5, tessellation: 8 }, this.scene);
        base.parent = root;
        base.position.y = 0.1;
        base.material = baseMat;

        const flagMat = new StandardMaterial(`cpFlag_${id}`, this.scene);
        flagMat.diffuseColor = color;
        flagMat.emissiveColor = color.scale(0.5);
        const pole = MeshBuilder.CreateCylinder(`cpPole_${id}`, { height: 3, diameter: 0.08, tessellation: 6 }, this.scene);
        pole.parent = root;
        pole.position.y = 1.5;
        pole.material = baseMat;

        mesh = MeshBuilder.CreatePlane(`cpFlag_${id}`, { width: 0.8, height: 0.5 }, this.scene);
        mesh.material = flagMat;
        mesh.position.y = 3.1;
        mesh.position.x = 0.4;
        break;
      }
      case 'teleport_pad': {
        mesh = MeshBuilder.CreateCylinder(`telepad_${id}`, { height: 0.15, diameter: 2.5, tessellation: 16 }, this.scene);
        mat.emissiveColor = color.scale(0.6);
        mat.alpha = 0.85;
        mesh.material = mat;
        const innerMat2 = new StandardMaterial(`teleInner_${id}`, this.scene);
        innerMat2.emissiveColor = color;
        innerMat2.alpha = 0.5;
        const inner = MeshBuilder.CreateCylinder(`teleInner_${id}`, { height: 0.1, diameter: 1.8, tessellation: 16 }, this.scene);
        inner.parent = root;
        inner.position.y = 0.08;
        inner.material = innerMat2;
        break;
      }
      default:
        mesh = MeshBuilder.CreateBox(`generic_${id}`, { size: 0.5 }, this.scene);
        mesh.material = mat;
    }

    if (mesh) {
      mesh.parent = root;
      if (type !== 'sign') {
        if (type === 'portal') mesh.position.y = 1.5;
        else if (type === 'pickup') mesh.position.y = 0.6;
        else if (type === 'teleport_pad') mesh.position.y = 0;
      }
    }

    // Load interaction GLTF from /public/assets/interactions/
    // Quaternius models have their own materials; preserve them and scale to fit the scene.
    try {
      const cfgPath = INTERACTION_CONFIGS.find(c => c.type === type)?.path;
      if (cfgPath) {
        const result = await SceneLoader.ImportMeshAsync('', '', cfgPath, this.scene);
        if (result.meshes.length > 0) {
          // Attach root to the interaction TransformNode
          const rootMesh = result.meshes[0];
          rootMesh.parent = root;
          rootMesh.position = new Vector3(0, 0, 0);
          const s = type === 'pickup' ? 0.5 : (type === 'sign' ? 1.0 : 1.2);
          rootMesh.scaling = new Vector3(s, s, s);

          // Show all meshes with their original Quaternius materials
          result.meshes.forEach(m => { m.isVisible = true; });
        }
      }
    } catch (e) {}

    return {
      id,
      type,
      root,
      mesh,
      radius,
      extraData,
      label,
      collected: false,
      activated: false,
      bobOffset: Math.random() * Math.PI * 2,
    };
  }

  _update() {
    const t = performance.now() * 0.001;
    const playerPos = this.playerSystem.getPosition();
    let nearbyLabel = null;
    let closestDist = Infinity;

    for (const obj of this.objects) {
      if (obj.collected) continue;

      this._animateObject(obj, t);

      const dist = Vector3.Distance(obj.root.position, playerPos);
      if (dist < obj.radius) {
        if (dist < closestDist) {
          closestDist = dist;
          nearbyLabel = obj.label;
        }
        this._triggerInteraction(obj);
      }
    }

    if (nearbyLabel !== this.activeMessage) {
      this.activeMessage = nearbyLabel;
      if (this.onMessageChange) {
        this.onMessageChange(nearbyLabel);
      }
    }
  }

  _animateObject(obj, t) {
    if (!obj.mesh) return;
    switch (obj.type) {
      case 'pickup':
        obj.mesh.position.y = 0.6 + Math.sin(t * 2 + obj.bobOffset) * 0.2;
        obj.mesh.rotation.y = t * 1.5;
        break;
      case 'portal':
        obj.mesh.rotation.z = t * 1.0;
        if (obj.mesh.material) {
          obj.mesh.material.emissiveColor = new Color3(
            0.4 + Math.sin(t * 3) * 0.2,
            0.1,
            0.8 + Math.cos(t * 3) * 0.2
          );
        }
        break;
      case 'checkpoint':
        if (obj.mesh) obj.mesh.rotation.y = t * 0.5;
        break;
      case 'teleport_pad':
        if (obj.mesh && obj.mesh.material) {
          obj.mesh.material.alpha = 0.7 + Math.sin(t * 2 + obj.bobOffset) * 0.15;
        }
        break;
    }
  }

  _triggerInteraction(obj) {
    if (obj.activated) return;

    switch (obj.type) {
      case 'pickup':
        if (!obj.collected) {
          obj.collected = true;
          obj.root.setEnabled(false);
          this.collectiblesCount++;
          if (this.onCollectiblesChange) {
            this.onCollectiblesChange(this.collectiblesCount);
          }
          if (this.onMessageChange) {
            this.onMessageChange(`✨ Collected! Total: ${this.collectiblesCount}`);
            setTimeout(() => {
              if (this.activeMessage && this.activeMessage.startsWith('✨')) {
                this.activeMessage = null;
                if (this.onMessageChange) this.onMessageChange(null);
              }
            }, 2000);
          }
        }
        break;
      case 'portal':
        obj.activated = true;
        setTimeout(() => { obj.activated = false; }, 3000);
        if (obj.extraData.destination) {
          this.playerSystem.teleportTo(obj.extraData.destination);
        }
        break;
      case 'sign':
        if (!obj.activated) {
          obj.activated = true;
          if (this.onMessageChange) {
            this.onMessageChange(`📋 ${obj.extraData.message}`);
          }
          setTimeout(() => {
            obj.activated = false;
            if (this.activeMessage && this.activeMessage.startsWith('📋')) {
              this.activeMessage = null;
              if (this.onMessageChange) this.onMessageChange(null);
            }
          }, 4000);
        }
        break;
      case 'checkpoint':
        if (!obj.activated) {
          obj.activated = true;
          this.playerSystem.saveCheckpoint();
          if (this.onMessageChange) {
            this.onMessageChange('🚩 Checkpoint saved!');
          }
          setTimeout(() => {
            obj.activated = false;
            if (this.activeMessage && this.activeMessage.startsWith('🚩')) {
              this.activeMessage = null;
              if (this.onMessageChange) this.onMessageChange(null);
            }
          }, 2000);
        }
        break;
      case 'teleport_pad':
        obj.activated = true;
        setTimeout(() => { obj.activated = false; }, 3000);
        if (obj.extraData.destination) {
          this.playerSystem.teleportTo(obj.extraData.destination);
        }
        break;
    }
  }

  getCollectiblesCount() {
    return this.collectiblesCount;
  }

  getTotalCollectibles() {
    return INTERACTION_CONFIGS.find(c => c.type === 'pickup')?.positions.length || 0;
  }

  dispose() {
    for (const obj of this.objects) {
      obj.root.dispose();
    }
    this.objects = [];
  }
}
