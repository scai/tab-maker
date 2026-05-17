import { ChordUtil, TRANSPOSE_MAP } from './chord-util.js';
import { TabMakerBlock } from './block.js';
import { TabMakerChordDiagram } from './chord-diagram.js';

const LOCAL_STORAGE_KEY = 'tab data';
const BLOCK_PATTERN = /(?:\[(?<chord>.+)\])?\s*(?:\((?<pitch>.+)\))?\s*(?:(?<lyrics>.+))/;

/**
 * Renders tab script into HTML DOM.
 */
class TabRenderer {
  constructor() {
    this.tabScript = document.getElementById('tab-script');
    this.tabScript.addEventListener('change', () => {
      this.renderTab();
      this.tabData.tabScript = this.tabScript.value;
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.tabData));
    });

    // Triggers render when a block or measure ends.
    this.tabScript.addEventListener('keydown', (event) => {
      if (event.key == ',' || event.key == '|') {
        this.renderTab();
      }
    });
    this.keySelect = document.getElementById('key-select');
    TRANSPOSE_MAP.forEach((value, key) => {
      const option = document.createElement('option');
      option.setAttribute('value', key);
      option.textContent = ChordUtil.replaceFlatSharp(key);
      this.keySelect.appendChild(option);
    });
    this.isKeySelected = false;
    this.keySelect.addEventListener('change', () => {
      this.isKeySelected = true;
      this.renderTab();
    });

    document.addEventListener('tab-maker:select-tab', (event) => {
      this.openTab(event.detail.tabId);
    });
    this.tabSelect = document.getElementById('tab-select');
    if (this.tabSelect) {
      this.tabSelect.addEventListener('change', () => this.openTab(this.tabSelect.value));
    }

    document.getElementById('dump-tab-data').addEventListener('click', () => {
      const dump = JSON.stringify(this.tabData);
      this.copyTextToClipboard(dump)
        .then(() => {
          console.log(dump);
          this.showToast('JSON已复制到剪贴板');
        })
        .catch(() => this.showToast('复制失败，请重试'));
    });

    document.getElementById('toggle-script').addEventListener('click', () => {
      this.toggleEditor();
    });
    this.setupEditorSplitter();

    document.getElementById('toggle-pitch').addEventListener('change', (e) => {
      const body = document.querySelector('body');
      const showPitch = e.target.checked;
      if (showPitch) {
        body.classList.add('show-pitch');
      } else {
        body.classList.remove('show-pitch');
      }
    });
  }

  renderBlock(b) {
    if (!b || b.length == 0) {
      return null;
    }

    // Matches [chord] (pitch) lyrics
    const match = b.match(BLOCK_PATTERN);
    if (!match) return null;
    const chord = match.groups['chord'];
    const pitch = match.groups['pitch'];
    const lyrics = match.groups['lyrics'];
    const newBlock = new TabMakerBlock();
    if (chord) {
      const key = this.keySelect.value;
      newBlock.setAttribute('chord', ChordUtil.transpose(key, chord));
    }
    if (pitch) {
      newBlock.setAttribute('pitch', pitch);
    }
    if (lyrics) {
      newBlock.setAttribute('lyrics', lyrics);
    }
    return newBlock;
  }

  renderMeasure(m) {
    const blocks = m.split(',');
    const measureDiv = document.createElement("tab-maker-measure");
    blocks.map(b => b.trim())
      .forEach(b => {
        const block = this.renderBlock(b);
        if (block) measureDiv.appendChild(block);
      });
    if (measureDiv.childElementCount == 0) return null;
    return measureDiv;
  }

  renderSection(s) {
    const measures = s.split('|');
    const sectionDiv = document.createElement("section");
    measures.forEach(m => {
      const measure = this.renderMeasure(m);
      if (measure) sectionDiv.appendChild(measure);
    });
    return sectionDiv;
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = setTimeout(() => {
      toast.classList.remove('visible');
    }, 1800);
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

  openTab(id) {
    if (this.currentTabId === id) {
      return;
    }
    this.currentTabId = id;
    $.get(`./tabs/${id}.json`)
      .done((data) => {
        this.tabData = data;
        this.tabScript.value = data.tabScript;
        this.renderTab();
      })
      .fail(() => {
        this.tabScript.value = "failed to load " + id;
        this.renderTab();
      });
  }

  openLocalStorageTab() {
    const loadTab = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!loadTab || loadTab.length == 0) return false;
    try {
      this.tabData = JSON.parse(loadTab);
      this.tabData.title += ' (from Local Storage)'
      // TODO: verify tab data integrity.
      this.tabScript.value = this.tabData.tabScript;
      this.renderTab();
      return true;
    } catch (error) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return false;
    }
  }

  renderTab() {
    const tabRoot = document.getElementById('tab-body');
    tabRoot.innerHTML = '';
    // Tab metadata
    document.getElementById('tab-title').textContent = this.tabData.title;
    document.getElementById('original-key').textContent = ChordUtil.replaceFlatSharp(this.tabData.originalKey);

    // Key selected from dropdown >> deep-link key >> original key
    if (!this.isKeySelected) {
      const url = new URL(location);
      const deepLinkKey = url.searchParams.get('key');
      if (deepLinkKey && TRANSPOSE_MAP.get(deepLinkKey)) {
        this.keySelect.value = deepLinkKey;
      } else {
        this.keySelect.value = this.tabData.originalKey;
      }
    }

    // Chord diagrams
    const chordDiagramsRoot = document.getElementById('chord-diagrams');
    while (chordDiagramsRoot.firstChild) {
      chordDiagramsRoot.removeChild(chordDiagramsRoot.firstChild);
    }
    if (this.tabData.chordDiagrams) {
      const key = this.keySelect.value;
      const chordSet = this.tabData.chordDiagrams.find(c => c.key == key);
      if (chordSet) {
        chordSet.chords.forEach(chord => {
          const el = new TabMakerChordDiagram();
          el.setAttribute('chord-id', chord.id);
          el.setAttribute('data', chord.data);
          chordDiagramsRoot.appendChild(el);
        });
      }
    }

    // Tab body
    const sections = this.tabScript.value.trim().split('\n');
    sections.forEach(s => {
      const section = this.renderSection(s);
      if (section) tabRoot.appendChild(section);
    });
  }
}

export { TabRenderer };
