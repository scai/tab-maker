function tabMakerMain() {
  console.log('Tab Maker');
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
      <div class="tm-block">
        <div class="tm-chord">
          <input type="text">
        </div>
        <div class="tm-pitch"></div>
        <div class="tm-lyrics"></div>
      </div>
      `;
  }

  connectedCallback() {
      this.chordDiv = this.root.querySelector(".tm-chord");
      this.pitchDiv = this.root.querySelector(".tm-pitch");
      this.lyricsDiv = this.root.querySelector(".tm-lyrics");
      this.blockDiv = this.root.querySelector(".tm-block");
      this.chord = this.getAttribute("chord");
      this.pitch = this.getAttribute("pitch");
      this.lyrics = this.getAttribute("lyrics");
      this.chordDiv.textContent = this.chord;
      this.pitchDiv.textContent = this.pitch;
      this.lyricsDiv.textContent = this.lyrics;

      this.chordDiv.addEventListener('click', (event) => {
        event.target.style.background = 'pink';
      });
      
      this.chordDiv.addEventListener('blur', (event) => {
        event.target.style.background = '';
      });
  }
}

customElements.define('tab-maker-block', TabMakerBlock);