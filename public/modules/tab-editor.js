const LOCAL_STORAGE_KEY = 'tab data';

/** Owns editable script, persistence, export, and editor pane interactions. */
class TabEditor {
  constructor({ onChange, showToast }) {
    this.onChange = onChange;
    this.showToast = showToast;
    this.tabScript = document.getElementById('tab-script');
    this.tabScript.addEventListener('change', () => {
      if (!this.tabData) return;
      this.tabData = { ...this.tabData, tabScript: this.tabScript.value };
      this.onChange(this.tabData);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tabData));
    });
    // Preserve the existing live preview when a block or measure ends.
    this.tabScript.addEventListener('keydown', (event) => {
      if (this.tabData && (event.key === ',' || event.key === '|')) {
        this.onChange({ ...this.tabData, tabScript: this.tabScript.value });
      }
    });
    document.getElementById('dump-tab-data').addEventListener('click', () => {
      if (!this.tabData) return;
      const dump = JSON.stringify(this.tabData);
      this.copyTextToClipboard(dump)
        .then(() => this.showToast('JSON已复制到剪贴板'))
        .catch(() => this.showToast('复制失败，请重试'));
    });
    document.getElementById('toggle-script').addEventListener('click', () => this.toggleEditor());
    this.setupEditorSplitter();
  }

  setTabData(tabData) {
    this.tabData = tabData;
    this.tabScript.value = tabData.tabScript;
  }

  loadSavedTab() {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      data.title += ' (from Local Storage)';
      return data;
    } catch (error) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
  }

  async copyTextToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (!copied) {
        throw error;
      }
    }
  }

  toggleEditor() {
    const root = document.querySelector('.root');
    const isClosed = root.classList.toggle('editor-closed');
    this.tabScript.classList.toggle('hidden', isClosed);
    document.getElementById('toggle-script').setAttribute('aria-pressed', String(!isClosed));
  }

  setupEditorSplitter() {
    const root = document.querySelector('.root');
    const splitter = document.getElementById('editor-splitter');
    if (!splitter) return;

    const startResize = (event) => {
      event.preventDefault();
      document.body.classList.add('resizing-editor');
      if (event.pointerId !== undefined && splitter.setPointerCapture) {
        splitter.setPointerCapture(event.pointerId);
      }
    };

    const resize = (event) => {
      if (!document.body.classList.contains('resizing-editor')) return;
      const minPaneWidth = 280;
      const maxEditorWidth = Math.max(minPaneWidth, window.innerWidth - minPaneWidth);
      const editorWidth = Math.min(Math.max(window.innerWidth - event.clientX, minPaneWidth), maxEditorWidth);
      root.style.setProperty('--editor-width', `${editorWidth}px`);
    };

    const stopResize = (event) => {
      document.body.classList.remove('resizing-editor');
      if (event.pointerId !== undefined && splitter.hasPointerCapture && splitter.hasPointerCapture(event.pointerId)) {
        splitter.releasePointerCapture(event.pointerId);
      }
    };

    splitter.addEventListener('pointerdown', startResize);
    splitter.addEventListener('pointermove', resize);
    splitter.addEventListener('pointerup', stopResize);
    splitter.addEventListener('pointercancel', stopResize);
    splitter.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
  }

}

export { TabEditor };
