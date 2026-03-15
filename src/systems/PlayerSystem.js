import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/loaders/glTF';
import { MobileControls } from '../ui/MobileControls.js';

const HERO_COLORS = [
  new Color3(0.2, 0.6, 1.0),
  new Color3(1.0, 0.4, 0.2),
  new Color3(0.3, 0.9, 0.4),
  new Color3(0.9, 0.2, 0.8),
  new Color3(1.0, 0.85, 0.1),
];

const JOYSTICK_ZONE_WIDTH_RATIO = 0.45; // left 45% of screen = joystick zone
const JOYSTICK_DEADZONE = 0.05;         // ignore tiny joystick deflections

export class PlayerSystem {
  constructor(scene, canvas, characterIndex) {
    this.scene = scene;
    this.canvas = canvas;
    this.characterIndex = characterIndex;
    this.root = null;
    this.camera = null;
    this.speed = 0.12;
    this.rotationSpeed = 0.08;
    this.isMoving = false;
    this.isJumping = false;
    this.verticalVelocity = 0;
    this.checkpoints = [];
    this.lastCheckpoint = new Vector3(0, 1, 0);
    this.collectibles = 0;

    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
    };

    this._cameraAlpha = -Math.PI / 2;
    this._cameraBeta = Math.PI / 3;
    this._cameraRadius = 10;
    this._mouseDown = false;
    this._lastMouseX = 0;
    this._lastMouseY = 0;
    this.mobileControls = null;
  }

  async init() {
    this.root = new TransformNode('playerRoot', this.scene);
    this.root.position = new Vector3(0, 1, 0);

    await this._buildCharacterMesh();
    this._setupCamera();
    this._setupInput();
    this.mobileControls = new MobileControls();
    this.mobileControls.init();

    this.scene.registerBeforeRender(() => this._update());
    return this;
  }

  async _buildCharacterMesh() {
    const idx = (this.characterIndex - 1) % 5;
    const color = HERO_COLORS[idx];

    const bodyMat = new StandardMaterial('playerBodyMat', this.scene);
    bodyMat.diffuseColor = color;
    bodyMat.specularColor = color.scale(0.3);

    this.bodyMesh = MeshBuilder.CreateCapsule('playerBody', {
      height: 1.8,
      radius: 0.35,
      tessellation: 12,
    }, this.scene);
    this.bodyMesh.material = bodyMat;
    this.bodyMesh.parent = this.root;
    this.bodyMesh.position.y = 0.9;
    this.bodyMesh.checkCollisions = false;

    const headMat = new StandardMaterial('playerHeadMat', this.scene);
    headMat.diffuseColor = new Color3(0.9, 0.75, 0.6);
    this.headMesh = MeshBuilder.CreateSphere('playerHead', { diameter: 0.5, segments: 8 }, this.scene);
    this.headMesh.material = headMat;
    this.headMesh.parent = this.root;
    this.headMesh.position.y = 2.1;
    this.headMesh.checkCollisions = false;

    const eyeMat = new StandardMaterial('eyeMat', this.scene);
    eyeMat.emissiveColor = new Color3(0.1, 0.1, 0.3);
    const eyeL = MeshBuilder.CreateSphere('eyeL', { diameter: 0.08 }, this.scene);
    eyeL.parent = this.root;
    eyeL.position = new Vector3(-0.12, 2.12, 0.22);
    eyeL.material = eyeMat;
    const eyeR = MeshBuilder.CreateSphere('eyeR', { diameter: 0.08 }, this.scene);
    eyeR.parent = this.root;
    eyeR.position = new Vector3(0.12, 2.12, 0.22);
    eyeR.material = eyeMat;

    const shadowMat = new StandardMaterial('shadowMat', this.scene);
    shadowMat.diffuseColor = new Color3(0, 0, 0);
    shadowMat.alpha = 0.3;
    this.shadowDisc = MeshBuilder.CreateDisc('playerShadow', { radius: 0.4 }, this.scene);
    this.shadowDisc.rotation.x = Math.PI / 2;
    this.shadowDisc.position.y = 0.02;
    this.shadowDisc.material = shadowMat;
    this.shadowDisc.parent = this.root;
    this.shadowDisc.isPickable = false;

    this.collider = MeshBuilder.CreateCylinder('playerCollider', {
      height: 2.0,
      diameter: 0.7,
    }, this.scene);
    this.collider.isVisible = false;
    this.collider.checkCollisions = true;
    this.collider.parent = this.root;
    this.collider.position.y = 1.0;
    this.collider.ellipsoid = new Vector3(0.4, 1.0, 0.4);

    // Load hero GLTF from /public/assets/characters/playable/
    // Quaternius Character models are ~1.5 units tall; scale to fit the player capsule.
    try {
      const assetPath = `/assets/characters/playable/hero${this.characterIndex}.gltf`;
      const result = await SceneLoader.ImportMeshAsync('', '', assetPath, this.scene);
      if (result.meshes.length > 0) {
        // Attach root to player transform node and reset local transform
        const rootMesh = result.meshes[0];
        rootMesh.parent = this.root;
        rootMesh.position = new Vector3(0, 0, 0);
        const s = 1.2;
        rootMesh.scaling = new Vector3(s, s, s);

        // Show all meshes with their original Quaternius materials
        result.meshes.forEach(m => { m.isVisible = true; });

        // GLTF asset is now the primary visual — hide procedural fallback
        this.bodyMesh.isVisible = false;
        this.headMesh.isVisible = false;
      }
    } catch (e) {
      // Procedural geometry already visible as fallback
    }
  }

  _setupCamera() {
    this.camera = new ArcRotateCamera('playerCam', this._cameraAlpha, this._cameraBeta, this._cameraRadius, Vector3.Zero(), this.scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 500;
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 20;
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI / 2.1;
    this.camera.checkCollisions = false;
    this.scene.activeCamera = this.camera;
    this.camera.setTarget(new Vector3(0, 1.2, 0));
  }

  _setupInput() {
    const map = this._keys;
    this.scene.onKeyboardObservable.add(kbInfo => {
      const down = kbInfo.type === 1;
      switch (kbInfo.event.code) {
        case 'KeyW': case 'ArrowUp':    map.forward  = down; break;
        case 'KeyS': case 'ArrowDown':  map.backward = down; break;
        case 'KeyA': case 'ArrowLeft':  map.left     = down; break;
        case 'KeyD': case 'ArrowRight': map.right    = down; break;
        case 'Space':                   map.jump     = down; break;
      }
    });

    this.canvas.addEventListener('mousedown', e => {
      if (e.button === 2 || e.button === 0) {
        this._mouseDown = true;
        this._lastMouseX = e.clientX;
        this._lastMouseY = e.clientY;
        this.canvas.requestPointerLock?.();
      }
    });

    document.addEventListener('mouseup', () => {
      this._mouseDown = false;
    });

    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement === this.canvas) {
        this._cameraAlpha += e.movementX * 0.003;
        this._cameraBeta -= e.movementY * 0.003;
        this._cameraBeta = Math.max(0.2, Math.min(Math.PI / 2.1, this._cameraBeta));
      }
    });

    this.canvas.addEventListener('wheel', e => {
      this._cameraRadius = Math.max(3, Math.min(20, this._cameraRadius + e.deltaY * 0.02));
    });

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Touch camera look — only track touches on the RIGHT half of the screen.
    // The left side is reserved for the virtual joystick DOM overlay.
    let cameraTouch = null;
    this.canvas.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.clientX > window.innerWidth * JOYSTICK_ZONE_WIDTH_RATIO && !cameraTouch) {
          cameraTouch = { id: t.identifier, x: t.clientX, y: t.clientY };
          break;
        }
      }
    }, { passive: true });
    this.canvas.addEventListener('touchmove', e => {
      if (!cameraTouch) return;
      for (const t of e.changedTouches) {
        if (t.identifier === cameraTouch.id) {
          const dx = t.clientX - cameraTouch.x;
          const dy = t.clientY - cameraTouch.y;
          this._cameraAlpha += dx * 0.008;
          this._cameraBeta  -= dy * 0.008;
          this._cameraBeta   = Math.max(0.2, Math.min(Math.PI / 2.1, this._cameraBeta));
          cameraTouch.x = t.clientX;
          cameraTouch.y = t.clientY;
          break;
        }
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', e => {
      for (const t of e.changedTouches) {
        if (cameraTouch && t.identifier === cameraTouch.id) {
          cameraTouch = null;
          break;
        }
      }
    }, { passive: true });
    this.canvas.addEventListener('touchcancel', () => { cameraTouch = null; }, { passive: true });
  }

  _update() {
    if (!this.root) return;

    const dt = this.scene.getEngine().getDeltaTime() * 0.001;
    const cam = this.camera;

    const forward = this._keys.forward;
    const backward = this._keys.backward;
    const left = this._keys.left;
    const right = this._keys.right;

    // Mobile joystick input (additive with keyboard)
    const joyMove = this.mobileControls ? this.mobileControls.getMovement() : { x: 0, y: 0 };
    const joystickActive = Math.abs(joyMove.x) > JOYSTICK_DEADZONE || Math.abs(joyMove.y) > JOYSTICK_DEADZONE;

    // Jump from joystick jump button
    if (this.mobileControls && this.mobileControls.consumeJump() && !this.isJumping) {
      this._keys.jump = true;
    }

    this.isMoving = forward || backward || left || right || joystickActive;

    let moveX = 0;
    let moveZ = 0;

    const camForward = new Vector3(
      Math.sin(cam.alpha),
      0,
      Math.cos(cam.alpha)
    ).normalize();
    const camRight = new Vector3(
      Math.cos(cam.alpha),
      0,
      -Math.sin(cam.alpha)
    ).normalize();

    if (forward)  { moveX -= camForward.x; moveZ -= camForward.z; }
    if (backward) { moveX += camForward.x; moveZ += camForward.z; }
    if (left)     { moveX -= camRight.x;   moveZ -= camRight.z; }
    if (right)    { moveX += camRight.x;   moveZ += camRight.z; }

    // Joystick: joyMove.y is screen-down = game-backward; joyMove.x is screen-right = game-right
    if (joystickActive) {
      moveX += camForward.x * (-joyMove.y) + camRight.x * joyMove.x;
      moveZ += camForward.z * (-joyMove.y) + camRight.z * joyMove.x;
    }

    if (this.isMoving) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      if (len > 0) { moveX /= len; moveZ /= len; }

      const spd = this.speed * 60;
      this.root.position.x += moveX * spd * dt;
      this.root.position.z += moveZ * spd * dt;

      const targetAngle = Math.atan2(moveX, moveZ);
      let angleDiff = targetAngle - this.root.rotation.y;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.root.rotation.y += angleDiff * Math.min(1, this.rotationSpeed * 60 * dt);
    }

    if (this._keys.jump && !this.isJumping) {
      this.isJumping = true;
      this.verticalVelocity = 8;
      this._keys.jump = false; // consumed
    }

    if (this.isJumping) {
      this.verticalVelocity -= 20 * dt;
      this.root.position.y += this.verticalVelocity * dt;
      if (this.root.position.y <= 1) {
        this.root.position.y = 1;
        this.isJumping = false;
        this.verticalVelocity = 0;
      }
    }

    const bounds = 95;
    this.root.position.x = Math.max(-bounds, Math.min(bounds, this.root.position.x));
    this.root.position.z = Math.max(-bounds, Math.min(bounds, this.root.position.z));

    this._updateCamera(dt);
    this._animateBody(dt);
  }

  _updateCamera(dt) {
    const cam = this.camera;
    cam.alpha = this._cameraAlpha;
    cam.beta = this._cameraBeta;
    cam.radius = this._cameraRadius;

    const targetPos = new Vector3(
      this.root.position.x,
      this.root.position.y + 1.2,
      this.root.position.z
    );
    cam.target = Vector3.Lerp(cam.target, targetPos, Math.min(1, 8 * dt));
  }

  _animateBody(dt) {
    if (this.isMoving || this.isJumping) {
      const t = performance.now() * 0.005;
      if (this.bodyMesh) {
        this.bodyMesh.position.y = 0.9 + Math.abs(Math.sin(t * 4)) * 0.05;
      }
      if (this.headMesh) {
        this.headMesh.position.y = 2.1 + Math.abs(Math.sin(t * 4)) * 0.05;
      }
    }
  }

  getPosition() {
    return this.root ? this.root.position.clone() : Vector3.Zero();
  }

  teleportTo(position) {
    if (this.root) {
      this.root.position = position.clone();
      this.root.position.y = Math.max(1, position.y);
    }
  }

  saveCheckpoint() {
    this.lastCheckpoint = this.getPosition();
  }

  respawn() {
    this.teleportTo(this.lastCheckpoint);
  }

  dispose() {
    document.exitPointerLock?.();
    if (this.mobileControls) {
      this.mobileControls.destroy();
      this.mobileControls = null;
    }
  }
}
