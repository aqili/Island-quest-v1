import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { PointLight } from '@babylonjs/core/Lights/pointLight';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Animation } from '@babylonjs/core/Animations/animation';
import '@babylonjs/loaders/glTF';

const HERO_COLORS = [
  new Color3(0.2, 0.6, 1.0),
  new Color3(1.0, 0.4, 0.2),
  new Color3(0.3, 0.9, 0.4),
  new Color3(0.9, 0.2, 0.8),
  new Color3(1.0, 0.85, 0.1),
];

const HERO_NAMES = ['Azure Knight', 'Ember Rogue', 'Forest Druid', 'Shadow Mage', 'Sun Warrior'];
const HERO_DESCS = [
  'A steadfast defender of the realm',
  'Swift and deadly from the shadows',
  'Guardian of the ancient forests',
  'Master of arcane darkness',
  'Champion of the blazing dawn',
];

const SWIPE_THRESHOLD_PX = 50; // minimum horizontal swipe distance to navigate

export class CharacterSelectionScene {
  constructor(engine, canvas, sceneManager) {
    this.engine = engine;
    this.canvas = canvas;
    this.sceneManager = sceneManager;
    this.scene = null;
    this.selectedIndex = 0;
    this.rotationTargets = [];
  }

  async init() {
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.04, 0.04, 0.12, 1);

    this._setupCamera();
    this._setupLights();
    this._buildStage();
    await this._buildCharacters();
    this._buildUI();
    this._startAnimations();

