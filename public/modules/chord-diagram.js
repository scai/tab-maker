
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
    const needFretShift = (maxFret >= FRET_COUNT);

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
      draw.text(`- ${minFret} fr`).ax(DIAGRAM_PADDING_LEFT + 5 * STRING_SPACING + 8)
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

export { TabMakerChordDiagram };
