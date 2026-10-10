const LOCAL_STORAGE_KEY = 'tab data';

/** Owns editable script, persistence, export, and editor pane interactions. */
class TabEditor {
  constructor({ onChange, showToast }) {
    this.onChange = onChange;
    this.showToast = showToast;
    this.tabScript = document.getElementById('tab-script');
    this.highlight = document.getElementById('script-highlight');
    this.tabScript.addEventListener('input', (event) => {
      this.highlightScript();
      if (!event.isComposing) this.commitScript();
    });
    this.tabScript.addEventListener('compositionend', () => this.commitScript());
    this.tabScript.addEventListener('change', () => this.commitScript());
    this.tabScript.addEventListener('scroll', () => this.syncHighlightScroll());
    for (const action of ['undo', 'redo']) {
      const button = document.getElementById(`${action}-script`);
      // Keep the text selection when clicking an editor history control.
      button.addEventListener('mousedown', event => event.preventDefault());
      button.addEventListener('click', () => {
        this.tabScript.focus();
        // Native history preserves typing groups, selections, paste and IME edits.
        document.execCommand(action);
      });
    }
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

  commitScript() {
    if (!this.tabData) return;
    if (this.tabData.tabScript === this.tabScript.value) return;
    this.tabData = { ...this.tabData, tabScript: this.tabScript.value };
    this.onChange(this.tabData);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tabData));
  }

  highlightScript() {
    const fragment = document.createDocumentFragment();
    const tokens = /\[[^\]\n]*\]|\([^\)\n]*\)|[\[\],|()\-]/g;
    const source = this.tabScript.value;
    let offset = 0;
    for (const match of source.matchAll(tokens)) {
      fragment.append(document.createTextNode(source.slice(offset, match.index)));
      const span = document.createElement('span');
      span.className = match[0].startsWith('[') && match[0].endsWith(']') ? 'syntax-chord'
        : match[0].startsWith('(') && match[0].endsWith(')') ? 'syntax-pitch' : 'syntax-separator';
      span.textContent = match[0];
      fragment.append(span);
      offset = match.index + match[0].length;
    }
    // A trailing space gives the final empty line the same height as the textarea.
    fragment.append(document.createTextNode(source.slice(offset) + ' '));
    this.highlight.replaceChildren(fragment);
    this.syncHighlightScroll();
  }

  syncHighlightScroll() {
    this.highlight.scrollTop = this.tabScript.scrollTop;
    this.highlight.scrollLeft = this.tabScript.scrollLeft;
  }

  setTabData(tabData) {
    this.tabData = tabData;
    this.tabScript.value = tabData.tabScript;
    this.highlightScript();
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
