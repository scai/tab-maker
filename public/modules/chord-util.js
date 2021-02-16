const TRANSPOSE_MAP = new Map([
  ['Ab', ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G']],
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

const MAJOR_CHORDS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MINOR_CHORDS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
const CHORD_PATTERN = /(?<degree>[i|I|v|V]+)(?<flatsharp>b|#)?(\-(?<quality>\w+))?(\/(?<root>\w+))?/;

/**
 * Transposes chord degrees into a given key.
 * Examples: IV-6, iii-9, ii-7b5, I-Maj9/V
 */
class ChordUtil {
  static degreeToName(key, degree) {
    const majorIndex = MAJOR_CHORDS.indexOf(degree);
    if (majorIndex >= 0) {
      return TRANSPOSE_MAP.get(key)[majorIndex];
    } else {
      const minorIndex = MINOR_CHORDS.indexOf(degree);
      if (minorIndex >= 0) {
        return TRANSPOSE_MAP.get(key)[minorIndex] + 'm';
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
    const match = script.match(CHORD_PATTERN);
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

export { ChordUtil, TRANSPOSE_MAP };