    return this.scene;
  }

  _setupCamera() {
    this.camera = new ArcRotateCamera('selCam', -Math.PI / 2, Math.PI / 2.8, 18, Vector3.Zero(), this.scene);
    this.camera.lowerRadiusLimit = 15;
    this.camera.upperRadiusLimit = 20;
    this.camera.lowerBetaLimit = Math.PI / 4;
    this.camera.upperBetaLimit = Math.PI / 2.2;
    this.camera.minZ = 0.1;
  }

  _setupLights() {
    const ambient = new HemisphericLight('ambLight', new Vector3(0, 1, 0), this.scene);
    ambient.intensity = 0.4;
    ambient.diffuse = new Color3(0.5, 0.7, 1.0);
    ambient.groundColor = new Color3(0.1, 0.1, 0.2);

    const key = new PointLight('keyLight', new Vector3(0, 8, -5), this.scene);
    key.intensity = 1.2;
    key.diffuse = new Color3(0.8, 0.9, 1.0);

    const fill = new PointLight('fillLight', new Vector3(5, 4, 5), this.scene);
    fill.intensity = 0.5;
    fill.diffuse = new Color3(0.4, 0.6, 1.0);
  }

  _buildStage() {
    const groundMat = new StandardMaterial('stageMat', this.scene);
    groundMat.diffuseColor = new Color3(0.08, 0.1, 0.18);
    groundMat.specularColor = new Color3(0.3, 0.4, 0.6);
    groundMat.specularPower = 64;

    const ground = MeshBuilder.CreateDisc('stageGround', { radius: 16, tessellation: 64 }, this.scene);
    ground.rotation.x = Math.PI / 2;
    ground.material = groundMat;

    const ringMat = new StandardMaterial('ringMat', this.scene);
    ringMat.emissiveColor = new Color3(0.2, 0.5, 1.0);
    ringMat.wireframe = false;

    const ring = MeshBuilder.CreateTorus('ring', { diameter: 10, thickness: 0.05, tessellation: 64 }, this.scene);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.02;
    ring.material = ringMat;

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = Math.cos(angle) * 4;
      const z = Math.sin(angle) * 4;
      const platMat = new StandardMaterial(`plat${i}Mat`, this.scene);
      platMat.diffuseColor = new Color3(0.1, 0.12, 0.22);
      platMat.specularColor = new Color3(0.5, 0.6, 1.0);
      const plat = MeshBuilder.CreateCylinder(`plat${i}`, { diameter: 1.6, height: 0.1, tessellation: 16 }, this.scene);
      plat.position = new Vector3(x, 0.05, z);
      plat.material = platMat;
    }

    for (let i = 0; i < 60; i++) {
      const star = MeshBuilder.CreateSphere(`star${i}`, { diameter: 0.05 }, this.scene);
      const starMat = new StandardMaterial(`starMat${i}`, this.scene);
      const brightness = 0.5 + Math.random() * 0.5;
      starMat.emissiveColor = new Color3(brightness, brightness, brightness);
      star.material = starMat;
      const r = 12 + Math.random() * 4;
      const a = Math.random() * Math.PI * 2;
      star.position = new Vector3(Math.cos(a) * r, Math.random() * 10 - 1, Math.sin(a) * r);
    }
  }

  async _buildCharacters() {
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = Math.cos(angle) * 4;
      const z = Math.sin(angle) * 4;

      // Glow disc under each character
      const glowMat = new StandardMaterial(`glow${i}Mat`, this.scene);
      glowMat.emissiveColor = HERO_COLORS[i].scale(0.4);
      const glow = MeshBuilder.CreateCylinder(`glow${i}`, { diameter: 1.6, height: 0.02, tessellation: 16 }, this.scene);
      glow.position = new Vector3(x, 0.11, z);
      glow.material = glowMat;

      // Procedural fallback capsule (shown until GLTF loads)
      const bodyMat = new StandardMaterial(`bodyMat${i}`, this.scene);
      bodyMat.diffuseColor = HERO_COLORS[i];
      bodyMat.specularColor = HERO_COLORS[i].scale(0.5);
      const body = MeshBuilder.CreateCapsule(`body${i}`, { height: 1.8, radius: 0.35, tessellation: 12 }, this.scene);
      body.position = new Vector3(x, 0.9, z);
      body.material = bodyMat;

      const headMat = new StandardMaterial(`headMat${i}`, this.scene);
      headMat.diffuseColor = new Color3(0.9, 0.75, 0.6);
      const head = MeshBuilder.CreateSphere(`head${i}`, { diameter: 0.55, segments: 8 }, this.scene);
      head.position = new Vector3(x, 2.0, z);
      head.material = headMat;

      // Load GLTF asset from /public/assets/characters/playable/
      // Each file is a flat right-angle triangle (XY plane, no material).
      // We apply a coloured material and position the root mesh.
      try {
        const assetPath = `/assets/characters/playable/hero${i + 1}.gltf`;
        const result = await SceneLoader.ImportMeshAsync('', '', assetPath, this.scene);
        if (result.meshes.length > 0) {
          const heroColor = HERO_COLORS[i];
          const mat = new StandardMaterial(`hero${i}GltfMat`, this.scene);
          mat.diffuseColor = heroColor;
          mat.emissiveColor = heroColor.scale(0.5);
          mat.backFaceCulling = false; // show both faces of the flat triangle

          // Position and scale the root of the imported hierarchy
          const rootMesh = result.meshes[0];
          rootMesh.position = new Vector3(x, 0.1, z);
          const s = 2.2;
          rootMesh.scaling = new Vector3(s, s, s);
          rootMesh.isVisible = true;

          // Apply the material to every mesh in the imported hierarchy
          result.meshes.forEach(m => {
            m.material = mat;
            m.isVisible = true;
          });

          // GLTF asset is now the primary visual — hide procedural fallback
          body.isVisible = false;
          head.isVisible = false;
        }
      } catch (e) {
        // Procedural fallback stays visible
      }
    }
  }

  _buildUI() {
    const gui = AdvancedDynamicTexture.CreateFullscreenUI('selUI', true, this.scene);

    const titleBlock = new TextBlock('title', 'ISLAND QUEST');
    titleBlock.color = '#81d4fa';
    titleBlock.fontSize = 42;
    titleBlock.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    titleBlock.fontWeight = '700';
    titleBlock.top = '-40%';
    titleBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(titleBlock);

    const subTitle = new TextBlock('subtitle', 'Choose Your Hero');
    subTitle.color = '#90caf9';
    subTitle.fontSize = 18;
    subTitle.fontFamily = 'Segoe UI, Tahoma, sans-serif';
    subTitle.top = '-33%';
    subTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(subTitle);

    const panelBg = new Rectangle('panelBg');
    panelBg.width = '92%';
    panelBg.height = '290px';
    panelBg.top = '30%';
    panelBg.cornerRadius = 16;
    panelBg.color = 'rgba(100,180,255,0.3)';
    panelBg.background = 'rgba(5,10,30,0.85)';
    panelBg.thickness = 1;
    gui.addControl(panelBg);

    this.nameText = new TextBlock('charName', HERO_NAMES[0]);
    this.nameText.color = '#ffffff';
    this.nameText.fontSize = 22;
    this.nameText.fontWeight = '600';
    this.nameText.top = '23%';
    this.nameText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(this.nameText);

    this.descText = new TextBlock('charDesc', HERO_DESCS[0]);
    this.descText.color = '#90caf9';
    this.descText.fontSize = 14;
    this.descText.top = '28%';
    this.descText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(this.descText);

    const dotContainer = new StackPanel('dots');
    dotContainer.isVertical = false;
    dotContainer.top = '33%';
    dotContainer.height = '30px';
    dotContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(dotContainer);
    this.dots = [];
    for (let i = 0; i < 5; i++) {
      const dot = new TextBlock(`dot${i}`, i === 0 ? '●' : '○');
      dot.color = i === 0 ? '#4fc3f7' : '#546e7a';
      dot.fontSize = 16;
      dot.width = '24px';
      dotContainer.addControl(dot);
      this.dots.push(dot);
    }

    const prevBtn = Button.CreateSimpleButton('prevBtn', '◀');
    prevBtn.width = '52px';
    prevBtn.height = '52px';
    prevBtn.cornerRadius = 26;
    prevBtn.color = '#81d4fa';
    prevBtn.background = 'rgba(10,20,60,0.8)';
    prevBtn.thickness = 1;
    prevBtn.top = '28%';
    prevBtn.left = '-42%';
    prevBtn.fontSize = 20;
    prevBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    prevBtn.onPointerClickObservable.add(() => this._navigate(-1));
    gui.addControl(prevBtn);

    const nextBtn = Button.CreateSimpleButton('nextBtn', '▶');
    nextBtn.width = '52px';
    nextBtn.height = '52px';
    nextBtn.cornerRadius = 26;
    nextBtn.color = '#81d4fa';
    nextBtn.background = 'rgba(10,20,60,0.8)';
    nextBtn.thickness = 1;
    nextBtn.top = '28%';
    nextBtn.left = '42%';
    nextBtn.fontSize = 20;
    nextBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    nextBtn.onPointerClickObservable.add(() => this._navigate(1));
    gui.addControl(nextBtn);

    const selectBtn = Button.CreateSimpleButton('selectBtn', 'BEGIN ADVENTURE');
    selectBtn.width = '60%';
    selectBtn.height = '52px';
    selectBtn.cornerRadius = 26;
    selectBtn.color = '#ffffff';
    selectBtn.background = 'rgba(30,100,200,0.9)';
    selectBtn.thickness = 1;
    selectBtn.top = '40%';
    selectBtn.fontSize = 16;
    selectBtn.fontWeight = '700';
    selectBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    selectBtn.onPointerUpObservable.add(() => {
      this.sceneManager.goToMainWorld(this.selectedIndex + 1);
    });
    gui.addControl(selectBtn);

    const hint = new TextBlock('hint', 'Use ◀ ▶ to browse characters');
    hint.color = '#546e7a';
    hint.fontSize = 12;
    hint.top = '46%';
    hint.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    gui.addControl(hint);

    this.scene.onKeyboardObservable.add((kbInfo) => {
      if (kbInfo.type === 1) {
        if (kbInfo.event.code === 'ArrowLeft' || kbInfo.event.code === 'KeyA') {
          this._navigate(-1);
        } else if (kbInfo.event.code === 'ArrowRight' || kbInfo.event.code === 'KeyD') {
          this._navigate(1);
        } else if (kbInfo.event.code === 'Enter' || kbInfo.event.code === 'Space') {
          this.sceneManager.goToMainWorld(this.selectedIndex + 1);
        }
      }
    });

    // Touch swipe for character navigation (mobile)
    let swipeStartX = null;
    const swipeThreshold = SWIPE_THRESHOLD_PX;
    this.canvas.addEventListener('touchstart', e => {
      swipeStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    this.canvas.addEventListener('touchend', e => {
      if (swipeStartX === null) return;
      const dx = e.changedTouches[0].clientX - swipeStartX;
      if (Math.abs(dx) > swipeThreshold) {
        this._navigate(dx < 0 ? 1 : -1);
      }
      swipeStartX = null;
    }, { passive: true });
  }

  _navigate(dir) {
    this.selectedIndex = (this.selectedIndex + dir + 5) % 5;
    this.nameText.text = HERO_NAMES[this.selectedIndex];
    this.descText.text = HERO_DESCS[this.selectedIndex];
    for (let i = 0; i < 5; i++) {
      this.dots[i].text = i === this.selectedIndex ? '●' : '○';
      this.dots[i].color = i === this.selectedIndex ? '#4fc3f7' : '#546e7a';
    }
    const angle = (this.selectedIndex / 5) * Math.PI * 2;
    this.camera.alpha = -angle - Math.PI / 2;
  }

  _startAnimations() {
    let t = 0;
    this.scene.registerBeforeRender(() => {
      t += 0.01;
      const meshes = this.scene.meshes.filter(m => m.name.startsWith('glow'));
      meshes.forEach((m, i) => {
        m.visibility = 0.4 + Math.sin(t + i * 1.2) * 0.2;
      });
    });
  }

  dispose() {
    if (this.scene) {
      this.scene.dispose();
      this.scene = null;
    }
  }
}
