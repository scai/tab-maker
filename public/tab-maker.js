function tabMakerMain() {
  const tabScript = document.getElementById('tab-script');
  tabScript.addEventListener('change', renderTab);
  document.getElementById('key-select').addEventListener('change', renderTab);
  renderTab();
}

function getMatchOrNull(match) {
  return (match && match.length > 1) ? match[1] : null;
}

function renderBlock(tabRoot, b) {
  if (!b || b.length == 0) {
    return;
  }
  const match = b.match(/(?:\[(?<chord>.+)\])?\s*(?:\((?<pitch>.+)\))\s*(?:(?<lyrics>.+))/);
  if (!match) return;
  const chord = match.groups['chord'];
  const pitch = match.groups['pitch'];
  const lyrics = match.groups['lyrics'];
  console.log(`Chord: ${chord}, Pitch: ${pitch}, Lyrics: ${lyrics}`);
  const newBlock = new TabMakerBlock();
  if (chord) {
    const key = document.getElementById('key-select').value;
    newBlock.setAttribute('chord', ChordUtil.transpose(key, chord));
  }
  if (pitch) {
    newBlock.setAttribute('pitch', pitch);
  }
  if (lyrics) {
    newBlock.setAttribute('lyrics', lyrics);
  }
  tabRoot.appendChild(newBlock);
}

function renderMeasure(tabRoot, m) {
  const blocks = m.split(',');
  const measureDiv = document.createElement("tab-maker-measure");
  blocks.map(b => b.trim())
    .forEach(b => renderBlock(measureDiv, b));
  if (measureDiv.childElementCount == 0) return;
  tabRoot.appendChild(measureDiv);
}

function renderTab() {
  const script = document.getElementById('tab-script').value;
  const tabRoot = document.getElementById('tab-root');
  tabRoot.innerHTML = '';
  const measures = script.trim().split('|');
  measures.forEach(m => renderMeasure(tabRoot, m));
}

/**
 * Transposes chord degrees into a given key.
 * Examples: IV-6, iii-9, ii-7b5
 */
class ChordUtil {
  static TRANSPOSE_MAP = {
    'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    'G': ['G', 'A', 'B', 'C', 'D', 'E', '#F'],
  }
  static MAJOR_CHORDS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  static MINOR_CHORDS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
  static transpose(key, script) {
    if (script.length == 0) return '';
    let result = '';
    const parts = script.split('-');
    const chord = parts.length > 0 ? parts[0] : script;
    const extension = parts.length > 1 ? parts[1] : '';
    const majorIndex = ChordUtil.MAJOR_CHORDS.indexOf(chord);
    if (majorIndex >=0) {
      result = ChordUtil.TRANSPOSE_MAP[key][majorIndex];
    } else {
      const minorIndex = ChordUtil.MINOR_CHORDS.indexOf(chord);
      if (minorIndex >=0) {
        result = ChordUtil.TRANSPOSE_MAP[key][minorIndex] + 'm';
      } else {
        console.log(`Unknown chord ${script}`);
      }
    }
    if (extension.length > 0) {
      return result + extension;
    }
    return result;
  }
}
class TabMakerBlock extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = `
      <style>
        .block { height: 1.1em; }
        .block-root { padding: 1px; }
      </style>
      <div class="block-root">
        <div class="block tm-chord"></div>
        <div class="block tm-pitch"></div>
        <div class="block tm-lyrics"></div>
      </div>
      `;
  }

  connectedCallback() {
    const chord = this.getAttribute("chord");

    this.root.querySelector(".tm-chord ").textContent = chord ? chord : '';

    const pitch = this.getAttribute("pitch");
    this.root.querySelector(".tm-pitch ").textContent = pitch ? pitch : '';
    const lyrics = this.getAttribute("lyrics");

    this.root.querySelector(".tm-lyrics ").textContent = lyrics ? lyrics : '';

  }
}

customElements.define('tab-maker-block', TabMakerBlock);