import { Rectangle } from "pixi.js";
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
