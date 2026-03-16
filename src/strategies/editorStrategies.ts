import type { Note } from "types/project";
import type { EditorStrategy, NoteGeometry } from "./types";

export class ClassicStrategy implements EditorStrategy {
  name = "classic" as const;
  interactive = true;
  showVelocity = true;
  showTracklist = true;

  getNoteGeometry(note: Note, rowHeight: number): NoteGeometry {
    return {
      x: note.ticks,
      y: (127 - note.midi) * rowHeight,
      width: note.durationTicks,
      height: rowHeight,
    };
  }

  getKeyBounds(i: number, rowHeight: number, pianoWidth: number): NoteGeometry {
    return { x: 0, y: i * rowHeight, width: pianoWidth, height: rowHeight };
  }

  getWhiteKeyBounds(i: number, rowHeight: number, _keyW: number, pianoSize: number) {
    return { x: 0, y: (74 - i) * rowHeight, width: pianoSize, height: rowHeight };
  }

  getBlackKeyBounds(i: number, rowHeight: number, _keyW: number, pianoSize: number) {
    return {
      x: 0,
      y: (74 - i) * rowHeight - rowHeight / 2 + rowHeight * 0.1,
      width: pianoSize * (2 / 3),
      height: rowHeight * 0.8,
    };
  }

  getPitchAxis() {
    return "y" as const;
  }
  getTimeAxis() {
    return "x" as const;
  }
}

export class PianoRollStrategy implements EditorStrategy {
  name = "pianoroll" as const;
  interactive = false;
  showVelocity = false;
  showTracklist = false;

  private getXFromMidi(midi: number, keyWidth: number): number {
    const whiteMidiOffsets = [0, 2, 4, 5, 7, 9, 11];
    const octave = Math.floor(midi / 12);
    const noteInOctave = midi % 12;

    const whiteKeyIndexInOctave = whiteMidiOffsets.indexOf(noteInOctave);

    if (whiteKeyIndexInOctave !== -1) {
      const totalWhiteKeyIndex = octave * 7 + whiteKeyIndexInOctave;
      return totalWhiteKeyIndex * keyWidth;
    } else {
      const prevWhiteKeyIndex = whiteMidiOffsets.findIndex((m) => m > noteInOctave) - 1;
      const totalWhiteKeyIndex = octave * 7 + (prevWhiteKeyIndex === -2 ? 6 : prevWhiteKeyIndex);
      return totalWhiteKeyIndex * keyWidth + keyWidth / 2;
    }
  }

  getNoteGeometry(
    note: Note,
    _rowHeight: number,
    keyWidth: number,
    totalLength: number,
  ): NoteGeometry {
    const noteType = note.midi % 12;
    const xfromMidi = this.getXFromMidi(note.midi, keyWidth);
    let x = xfromMidi + keyWidth * 0.26;
    let width = keyWidth * 0.48;

    if (noteType === 0 || noteType === 5) {
      x = xfromMidi;
      width = keyWidth * 0.76;
    } else if (noteType === 4 || noteType === 11) {
      x = xfromMidi + keyWidth * 0.24;
      width = keyWidth * 0.76;
    } else if (noteType === 2 || noteType === 7 || noteType === 9) {
      x = xfromMidi + keyWidth * 0.24;
      width = keyWidth * 0.52;
    }

    return {
      x: x,
      y: totalLength - note.ticks,
      width: width,
      height: note.durationTicks,
    };
  }
  getKeyBounds(i: number, rowHeight: number, pianoWidth: number): NoteGeometry {
    return { x: 0, y: i * rowHeight, width: pianoWidth, height: rowHeight };
  }

  getPitchAxis() {
    return "y" as const;
  }
  getTimeAxis() {
    return "x" as const;
  }

  getWhiteKeyBounds(i: number, _rowH: number, keyWidth: number, pianoSize: number) {
    return { x: i * keyWidth, y: 0, width: keyWidth, height: pianoSize };
  }

  getBlackKeyBounds(i: number, _rowH: number, keyWidth: number, pianoSize: number) {
    return {
      x: i * keyWidth + keyWidth / 2 + keyWidth * 0.1,
      y: 0,
      width: keyWidth * 0.8,
      height: pianoSize * (2 / 3),
    };
  }
}
