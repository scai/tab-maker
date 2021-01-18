function tabMakerMain() {
  const renderer = new TabRenderer();
  renderer.openLocalStorageTab() || renderer.openTab('test');
}

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
    this.keySelect.addEventListener('change', () => this.renderTab());

    this.tabSelect = document.getElementById('tab-select');
    this.tabSelect.addEventListener('change', () => this.openTab(this.tabSelect.value));

    document.getElementById('dump-tab-data').addEventListener('click', () => {
      console.log(JSON.stringify(this.tabData));
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
    const sectionDiv = document.createElement("div");
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
    document.getElementById('original-key').textContent = this.tabData.originalKey;
    // Tab body
    const sections = this.tabScript.value.trim().split('\n');
    sections.forEach(s => {
      const section = this.renderSection(s);
      if (section) tabRoot.appendChild(section);
    });
  }
}

/**
 * Transposes chord degrees into a given key.
 * Examples: IV-6, iii-9, ii-7b5, I-Maj9/V
 */
class ChordUtil {
  static TRANSPOSE_MAP = {
    'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
    'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
    'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  }
  static MAJOR_CHORDS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  static MINOR_CHORDS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

  static degreeToName(key, degree) {
    const majorIndex = ChordUtil.MAJOR_CHORDS.indexOf(degree);
    if (majorIndex >= 0) {
      return ChordUtil.TRANSPOSE_MAP[key][majorIndex];
    } else {
      const minorIndex = ChordUtil.MINOR_CHORDS.indexOf(degree);
      if (minorIndex >= 0) {
        return ChordUtil.TRANSPOSE_MAP[key][minorIndex] + 'm';
      } else {
        console.log(`Unknown chord ${script}`);
        return 'ERR';
      }
    }
  }

  // Transposes chord notation "script" to given "key".
  static transpose(key, script) {
    if (script.length == 0) return '';
    const match = script.match(/(?<degree>\w+)(\-(?<quality>\w+))?(\/(?<root>\w+))?/);
    let result = ChordUtil.degreeToName(key, match.groups['degree']);
    if (match.groups['quality']) {
      result += match.groups['quality'];
    }
    if (match.groups['root']) {
      result += '/' + ChordUtil.degreeToName(key, match.groups['root']);
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
          height: 5px;
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
    const chordDiv = this.root.querySelector(".chord");
    chordDiv.textContent = chord ? chord : 'X';
    if (!chord) {
      chordDiv.classList.add('hidden');
    }

    const pitch = this.getAttribute("pitch");
    if (!pitch) {
      this.root.querySelector(".pitch").classList.add('hidden');
    } else {
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
    }

    const lyrics = this.getAttribute("lyrics");
    this.root.querySelector(".lyrics ").textContent = lyrics ? lyrics : '';

  }

  static OCTAVE_CLASS_NAME_MAP = {
    '-2': 'octave-down-2',
    '-1': 'octave-down-1',
    '+1': 'octave-up-1',
    '+2': 'octave-up-2',
  }
}

customElements.define('tab-maker-block', TabMakerBlock);