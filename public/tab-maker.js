function tabMakerMain() {
  console.log('Tab Maker');
  const tabScript = document.getElementById('tab-script');
  tabScript.addEventListener('change', (event) => {
    renderTab(event.target.value);
  });
}

function getMatchOrNull(match) {
  return (match && match.length > 1) ? match[1] : null;
}

function renderBlock(tabRoot, b) {
  if (!b || b.length == 0) {
    return;
  }
  const chord = getMatchOrNull(b.match(/\[(.+)\]/));
  const pitch = getMatchOrNull(b.match(/\((.+)\)/));
  const lyrics = getMatchOrNull(b.match(/`(.+)`/));;
  console.log(`Chord: ${chord}, Pitch: ${pitch}, Lyrics: ${lyrics}`);
  const newBlock = new TabMakerBlock();
  if (chord) {
    newBlock.setAttribute('chord', chord);
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
  blocks.map(b => b.trim())
    .forEach(b => renderBlock(tabRoot, b));
  tabRoot.appendChild(document.createElement("tab-maker-pipe"));
}

function renderTab(script) {
  const tabRoot = document.getElementById('tab-root');
  tabRoot.innerHTML = '';
  const measures = script.split('|');
  measures.forEach(m => renderMeasure(tabRoot, m));
}

class TabMakerBlock extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.root.innerHTML = `
      <style>
        .tm-block {

        }

        .tm-block input {
          display: block;
          width: 100%;
          height: 100%;
        }
      </style>
      <div class="tm-chord"></div>
      <div class="tm-pitch"></div>
      <div class="tm-lyrics"></div>
      `;
  }

  connectedCallback() {
    this.chordDiv = this.root.querySelector(".tm-chord ");
    this.pitchDiv = this.root.querySelector(".tm-pitch ");
    this.lyricsDiv = this.root.querySelector(".tm-lyrics ");
    this.chord = this.getAttribute("chord");
    this.pitch = this.getAttribute("pitch");
    this.lyrics = this.getAttribute("lyrics");
    this.chordDiv.textContent = this.chord;
    this.pitchDiv.textContent = this.pitch;
    this.lyricsDiv.textContent = this.lyrics;
  }
}

customElements.define('tab-maker-block', TabMakerBlock);