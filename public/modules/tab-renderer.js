import { ChordUtil } from './chord-util.js';
import { TabMakerBlock } from './block.js';
import { TabMakerChordDiagram } from './chord-diagram.js';

const BLOCK_PATTERN = /(?:\[(?<chord>.+)\])?\s*(?:\((?<pitch>.+)\))?\s*(?:(?<lyrics>.+))/;

/** Renders supplied tab data without depending on the editor or app controls. */
class TabRenderer {
  constructor() {
    this.tabRoot = document.getElementById('tab-body');
    const schedule = () => {
      cancelAnimationFrame(this.layoutFrame);
      this.layoutFrame = requestAnimationFrame(() => this.layoutMeasures());
    };
    this.resizeObserver = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width === this.lastWidth) return;
      this.lastWidth = width;
      schedule();
    });
    this.resizeObserver.observe(this.tabRoot);
    this.appearanceObserver = new MutationObserver(schedule);
    this.appearanceObserver.observe(this.tabRoot, { attributes: true, attributeFilter: ['style'] });
    this.appearanceObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener('loadingdone', schedule);
  }

  layoutMeasures() {
    const available = this.tabRoot.clientWidth;
    if (!available) return;
    this.tabRoot.querySelectorAll('.tab-verse').forEach(verse => {
      const lines = [...verse.children];
      // Measure intrinsic contents, independent of the previous grid or wrapping.
      verse.classList.add('measuring');
      const widths = lines.map(line => [...line.children].map(measure => measure.getBoundingClientRect().width));
      verse.classList.remove('measuring');
      const maximum = Math.min(4, Math.max(...widths.map(line => line.length)));
      const candidates = [...new Set([maximum, Math.min(2, maximum), 1])];
      let columns;
      for (const count of candidates) {
        columns = Array(count).fill(0);
        widths.forEach(line => line.forEach((width, index) => {
          columns[index % count] = Math.max(columns[index % count], Math.ceil(width));
        }));
        if (columns.reduce((sum, width) => sum + width, 0) <= available || count === 1) break;
      }
      const total = columns.reduce((sum, width) => sum + width, 0);
      const extra = Math.max(0, (available - total) / columns.length);
      const template = columns.map(width => `${Math.min(available, width + extra)}px`).join(' ');
      verse.style.setProperty('--measure-columns', template);
      verse.dataset.columns = columns.length;
      lines.forEach(line => [...line.children].forEach((measure, index) => {
        measure.classList.toggle('measure-row-start', index % columns.length === 0);
      }));
    });
  }

  renderBlock(b, key) {
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

  renderMeasure(m, key) {
    const blocks = m.split(',');
    const measureDiv = document.createElement("tab-maker-measure");
    blocks.map(b => b.trim())
      .forEach(b => {
        const block = this.renderBlock(b, key);
        if (block) measureDiv.appendChild(block);
      });
    if (measureDiv.childElementCount == 0) return null;
    return measureDiv;
  }

  renderSection(s, key) {
    const measures = s.split('|');
    const sectionDiv = document.createElement("section");
    measures.forEach(m => {
      const measure = this.renderMeasure(m, key);
      if (measure) sectionDiv.appendChild(measure);
    });
    return sectionDiv;
  }

  renderTab(tabData, key) {
    const tabRoot = document.getElementById('tab-body');
    tabRoot.innerHTML = '';
    // Tab metadata
    document.getElementById('tab-title').textContent = tabData.title;
    document.getElementById('original-key').textContent = ChordUtil.replaceFlatSharp(tabData.originalKey);

    // Chord diagrams
    const chordDiagramsRoot = document.getElementById('chord-diagrams');
    while (chordDiagramsRoot.firstChild) {
      chordDiagramsRoot.removeChild(chordDiagramsRoot.firstChild);
    }
    if (tabData.chordDiagrams) {
      const chordSet = tabData.chordDiagrams.find(c => c.key == key);
      if (chordSet) {
        chordSet.chords.forEach(chord => {
          const el = new TabMakerChordDiagram();
          el.setAttribute('chord-id', chord.id);
          el.setAttribute('data', chord.data);
          chordDiagramsRoot.appendChild(el);
        });
      }
    }

    // Blank lines separate independently aligned verses. Preserve each source
    // line, including short lines and pickups, rather than joining its measures.
    let verse;
    tabData.tabScript.trim().split(/\r?\n/).forEach(line => {
      if (!line.trim()) { verse = null; return; }
      const section = this.renderSection(line, key);
      if (!section.childElementCount) return;
      if (!line.includes('|') && !/\[[^\]]+\]/.test(line)) {
        section.className = 'tab-lyrics';
        tabRoot.appendChild(section);
        verse = null;
        return;
      }
      if (!verse) {
        verse = document.createElement('div');
        verse.className = 'tab-verse';
        tabRoot.appendChild(verse);
      }
      section.className = 'tab-line';
      verse.appendChild(section);
    });
    this.layoutMeasures();
  }
}

export { TabRenderer };
