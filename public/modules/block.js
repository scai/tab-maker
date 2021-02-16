const OCTAVE_CLASS_NAME_MAP = {
  '-2': 'octave-down-2',
  '-1': 'octave-down-1',
  '+1': 'octave-up-1',
  '+2': 'octave-up-2',
}

/**
* Custom element for a "block".
* A "block" consists of a chord (optional), pitch notes (optional), and lyrics (required).
*/
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
        const octaveClassName = OCTAVE_CLASS_NAME_MAP[pitchMatch.groups['oct']];
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
}

customElements.define('tab-maker-block', TabMakerBlock);

export { TabMakerBlock };