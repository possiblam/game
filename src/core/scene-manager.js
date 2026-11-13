export class SceneManager {
  constructor(rootEl) {
    this.rootEl = rootEl;
    this.currentCleanup = null;
    this.currentScene = 'title';
  }

  mount(sceneName, bodyState, renderFn) {
    if (typeof this.currentCleanup === 'function') {
      try {
        this.currentCleanup();
      } catch {
        // ignore cleanup errors
      }
      this.currentCleanup = null;
    }

    this.currentScene = sceneName;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = bodyState;
    }

    this.rootEl.innerHTML = '';
    const cleanup = renderFn(this.rootEl);
    if (typeof cleanup === 'function') {
      this.currentCleanup = cleanup;
    }
  }

  destroyActive() {
    if (typeof this.currentCleanup === 'function') {
      this.currentCleanup();
      this.currentCleanup = null;
    }
  }
}
