import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

const NPC_COLORS = [
  new Color3(0.8, 0.5, 0.2),
  new Color3(0.4, 0.7, 0.9),
  new Color3(0.9, 0.3, 0.3),
  new Color3(0.3, 0.8, 0.6),
  new Color3(0.7, 0.5, 0.9),
];

const NPC_NAMES = ['Villager', 'Merchant', 'Guard', 'Elder', 'Wanderer'];

const NPC_DIALOGS = [
  'Hello, traveler! Be careful out there.',
  "I've got wares if you've got coin!",
  'Halt! This area is restricted... just kidding.',
  'The island holds many secrets, young one.',
  'I\'ve been wandering these lands for ages...',
];

const NPC_PLACEMENTS = [
  { x: 15, z: 15, type: 0 },
  { x: -15, z: 10, type: 1 },
  { x: -10, z: -18, type: 2 },
  { x: 25, z: -10, type: 3 },
  { x: 5, z: 30, type: 4 },
  { x: -25, z: -5, type: 0 },
  { x: 20, z: 22, type: 2 },
  { x: -5, z: -25, type: 4 },
];

export class NPCSystem {
  constructor(scene) {
    this.scene = scene;
    this.npcs = [];
  }

  async init() {
    for (let i = 0; i < NPC_PLACEMENTS.length; i++) {
      const placement = NPC_PLACEMENTS[i];
      const npc = await this._createNPC(
        i,
        new Vector3(placement.x, 1, placement.z),
        placement.type,
        NPC_NAMES[placement.type],
        NPC_DIALOGS[placement.type]
      );
      this.npcs.push(npc);
    }

    this.scene.registerBeforeRender(() => this._update());
    return this;
  }

  async _createNPC(id, position, typeIdx, name, dialog) {
    const root = new TransformNode(`npc_root_${id}`, this.scene);
    root.position = position.clone();

    const color = NPC_COLORS[typeIdx % NPC_COLORS.length];

    const bodyMat = new StandardMaterial(`npcBodyMat_${id}`, this.scene);
    bodyMat.diffuseColor = color;
    const body = MeshBuilder.CreateCapsule(`npcBody_${id}`, {
      height: 1.7,
      radius: 0.3,
      tessellation: 8,
    }, this.scene);
    body.material = bodyMat;
    body.parent = root;
    body.position.y = 0.85;

    const headMat = new StandardMaterial(`npcHeadMat_${id}`, this.scene);
    headMat.diffuseColor = new Color3(0.9, 0.75, 0.6);
    const head = MeshBuilder.CreateSphere(`npcHead_${id}`, { diameter: 0.45, segments: 6 }, this.scene);
    head.material = headMat;
    head.parent = root;
    head.position.y = 1.92;

    const nameplateMat = new StandardMaterial(`nameplateMat_${id}`, this.scene);
    nameplateMat.diffuseColor = new Color3(0.1, 0.1, 0.2);
    nameplateMat.alpha = 0.7;
    const nameplate = MeshBuilder.CreatePlane(`nameplate_${id}`, { width: 1.5, height: 0.3 }, this.scene);
    nameplate.parent = root;
    nameplate.position.y = 2.5;
    nameplate.billboardMode = 7;
    nameplate.material = nameplateMat;
    nameplate.isPickable = false;

    try {
      const npcIdx = (typeIdx % 5) + 1;
      const path = `/assets/characters/npcs/npc${npcIdx}.gltf`;
      const result = await SceneLoader.ImportMeshAsync('', '', path, this.scene);
      if (result && result.meshes.length > 1) {
        const gltfRoot = result.meshes.find(m => m.name === '__root__') || result.meshes[0];
        gltfRoot.parent = root;
        gltfRoot.position = Vector3.Zero();
        gltfRoot.scaling = new Vector3(1.4, 1.4, 1.4);
      }
    } catch (e) {}

    root.rotation.y = Math.random() * Math.PI * 2;

    const npcObj = {
      root,
      body,
      head,
      name,
      dialog,
      typeIdx,
      idleTime: Math.random() * 3,
      idleAngle: root.rotation.y,
      bobOffset: Math.random() * Math.PI * 2,
    };

    return npcObj;
  }

  _update() {
    const t = performance.now() * 0.001;
    for (const npc of this.npcs) {
      npc.body.position.y = 0.85 + Math.sin(t * 0.8 + npc.bobOffset) * 0.02;
      npc.head.position.y = 1.92 + Math.sin(t * 0.8 + npc.bobOffset) * 0.02;
      npc.root.rotation.y = npc.idleAngle + Math.sin(t * 0.4 + npc.bobOffset) * 0.15;
    }
  }

  getNPCsNearPosition(position, radius) {
    return this.npcs.filter(npc => {
      const d = Vector3.Distance(npc.root.position, position);
      return d < radius;
    });
  }

  dispose() {
    for (const npc of this.npcs) {
      npc.root.dispose();
    }
    this.npcs = [];
  }
}
