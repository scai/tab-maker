function tabMakerMain() {
  const tabScript = document.getElementById('tab-script');
  tabScript.addEventListener('change', (event) => {
    renderTab(event.target.value);
  });
  renderTab(tabScript.value);
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
  const measureDiv = document.createElement("tab-maker-measure");
  blocks.map(b => b.trim())
    .forEach(b => renderBlock(measureDiv, b));
  if (measureDiv.childElementCount == 0) return;
  tabRoot.appendChild(measureDiv);
}

function renderTab(script) {
  const tabRoot = document.getElementById('tab-root');
  tabRoot.innerHTML = '';
  const measures = script.trim().split('|');
  measures.forEach(m => renderMeasure(tabRoot, m));
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