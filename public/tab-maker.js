function tabMakerMain() {
  const renderer = new TabRenderer();
  // Check for deep-link first.
  const url = new URL(location);
  const deepLinkTab = url.searchParams.get('tab');
  if (deepLinkTab) {
    renderer.openTab(deepLinkTab);
  } else {
    renderer.openLocalStorageTab() || renderer.openTab('test');
  }
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
    if (!this.isKeySelected) {
      this.keySelect.value = this.tabData.originalKey;
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

/**
 * Transposes chord degrees into a given key.
 * Examples: IV-6, iii-9, ii-7b5, I-Maj9/V
 */
class ChordUtil {
  static TRANSPOSE_MAP = new Map([
    ['A', ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#']],
    ['Bb', ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']],
    ['B', ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#']],
    ['C', ['C', 'D', 'E', 'F', 'G', 'A', 'B']],
    ['Db', ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']],
    ['D', ['D', 'E', 'F#', 'G', 'A', 'B', 'C#']],
    ['Eb', ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D']],
    ['E', ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#']],
    ['F', ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']],
    ['F#', ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#']],
    ['G', ['G', 'A', 'B', 'C', 'D', 'E', 'F#']],
  ]);
  static MAJOR_CHORDS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  static MINOR_CHORDS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];

  static degreeToName(key, degree) {
    const majorIndex = ChordUtil.MAJOR_CHORDS.indexOf(degree);
    if (majorIndex >= 0) {
      return ChordUtil.TRANSPOSE_MAP.get(key)[majorIndex];
    } else {
      const minorIndex = ChordUtil.MINOR_CHORDS.indexOf(degree);
      if (minorIndex >= 0) {
        return ChordUtil.TRANSPOSE_MAP.get(key)[minorIndex] + 'm';
      } else {
        console.log(`Unknown chord ${script}`);
        return 'ERR';
      }
    }
  }

  static replaceFlatSharp(value) {
    return value.replace('#', '♯').replace('b', '♭');
  }

  // Transposes chord notation "script" to given "key".
  static transpose(key, script) {
    if (script.length == 0) return '';
    const match = script.match(/(?<degree>[i|I|v|V]+)(?<flatsharp>b|#)?(\-(?<quality>\w+))?(\/(?<root>\w+))?/);
    let result = ChordUtil.degreeToName(key, match.groups['degree']);
    if (match.groups['flatsharp']) {
      result += match.groups['flatsharp'];
    }
    if (match.groups['quality']) {
      result += match.groups['quality'];
    }
    if (match.groups['root']) {
      result += '/' + key, match.groups['root'];
    }
    return ChordUtil.replaceFlatSharp(result);
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

        .block.pitch {
          display: none;
        }
        :host-context(body.show-pitch) .block.pitch {
          display: block;
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
          font-weight: 300;
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

    const lyricsRoot = this.root.querySelector(".lyrics");
    const lyrics = this.getAttribute("lyrics");
    lyrics.split('/').forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.textContent = line;
      lyricsRoot.appendChild(lineDiv);
    });
  }

  static OCTAVE_CLASS_NAME_MAP = {
    '-2': 'octave-down-2',
    '-1': 'octave-down-1',
    '+1': 'octave-up-1',
    '+2': 'octave-up-2',
  }
}

customElements.define('tab-maker-block', TabMakerBlock);

/////////////////////////////////////////////////////////////////////

/**
 * Web component for tab diagram.
 * For example: <tab-maker-chord-diagram>"CMaj9"[x:3:2:4:3:x]</tab-maker-chord-diagram">
 */
class TabMakerChordDiagram extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = `
      <div id="diagram"></div>
      `;
  }

  connectedCallback() {
    const data = this.getAttribute('data').trim();
    const match = data.match(/(?<caption>.+)\[(?<sixth>[x|\d])\:(?<fifth>[x|\d])\:(?<fourth>[x|\d])\:(?<third>[x|\d])\:(?<second>[x|\d])\:(?<first>[x|\d])\]/);
    if (!match) {
      this.root.getElementById('diagram').textContent = "ERROR";
      return;
    }

    const caption = match.groups['caption'];
    const diagramRoot = this.root.getElementById('diagram');
    const DIAGRAM_PADDING_LEFT = 40;
    const DIAGRAM_PADDING_TOP = 40;
    const STRING_SPACING = 15;
    const FRET_SPACING = 20;
    const STRING_COUNT = 6;
    const FRET_COUNT = 5;
    const FRET_END_X = DIAGRAM_PADDING_LEFT + STRING_SPACING * (STRING_COUNT - 1);

    // Determine if need to shift to higher frets.
    let matchedFingering = [
      match.groups['sixth'],
      match.groups['fifth'],
      match.groups['fourth'],
      match.groups['third'],
      match.groups['second'],
      match.groups['first'],
    ];
    // Excluding fret zero, because I use open string for higher fret chords.
    let frettedStrings = matchedFingering.filter((e) => e > 0);
    let maxFret = Math.max(...frettedStrings);
    let minFret = Math.min(...frettedStrings);
    const needFretShift = (maxFret > FRET_COUNT);

    // Box
    const diagramWidth = DIAGRAM_PADDING_LEFT * 2 + STRING_SPACING * (STRING_COUNT - 1);
    const diagramHeight = DIAGRAM_PADDING_TOP + FRET_SPACING * (FRET_COUNT - 1) + 5;
    var draw = SVG().addTo(diagramRoot).size(diagramWidth, diagramHeight);
    // Frets
    for (let fret = 0; fret < FRET_COUNT; fret++) {
      const fretY = DIAGRAM_PADDING_TOP + fret * FRET_SPACING;
      draw.line(DIAGRAM_PADDING_LEFT, fretY, FRET_END_X, fretY).stroke({
        width: 2,
        color: 'silver'
      });
    }
    // Strings
    for (let string = 0; string < STRING_COUNT; string++) {
      const stringX = DIAGRAM_PADDING_LEFT + string * STRING_SPACING;
      const stringEndY = DIAGRAM_PADDING_TOP + FRET_SPACING * (FRET_COUNT - 1);
      draw.line(stringX, DIAGRAM_PADDING_TOP, stringX, stringEndY).stroke({
        width: 2,
        color: 'black'
      });
    }
    // Fret zero
    if (!needFretShift) {
      draw.line(DIAGRAM_PADDING_LEFT - 1, DIAGRAM_PADDING_TOP, FRET_END_X + 1, DIAGRAM_PADDING_TOP).stroke({
        width: 4,
        color: 'black'
      });
    }
    // Caption
    draw.text(caption).ax(diagramWidth / 2).ay(0).font({
      size: 14,
      weight: 'bold',
      anchor: 'middle'
    });

    // Fingering
    let fingerPlacement = (fret, col) => {
      if (!fret) {
        return;
      }
      if (fret == 'x') {
        draw.text('x').ax(DIAGRAM_PADDING_LEFT + col * STRING_SPACING)
          .ay(DIAGRAM_PADDING_TOP - 27)
          .font({
            size: 16,
            anchor: 'middle'
          });
      } else {
        const diameter = STRING_SPACING * 0.9;
        const x = DIAGRAM_PADDING_LEFT + col * STRING_SPACING;
        const y = DIAGRAM_PADDING_TOP + FRET_SPACING * (parseInt(fret) - 0.5);
        let circle = draw.circle(diameter).cx(x).cy(y);
        if (fret == '0') {
          circle.fill('none');
          circle.stroke({ width: 1, color: 'black' });
        } else {
          circle.fill('black');
        }
      }
    };
    if (needFretShift) {
      matchedFingering = matchedFingering.map((e) => e > 0 ? e - minFret + 1 : e);
      draw.text(`- ${minFret} fr`).ax(DIAGRAM_PADDING_LEFT + 5 * STRING_SPACING + 6)
        .ay(DIAGRAM_PADDING_TOP - 5)
        .font({
          size: 14,
          anchor: 'left',
        });
    }
    matchedFingering.forEach((value, index) => fingerPlacement(value, index));
  }
}

customElements.define('tab-maker-chord-diagram', TabMakerChordDiagram);
