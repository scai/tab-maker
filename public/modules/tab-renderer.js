import { ChordUtil } from './chord-util.js';
import { TabMakerBlock } from './block.js';
import { TabMakerChordDiagram } from './chord-diagram.js';

/**
 * Renders tab script into HTML DOM.
 */
class TabRenderer {
  static LOCAL_STORAGE_KEY = 'tab data';
  constructor() {
    this.tabScript = document.getElementById('tab-script');
    this.tabScript.addEventListener('change', () => {
      this.renderTab();
      this.tabData.tabScript = this.tabScript.value;
      localStorage.setItem(TabRenderer.LOCAL_STORAGE_KEY, JSON.stringify(this.tabData));
    });

    // Triggers render when a block or measure ends.
    this.tabScript.addEventListener('keydown', (event) => {
      if (event.key == ',' || event.key == '|') {
        this.renderTab();
      }
    });
    this.keySelect = document.getElementById('key-select');
    ChordUtil.TRANSPOSE_MAP.forEach((value, key) => {
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

    this.tabSelect = document.getElementById('tab-select');
    this.tabSelect.addEventListener('change', () => this.openTab(this.tabSelect.value));

    document.getElementById('dump-tab-data').addEventListener('click', () => {
      console.log(JSON.stringify(this.tabData));
    });

    document.getElementById('toggle-script').addEventListener('click', () => {
      if (this.tabScript.classList.contains('hidden')) {
        this.tabScript.classList.remove('hidden');
      } else {
        this.tabScript.classList.add('hidden');
      }
    });

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

  static BLOCK_PATTERN = /(?:\[(?<chord>.+)\])?\s*(?:\((?<pitch>.+)\))?\s*(?:(?<lyrics>.+))/;

  renderBlock(b) {
    if (!b || b.length == 0) {
      return null;
    }

    // Matches [chord] (pitch) lyrics
    const match = b.match(TabRenderer.BLOCK_PATTERN);
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

  openTab(id) {
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
    const loadTab = localStorage.getItem(TabRenderer.LOCAL_STORAGE_KEY);
    if (!loadTab || loadTab.length == 0) return false;
    try {
      this.tabData = JSON.parse(loadTab);
      this.tabData.title += ' (from Local Storage)'
      // TODO: verify tab data integrity.
      this.tabScript.value = this.tabData.tabScript;
      this.renderTab();
      return true;
    } catch (error) {
      localStorage.removeItem(TabRenderer.LOCAL_STORAGE_KEY);
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
      if (deepLinkKey && ChordUtil.TRANSPOSE_MAP.get(deepLinkKey)) {
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