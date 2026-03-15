import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { StackPanel } from '@babylonjs/gui/2D/controls/stackPanel';
import { Button } from '@babylonjs/gui/2D/controls/button';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Image } from '@babylonjs/gui/2D/controls/image';

export class HUD {
  constructor(scene, playerSystem, interactionSystem, sceneManager) {
    this.scene = scene;
    this.playerSystem = playerSystem;
    this.interactionSystem = interactionSystem;
    this.sceneManager = sceneManager;
    this.gui = null;
    this.messageLabel = null;
    this.collectiblesLabel = null;
    this.posLabel = null;
    this.controlsPanel = null;
    this.controlsVisible = false;
  }

  init() {
    this.gui = AdvancedDynamicTexture.CreateFullscreenUI('hud', true, this.scene);

    this._buildTopBar();
    this._buildMessageBox();
    this._buildControls();
    this._buildCrosshair();
    this._buildMinimap();

    this.interactionSystem.onMessageChange = (msg) => {
      this._showMessage(msg);
    };
    this.interactionSystem.onCollectiblesChange = (count) => {
      this._updateCollectibles(count);
    };

    this.scene.registerBeforeRender(() => this._update());
  }

  _buildTopBar() {
    const topBar = new Rectangle('topBar');
    topBar.width = '100%';
    topBar.height = '52px';
    topBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    topBar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    topBar.background = 'rgba(5,10,25,0.75)';
    topBar.thickness = 0;
    this.gui.addControl(topBar);

    const title = new TextBlock('gameTitle', 'ISLAND QUEST');
    title.color = '#81d4fa';
    title.fontSize = 16;
    title.fontWeight = '700';
    title.left = '16px';
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    topBar.addControl(title);

    this.collectiblesLabel = new TextBlock('collectibles', '⭐ 0 / 10');
    this.collectiblesLabel.color = '#ffd54f';
    this.collectiblesLabel.fontSize = 14;
    this.collectiblesLabel.fontWeight = '600';
    this.collectiblesLabel.left = '-120px';
    this.collectiblesLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    topBar.addControl(this.collectiblesLabel);

    const helpBtn = Button.CreateSimpleButton('helpBtn', '? Controls');
    helpBtn.width = '90px';
    helpBtn.height = '32px';
    helpBtn.cornerRadius = 6;
    helpBtn.color = '#90caf9';
    helpBtn.background = 'rgba(20,40,80,0.8)';
    helpBtn.thickness = 1;
    helpBtn.fontSize = 11;
    helpBtn.left = '-8px';
    helpBtn.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    helpBtn.onPointerClickObservable.add(() => this._toggleControls());
    topBar.addControl(helpBtn);
  }

  _buildMessageBox() {
    this.messageBox = new Rectangle('msgBox');
    this.messageBox.width = '420px';
    this.messageBox.height = '56px';
    this.messageBox.cornerRadius = 12;
    this.messageBox.background = 'rgba(5,10,30,0.88)';
    this.messageBox.color = 'rgba(100,160,255,0.6)';
    this.messageBox.thickness = 1;
    this.messageBox.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.messageBox.top = '-80px';
    this.messageBox.isVisible = false;
    this.gui.addControl(this.messageBox);

    this.messageLabel = new TextBlock('msgLabel', '');
    this.messageLabel.color = '#ffffff';
    this.messageLabel.fontSize = 15;
    this.messageLabel.fontFamily = 'Segoe UI, sans-serif';
    this.messageBox.addControl(this.messageLabel);
  }

  _buildControls() {
    this.controlsPanel = new Rectangle('controlsPanel');
    this.controlsPanel.width = '260px';
    this.controlsPanel.height = '200px';
    this.controlsPanel.cornerRadius = 12;
    this.controlsPanel.background = 'rgba(5,10,30,0.92)';
    this.controlsPanel.color = 'rgba(100,160,255,0.4)';
    this.controlsPanel.thickness = 1;
    this.controlsPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.controlsPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.controlsPanel.top = '60px';
    this.controlsPanel.left = '-8px';
    this.controlsPanel.isVisible = false;
    this.gui.addControl(this.controlsPanel);

    const ctrlTitle = new TextBlock('ctrlTitle', 'Controls');
    ctrlTitle.color = '#81d4fa';
    ctrlTitle.fontSize = 14;
    ctrlTitle.fontWeight = '700';
    ctrlTitle.top = '-75px';
    this.controlsPanel.addControl(ctrlTitle);

    const lines = [
      'WASD / Arrow Keys — Move',
      'Mouse Drag — Camera',
      'Scroll Wheel — Zoom',
      'Space — Jump',
      'Right-Click — Lock Camera',
    ];
    lines.forEach((line, i) => {
      const t = new TextBlock(`ctrl_${i}`, line);
      t.color = '#b0bec5';
      t.fontSize = 11;
      t.top = `${-50 + i * 22}px`;
      this.controlsPanel.addControl(t);
    });

    this.posLabel = new TextBlock('posLabel', '');
    this.posLabel.color = '#546e7a';
    this.posLabel.fontSize = 10;
    this.posLabel.top = '80px';
    this.controlsPanel.addControl(this.posLabel);
  }

  _buildCrosshair() {
    const ch = new TextBlock('crosshair', '·');
    ch.color = 'rgba(255,255,255,0.4)';
    ch.fontSize = 24;
    this.gui.addControl(ch);
  }

  _buildMinimap() {
    const mapBg = new Rectangle('mapBg');
    mapBg.width = '120px';
    mapBg.height = '120px';
    mapBg.cornerRadius = 60;
    mapBg.background = 'rgba(5,10,30,0.75)';
    mapBg.color = 'rgba(100,160,255,0.4)';
    mapBg.thickness = 1;
    mapBg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    mapBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    mapBg.top = '-16px';
    mapBg.left = '-16px';
    this.gui.addControl(mapBg);

    this.minimapPlayer = new TextBlock('mapPlayer', '◆');
    this.minimapPlayer.color = '#4fc3f7';
    this.minimapPlayer.fontSize = 10;
    mapBg.addControl(this.minimapPlayer);

    const mapLabel = new TextBlock('mapLabel', 'MAP');
    mapLabel.color = 'rgba(100,160,255,0.5)';
    mapLabel.fontSize = 9;
    mapLabel.top = '50px';
    mapBg.addControl(mapLabel);
  }

  _showMessage(msg) {
    if (msg) {
      this.messageLabel.text = msg;
      this.messageBox.isVisible = true;
    } else {
      this.messageBox.isVisible = false;
    }
  }

  _updateCollectibles(count) {
    const total = this.interactionSystem.getTotalCollectibles();
    this.collectiblesLabel.text = `⭐ ${count} / ${total}`;
  }

  _toggleControls() {
    this.controlsVisible = !this.controlsVisible;
    this.controlsPanel.isVisible = this.controlsVisible;
  }

  _update() {
    if (this.posLabel && this.controlsVisible) {
      const pos = this.playerSystem.getPosition();
      this.posLabel.text = `Pos: ${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}`;
    }

    if (this.minimapPlayer) {
      const pos = this.playerSystem.getPosition();
      const px = (pos.x / 100) * 50;
      const pz = (pos.z / 100) * 50;
      this.minimapPlayer.left = `${px.toFixed(1)}px`;
      this.minimapPlayer.top = `${pz.toFixed(1)}px`;
    }
  }

  dispose() {
    if (this.gui) {
      this.gui.dispose();
      this.gui = null;
    }
  }
}
