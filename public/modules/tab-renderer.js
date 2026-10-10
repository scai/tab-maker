import { ChordUtil } from './chord-util.js';
import { TabMakerBlock } from './block.js';
import { TabMakerChordDiagram } from './chord-diagram.js';

const BLOCK_PATTERN = /(?:\[(?<chord>.+)\])?\s*(?:\((?<pitch>.+)\))?\s*(?:(?<lyrics>.+))/;

/** Renders supplied tab data without depending on the editor or app controls. */
class TabRenderer {
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

    // Tab body
    const sections = tabData.tabScript.trim().split('\n');
    sections.forEach(s => {
      const section = this.renderSection(s, key);
      if (section) tabRoot.appendChild(section);
    });
  }
}

export { TabRenderer };
