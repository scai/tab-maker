# Tab Maker Notation Syntax

This project stores each song as JSON and renders the `tabScript` field into a chord sheet. The notation is designed for lyrics with optional chords and optional numbered melody pitches.

## Song JSON

Each tab file lives in `public/tabs/*.json`.

```json
{
  "title": "Artist - Song",
  "originalKey": "C",
  "tabScript": "[I](1)Today,(2)I sing|[V](3)again"
}
```

Optional chord diagrams can be added with `chordDiagrams`.

## Basic Layout

Use one text line for one section or phrase group.

```text
[I](1)Today,(2)I sing|[V](3)again
[vi](5)Another,(4)line|[IV](3)here
```

- New line: starts a new visual section.
- `|`: separates measures.
- `,`: separates lyric blocks inside a measure.
- Spaces around separators are allowed.

## Blocks

A block has this shape:

```text
[chord](pitch)lyrics
```

The chord and pitch are optional, but lyrics are required.

```text
[I](1)Today
[V]hello
(3)world
lyrics-only
```

Lyrics can contain `/` to split the lyric block into multiple displayed lines.

```text
[I](1)to/day
```

## Chords

Chords are written as scale degrees, then transposed into the selected key.

```text
[I]
[ii]
[V]
[vi]
```

Uppercase degrees render as major chords. Lowercase degrees render as minor chords.

For key `C`:

```text
[I]  -> C
[ii] -> Dm
[V]  -> G
[vi] -> Am
```

Supported degree names are:

```text
I II III IV V VI VII
i ii iii iv v vi vii
```

### Accidentals

Add `b` or `#` after the degree.

```text
[VIIb]
[IV#]
```

### Chord Quality

Add a quality after `-`.

```text
[I-Maj7]
[ii-7]
[iii-7b5]
[V-sus4]
```

The quality text is copied directly after the transposed chord name.

### Slash Chords

Use `/` followed by another scale degree for the bass note.

```text
[V/VII]
[vi/III]
[iii-7b5/V]
```

The part after `/` is also transposed using the selected key.

## Pitches

Pitch uses numbered solfege-style scale degrees.

```text
(1)
(2)
(3)
(4)
(5)
(6)
(7)
```

Add an octave marker with `+1`, `+2`, `-1`, or `-2`.

```text
(1+1)
(3+2)
(6-1)
(5-2)
```

Pitch display is hidden by default and can be shown with the "Show pitch" checkbox in the app.

## Chord Diagrams

Chord diagrams are optional and live in the song JSON, grouped by key.

```json
{
  "key": "C",
  "chords": [
    {
      "id": "CMaj9",
      "data": "CMaj9[x:3:2:4:3:x]"
    }
  ]
}
```

Diagram data format:

```text
Caption[sixth:fifth:fourth:third:second:first]
```

Each string value is either:

- `x`: muted string
- `0`: open string
- a number: fret number

Example:

```text
Dm7[x:x:0:2:1:1]
```

## Complete Example

```json
{
  "title": "Example Song",
  "originalKey": "C",
  "chordDiagrams": [
    {
      "key": "C",
      "chords": [
        { "id": "CMaj9", "data": "CMaj9[x:3:2:4:3:x]" },
        { "id": "Dm7", "data": "Dm7[x:x:0:2:1:1]" }
      ]
    }
  ],
  "tabScript": "[I-Maj9](1)To/day,(2)I sing|[V-7](3)again\n[vi](5)New,(4)line|[IV](3)here"
}
```
