import { Engine } from '@babylonjs/core/Engines/engine';
import { CharacterSelectionScene } from './scenes/CharacterSelectionScene.js';
import { MainWorldScene } from './scenes/MainWorldScene.js';

const canvas = document.getElementById('renderCanvas');
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');

function setLoadingProgress(percent, text) {
  if (loadingBar) loadingBar.style.width = `${percent}%`;
  if (loadingText) loadingText.textContent = text;
}

function hideLoadingScreen() {
  if (loadingScreen) {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 800);
  }
}

async function main() {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  engine.setHardwareScalingLevel(1);

  let currentScene = null;

  const sceneManager = {
    engine,
    canvas,
    async goToCharacterSelection() {
      if (currentScene) {
        currentScene.dispose();
      }
      setLoadingProgress(20, 'Loading character selection...');
      currentScene = new CharacterSelectionScene(engine, canvas, sceneManager);
      await currentScene.init();
      setLoadingProgress(100, 'Ready!');
      hideLoadingScreen();
    },
    async goToMainWorld(selectedCharacter) {
      if (currentScene) {
        currentScene.dispose();
      }
      loadingScreen.style.display = 'flex';
      loadingScreen.classList.remove('hidden');
      setLoadingProgress(10, 'Loading world...');
      currentScene = new MainWorldScene(engine, canvas, sceneManager, selectedCharacter);
      await currentScene.init((progress, text) => {
        setLoadingProgress(10 + progress * 0.9, text);
      });
      setLoadingProgress(100, 'Ready!');
      hideLoadingScreen();
    },
  };

  setLoadingProgress(10, 'Starting engine...');
  await sceneManager.goToCharacterSelection();

  engine.runRenderLoop(() => {
    if (currentScene && currentScene.scene) {
      try {
        currentScene.scene.render();
      } catch (e) {
        // ignore transient render errors (e.g. "No camera defined" during init)
      }
    }
  });

  window.addEventListener('resize', () => {
    engine.resize();
  });
}

main().catch(console.error);
