import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

export class AssetLoader {
  constructor(scene) {
    this.scene = scene;
    this._cache = new Map();
  }

  async loadGLTF(path, name) {
    if (this._cache.has(path)) {
      const cached = this._cache.get(path);
      const clones = cached.meshes.map((m, i) => {
        if (i === 0) return m;
        const clone = m.clone(`${name}_${Date.now()}_${i}`);
        clone.isVisible = true;
        return clone;
      });
      return { meshes: clones };
    }

    try {
      const result = await SceneLoader.ImportMeshAsync('', '', path, this.scene);
      if (result && result.meshes && result.meshes.length > 0) {
        this._cache.set(path, { meshes: result.meshes });
        return result;
      }
    } catch (err) {
      console.warn(`Failed to load GLTF: ${path}`, err);
    }
    return null;
  }

  async loadGLTFAsContainer(path) {
    try {
      const container = await SceneLoader.LoadAssetContainerAsync('', path, this.scene);
      return container;
    } catch (err) {
      console.warn(`Failed to load GLTF container: ${path}`, err);
      return null;
    }
  }

  dispose() {
    this._cache.clear();
  }
}
