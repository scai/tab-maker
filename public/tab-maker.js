function tabMakerMain() {
  const tabScript = document.getElementById('tab-script');
  tabScript.addEventListener('change', renderTab);

  // Triggers render when a block or measure ends.
  tabScript.addEventListener('keydown', (event) => {
    if (event.key == ',' || event.key == '|') {
      renderTab();
    }
  });
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

  // Matches [chord] (pitch) lyrics
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
    if (majorIndex >= 0) {
      result = ChordUtil.TRANSPOSE_MAP[key][majorIndex];
    } else {
      const minorIndex = ChordUtil.MINOR_CHORDS.indexOf(chord);
      if (minorIndex >= 0) {
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
        .block { 
          text-align: center;
          line-height: 1.2rem;
        }
        .block-root {
          margin: .1rem;
        }
        
        .octave{
          height: .3rem;
          text-align:center;
          background-repeat: no-repeat;
          background-position: center center;
          background-image: url(octave.svg)
        }

        .chord.hidden {
          visibility: hidden;
        }

        .octave { 
          visibility: hidden;
        }
        .octave-up-1 .up-1 {
          visibility: visible;
        }
        .octave-up-2 .up-1,
        .octave-up-2 .up-2 {
          visibility: visible;
        }
        .octave-down-1 .down-1 {
          visibility: visible;
        }
        .octave-down-2 .down-1,
        .octave-down-2 .down-2 {
          visibility: visible;
        }

        .lyrics {
          line-height: 1.5rem;
        }
      </style>
      <div class="block-root">
        <div class="block chord"></div>
        <div class="block pitch">
          <div class="octave up-2"></div>
          <div class="octave up-1"></div>
          <div class="note"></div>
          <div class="octave down-1"></div>
          <div class="octave down-2"></div>
        </div>
        <div class="block lyrics"></div>
      </div>
      `;
  }

  connectedCallback() {
    const chord = this.getAttribute("chord");
    const chordDiv = this.root.querySelector(".chord ");
    chordDiv.textContent = chord ? chord : 'X';
    if (!chord) { 
      chordDiv.classList.add('hidden');
    }

    const pitch = this.getAttribute("pitch");
    // Matches "<note>+/-<octave>": 3, 3+1, 3+2, 3-1, 3-2.
    const pitchMatch = pitch.match(/(?<note>\d(?:b|#)?)(?<oct>(?:\+|\-)\d)?/);
    const pitchDiv = this.root.querySelector(".pitch")
    if (pitchMatch.groups['oct']) {
      const octaveClassName = TabMakerBlock.OCTAVE_CLASS_NAME_MAP[pitchMatch.groups['oct']];
      if (octaveClassName) {
        pitchDiv.classList.add(octaveClassName);
      }
    }
    this.root.querySelector(".note").textContent = pitchMatch.groups['note']

    const lyrics = this.getAttribute("lyrics");
    this.root.querySelector(".lyrics ").textContent = lyrics ? lyrics : '';

  }

  static OCTAVE_CLASS_NAME_MAP = {
    '-2':'octave-down-2',
    '-1':'octave-down-1',
    '+1':'octave-up-1',
    '+2':'octave-up-2',
  }
}

customElements.define('tab-maker-block', TabMakerBlock);